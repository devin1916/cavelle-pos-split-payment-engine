import { describe, expect, it } from 'vitest';
import { MOCK_CART_ITEMS } from '../data/mockCart';
import { checkoutReducer, createInitialCheckoutState } from '../reducers/checkoutReducer';
import type { CheckoutAction, CheckoutState } from '../types/checkout';

function applyActions(state: CheckoutState, actions: CheckoutAction[]): CheckoutState {
  return actions.reduce(checkoutReducer, state);
}

describe('initial checkout state', () => {
  it('derives all totals from the mock cart through the pipeline', () => {
    const state = createInitialCheckoutState(MOCK_CART_ITEMS);
    expect(state.subtotal).toBe(1660000);
    expect(state.discountAmount).toBe(0);
    expect(state.taxableAmount).toBe(1660000);
    expect(state.vatAmount).toBe(132800);
    expect(state.payableAmount).toBe(1792800);
    expect(state.paidAmount).toBe(0);
    expect(state.remainingAmount).toBe(1792800);
    expect(state.changeDue).toBe(0);
    expect(state.status).toBe('draft');
    expect(state.canComplete).toBe(false);
    expect(state.discount).toEqual({ type: 'percentage', value: 0 });
    expect(state.payments).toEqual([]);
    expect(state.validationErrors).toContainEqual({
      field: 'checkout',
      message: 'Payment is insufficient.',
    });
  });
});

describe('SET_DISCOUNT', () => {
  it('recalculates taxable amount, VAT and payable after a discount', () => {
    const state = applyActions(createInitialCheckoutState(MOCK_CART_ITEMS), [
      { type: 'SET_DISCOUNT', discount: { type: 'percentage', value: 1000 } },
    ]);
    expect(state.discountAmount).toBe(166000);
    expect(state.taxableAmount).toBe(1494000);
    expect(state.vatAmount).toBe(119520);
    expect(state.payableAmount).toBe(1613520);
    // VAT is calculated after the discount, never on the original subtotal.
    expect(state.vatAmount).not.toBe(132800);
  });

  it('supports a flat LKR discount', () => {
    const state = applyActions(createInitialCheckoutState(MOCK_CART_ITEMS), [
      { type: 'SET_DISCOUNT', discount: { type: 'flat', value: 500000 } },
    ]);
    expect(state.discountAmount).toBe(500000);
    expect(state.taxableAmount).toBe(1160000);
    expect(state.payableAmount).toBe(1252800);
  });

  it('rejects a discount greater than the subtotal with a clear message', () => {
    const state = applyActions(createInitialCheckoutState(MOCK_CART_ITEMS), [
      { type: 'SET_DISCOUNT', discount: { type: 'flat', value: 2000000 } },
    ]);
    expect(state.discountAmount).toBe(1660000);
    expect(state.taxableAmount).toBe(0);
    expect(state.payableAmount).toBe(0);
    expect(state.validationErrors).toContainEqual({
      field: 'discount',
      message: 'Discount cannot exceed the subtotal.',
    });
    expect(state.canComplete).toBe(false);
  });

  it('flags an invalid discount percentage', () => {
    const state = applyActions(createInitialCheckoutState(MOCK_CART_ITEMS), [
      { type: 'SET_DISCOUNT', discount: { type: 'percentage', value: 15000 } },
    ]);
    expect(state.validationErrors).toContainEqual({
      field: 'discount',
      message: 'Percentage discount cannot exceed 100%.',
    });
    expect(state.canComplete).toBe(false);
  });

  it('ignores negative or non-integer discount values', () => {
    const initial = createInitialCheckoutState(MOCK_CART_ITEMS);
    expect(
      checkoutReducer(initial, {
        type: 'SET_DISCOUNT',
        discount: { type: 'flat', value: -100 },
      }),
    ).toBe(initial);
    expect(
      checkoutReducer(initial, {
        type: 'SET_DISCOUNT',
        discount: { type: 'percentage', value: 10.5 },
      }),
    ).toBe(initial);
  });
});

describe('COMPLETE_CHECKOUT', () => {
  it('stays in draft while payment is insufficient', () => {
    const state = applyActions(createInitialCheckoutState(MOCK_CART_ITEMS), [
      { type: 'UPDATE_PAYMENT', method: 'cash', amount: 1000000 },
      { type: 'COMPLETE_CHECKOUT' },
    ]);
    expect(state.status).toBe('draft');
  });

  it('stays in draft while validation errors exist even if paid >= payable', () => {
    const state = applyActions(createInitialCheckoutState(MOCK_CART_ITEMS), [
      { type: 'SET_DISCOUNT', discount: { type: 'percentage', value: 15000 } },
      { type: 'COMPLETE_CHECKOUT' },
    ]);
    expect(state.payableAmount).toBe(0);
    expect(state.paidAmount).toBe(0);
    expect(state.status).toBe('draft');
  });

  it('completes the checkout once fully paid', () => {
    const state = applyActions(createInitialCheckoutState(MOCK_CART_ITEMS), [
      { type: 'SET_DISCOUNT', discount: { type: 'flat', value: 166000 } },
      { type: 'UPDATE_PAYMENT', method: 'card', amount: 800000 },
      { type: 'UPDATE_PAYMENT', method: 'cash', amount: 813520 },
      { type: 'COMPLETE_CHECKOUT' },
    ]);
    expect(state.canComplete).toBe(true);
    expect(state.status).toBe('completed');
  });
});

describe('RESET_CHECKOUT', () => {
  it('returns the checkout to its initial state', () => {
    const initial = createInitialCheckoutState(MOCK_CART_ITEMS);
    const touched = applyActions(initial, [
      { type: 'SET_DISCOUNT', discount: { type: 'flat', value: 500000 } },
      { type: 'UPDATE_PAYMENT', method: 'cash', amount: 500000 },
      { type: 'UPDATE_PAYMENT', method: 'card', amount: 10000000 },
    ]);
    const reset = checkoutReducer(touched, { type: 'RESET_CHECKOUT' });
    expect(reset).toEqual(initial);
  });
});
