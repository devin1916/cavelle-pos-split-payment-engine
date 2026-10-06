import { describe, expect, it } from 'vitest';
import { MOCK_CART_ITEMS } from '../data/mockCart';
import {
  calculateCheckout,
  calculateDiscount,
  calculateLineTotal,
  calculateSubtotal,
  calculateTaxableAmount,
  calculateVAT,
} from '../utils/calculations';
import type { CartItem, Discount, Payment } from '../types/checkout';

const item = (unitPrice: number, qty = 1): CartItem => ({
  id: 'TEST-1',
  name: 'Test item',
  unitPrice,
  qty,
});

const flat = (value: number): Discount => ({ type: 'flat', value });
const percent = (value: number): Discount => ({ type: 'percentage', value });

describe('cart calculations', () => {
  it('calculates a single line total in integer cents', () => {
    expect(calculateLineTotal(item(245000))).toBe(245000);
    expect(calculateLineTotal(item(125000, 3))).toBe(375000);
  });

  it('sums a single-item cart', () => {
    expect(calculateSubtotal([item(245000)])).toBe(245000);
  });

  it('sums multiple items with different quantities', () => {
    const cart = [item(245000, 2), item(795000), item(125000, 3)];
    expect(calculateSubtotal(cart)).toBe(1660000);
  });

  it('treats zero-quantity lines as zero', () => {
    expect(calculateSubtotal([item(245000, 0)])).toBe(0);
    expect(calculateLineTotal(item(245000, 0))).toBe(0);
  });

  it('calculates the mock cart subtotal exactly', () => {
    expect(calculateSubtotal(MOCK_CART_ITEMS)).toBe(1660000);
  });
});

describe('discount calculations', () => {
  it('applies zero percentage as zero discount', () => {
    expect(calculateDiscount(100000, percent(0))).toBe(0);
  });

  it('applies a normal percentage discount', () => {
    expect(calculateDiscount(100000, percent(1000))).toBe(10000);
  });

  it('applies a decimal percentage discount without float errors', () => {
    expect(calculateDiscount(100000, percent(1050))).toBe(10500);
    expect(calculateDiscount(100000, percent(50))).toBe(500);
  });

  it('applies a 100% discount as the full subtotal', () => {
    expect(calculateDiscount(100000, percent(10000))).toBe(100000);
  });

  it('applies a flat LKR discount', () => {
    expect(calculateDiscount(100000, flat(50000))).toBe(50000);
  });

  it('caps a flat discount greater than the subtotal', () => {
    expect(calculateDiscount(100000, flat(150000))).toBe(100000);
  });

  it('caps a percentage above 100%', () => {
    expect(calculateDiscount(100000, percent(15000))).toBe(100000);
  });

  it('rounds percentage discounts half-up at the boundary', () => {
    // 12.5% of 4 cents = 0.5 cents → rounds up to 1 cent.
    expect(calculateDiscount(4, percent(1250))).toBe(1);
  });
});

describe('taxable amount', () => {
  it('subtracts the discount from the subtotal', () => {
    expect(calculateTaxableAmount(100000, 30000)).toBe(70000);
  });

  it('never becomes negative', () => {
    expect(calculateTaxableAmount(100000, 100000)).toBe(0);
    expect(calculateTaxableAmount(100000, 500000)).toBe(0);
  });
});

describe('VAT calculations', () => {
  it('calculates 8% VAT on the taxable amount', () => {
    expect(calculateVAT(100000)).toBe(8000);
  });

  it('rounds VAT half-up on small taxable values', () => {
    expect(calculateVAT(63)).toBe(5); // 5.04 → 5
    expect(calculateVAT(1250)).toBe(100); // 100.00
    expect(calculateVAT(1063)).toBe(85); // 85.04 → 85
  });

  it('rounds VAT on a one-cent taxable amount down to zero', () => {
    expect(calculateVAT(1)).toBe(0);
  });
});

describe('checkout pipeline', () => {
  const cart = [item(100000)];

  it('runs subtotal → discount → taxable → VAT → payable in order', () => {
    const result = calculateCheckout({ cart, discount: flat(50000), payments: [] });
    expect(result.subtotalCents).toBe(100000);
    expect(result.discountCents).toBe(50000);
    expect(result.taxableCents).toBe(50000);
    expect(result.vatCents).toBe(4000);
    expect(result.payableCents).toBe(54000);
  });

  it('calculates VAT after discount, never on the original subtotal', () => {
    const result = calculateCheckout({ cart, discount: flat(50000), payments: [] });
    expect(result.vatCents).toBe(4000);
    // VAT on the undiscounted subtotal would have been 8000.
    expect(result.vatCents).not.toBe(calculateVAT(result.subtotalCents));
  });

  it('produces exact end-to-end totals for the mock cart with 10% off', () => {
    const result = calculateCheckout({
      cart: MOCK_CART_ITEMS,
      discount: percent(1000),
      payments: [],
    });
    expect(result.subtotalCents).toBe(1660000);
    expect(result.discountCents).toBe(166000);
    expect(result.taxableCents).toBe(1494000);
    expect(result.vatCents).toBe(119520);
    expect(result.payableCents).toBe(1613520);
  });

  it('caps a discount above the subtotal and flags it', () => {
    const result = calculateCheckout({ cart, discount: flat(150000), payments: [] });
    expect(result.discountCents).toBe(100000);
    expect(result.taxableCents).toBe(0);
    expect(result.vatCents).toBe(0);
    expect(result.payableCents).toBe(0);
    expect(result.errors).toContainEqual({
      field: 'discount',
      message: 'Discount cannot exceed the subtotal.',
    });
    expect(result.canComplete).toBe(false);
  });

  it('flags a percentage discount above 100%', () => {
    const result = calculateCheckout({ cart, discount: percent(15000), payments: [] });
    expect(result.discountCents).toBe(100000);
    expect(result.errors).toContainEqual({
      field: 'discount',
      message: 'Percentage discount cannot exceed 100%.',
    });
    expect(result.canComplete).toBe(false);
  });

  it('reports insufficient payment while underpaid', () => {
    const payments: Payment[] = [{ method: 'cash', amount: 1000 }];
    const result = calculateCheckout({ cart, discount: percent(0), payments });
    expect(result.errors).toContainEqual({
      field: 'checkout',
      message: 'Payment is insufficient.',
    });
    expect(result.canComplete).toBe(false);
  });

  it('allows completion when fully paid', () => {
    const payments: Payment[] = [{ method: 'cash', amount: 108000 }];
    const result = calculateCheckout({ cart, discount: percent(0), payments });
    expect(result.paidCents).toBe(108000);
    expect(result.remainingCents).toBe(0);
    expect(result.errors).toEqual([]);
    expect(result.canComplete).toBe(true);
  });
});
