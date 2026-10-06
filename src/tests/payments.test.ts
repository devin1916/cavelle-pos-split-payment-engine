import { describe, expect, it } from 'vitest';
import { calculateCheckout } from '../utils/calculations';
import { getCashRequiredAmount, getMaxNonCashAmount, getPaymentAmount } from '../utils/payments';
import { checkoutReducer, createInitialCheckoutState } from '../reducers/checkoutReducer';
import type { CartItem, CheckoutState, Discount, Payment } from '../types/checkout';

/**
 * Fixture: LKR 10,000.00 subtotal → VAT 800.00 → payable LKR 10,800.00
 * (1,080,000 cents), matching the assessment's split-payment examples.
 */
const fixtureCart: CartItem[] = [
  { id: 'PAY-1', name: 'Payment fixture', unitPrice: 1000000, qty: 1 },
];

const NO_DISCOUNT: Discount = { type: 'percentage', value: 0 };
const PAYABLE = 1080000;

function calc(payments: Payment[]) {
  return calculateCheckout({ cart: fixtureCart, discount: NO_DISCOUNT, payments });
}

function applyActions(state: CheckoutState, actions: Parameters<typeof checkoutReducer>[1][]) {
  return actions.reduce(checkoutReducer, state);
}

describe('payment totals', () => {
  it('reports no payment as fully outstanding', () => {
    const result = calc([]);
    expect(result.paidCents).toBe(0);
    expect(result.remainingCents).toBe(PAYABLE);
    expect(result.changeCents).toBe(0);
    expect(result.canComplete).toBe(false);
  });

  it('settles an exact cash payment with no change', () => {
    const result = calc([{ method: 'cash', amount: PAYABLE }]);
    expect(result.paidCents).toBe(PAYABLE);
    expect(result.remainingCents).toBe(0);
    expect(result.changeCents).toBe(0);
    expect(result.canComplete).toBe(true);
  });

  it('reports the outstanding balance for an underpayment', () => {
    const result = calc([{ method: 'cash', amount: 500000 }]);
    expect(result.paidCents).toBe(500000);
    expect(result.remainingCents).toBe(580000);
    expect(result.errors).toContainEqual({
      field: 'checkout',
      message: 'Payment is insufficient.',
    });
    expect(result.canComplete).toBe(false);
  });

  it('calculates change for a cash overpayment', () => {
    const result = calc([{ method: 'cash', amount: 1100000 }]);
    expect(result.paidCents).toBe(1100000);
    expect(result.remainingCents).toBe(0);
    expect(result.changeCents).toBe(20000);
    expect(result.canComplete).toBe(true);
  });

  it('settles with a card payment alone', () => {
    const result = calc([{ method: 'card', amount: PAYABLE }]);
    expect(result.paidCents).toBe(PAYABLE);
    expect(result.changeCents).toBe(0);
    expect(result.canComplete).toBe(true);
  });

  it('settles with a bank transfer alone', () => {
    const result = calc([{ method: 'bank_transfer', amount: PAYABLE }]);
    expect(result.paidCents).toBe(PAYABLE);
    expect(result.remainingCents).toBe(0);
    expect(result.canComplete).toBe(true);
  });

  it('settles a cash + card split', () => {
    const result = calc([
      { method: 'card', amount: 600000 },
      { method: 'cash', amount: 480000 },
    ]);
    expect(result.paidCents).toBe(PAYABLE);
    expect(result.remainingCents).toBe(0);
    expect(result.canComplete).toBe(true);
  });

  it('settles a cash + bank transfer split', () => {
    const result = calc([
      { method: 'bank_transfer', amount: 300000 },
      { method: 'cash', amount: 780000 },
    ]);
    expect(result.paidCents).toBe(PAYABLE);
    expect(result.remainingCents).toBe(0);
  });

  it('settles a card + bank transfer split with no change', () => {
    const result = calc([
      { method: 'card', amount: 500000 },
      { method: 'bank_transfer', amount: 580000 },
    ]);
    expect(result.paidCents).toBe(PAYABLE);
    expect(result.changeCents).toBe(0);
    expect(result.canComplete).toBe(true);
  });

  it('settles a three-way split', () => {
    const result = calc([
      { method: 'card', amount: 400000 },
      { method: 'bank_transfer', amount: 300000 },
      { method: 'cash', amount: 380000 },
    ]);
    expect(result.paidCents).toBe(PAYABLE);
    expect(result.remainingCents).toBe(0);
    expect(result.changeCents).toBe(0);
    expect(result.canComplete).toBe(true);
  });

  it('calculates cash change correctly after a split payment', () => {
    const result = calc([
      { method: 'card', amount: 400000 },
      { method: 'cash', amount: 700000 },
    ]);
    expect(result.paidCents).toBe(1100000);
    expect(result.changeCents).toBe(20000);
    expect(result.remainingCents).toBe(0);
  });

  it('never produces change from card or bank transfer alone', () => {
    expect(calc([{ method: 'card', amount: PAYABLE }]).changeCents).toBe(0);
    expect(calc([{ method: 'bank_transfer', amount: PAYABLE }]).changeCents).toBe(0);
  });

  it('caps non-cash tenders that jointly exceed the payable amount', () => {
    const result = calc([
      { method: 'card', amount: 700000 },
      { method: 'bank_transfer', amount: 600000 },
    ]);
    expect(result.paidCents).toBe(PAYABLE);
    expect(result.errors).toContainEqual({
      field: 'checkout',
      message: 'Payments exceed the payable amount. Adjust Card or Bank Transfer.',
    });
    expect(result.canComplete).toBe(false);
  });
});

describe('non-cash payment limits', () => {
  it('limits card to the payable minus other non-cash tenders', () => {
    expect(getMaxNonCashAmount(PAYABLE, [{ method: 'bank_transfer', amount: 400000 }], 'card')).toBe(
      680000,
    );
  });

  it('does not let cash reduce the maximum card payment', () => {
    const payments: Payment[] = [
      { method: 'cash', amount: 500000 },
      { method: 'bank_transfer', amount: 400000 },
    ];
    expect(getMaxNonCashAmount(PAYABLE, payments, 'card')).toBe(680000);
  });

  it('limits bank transfer the same way card is limited', () => {
    expect(
      getMaxNonCashAmount(PAYABLE, [{ method: 'card', amount: 400000 }], 'bank_transfer'),
    ).toBe(680000);
  });

  it('reports the amount still required from cash', () => {
    expect(getCashRequiredAmount(PAYABLE, [])).toBe(PAYABLE);
    expect(getCashRequiredAmount(PAYABLE, [{ method: 'card', amount: 400000 }])).toBe(680000);
    expect(getCashRequiredAmount(PAYABLE, [{ method: 'card', amount: PAYABLE }])).toBe(0);
    // Cash already tendered does not change what cash still needs to cover.
    expect(
      getCashRequiredAmount(PAYABLE, [
        { method: 'cash', amount: 300000 },
        { method: 'card', amount: 400000 },
      ]),
    ).toBe(680000);
  });
});

describe('reducer payment enforcement', () => {
  const start = () =>
    applyActions(createInitialCheckoutState(fixtureCart), [
      { type: 'UPDATE_PAYMENT', method: 'bank_transfer', amount: 400000 },
    ]);

  it('prevents card payment from exceeding remaining payable amount', () => {
    const state = applyActions(start(), [
      { type: 'UPDATE_PAYMENT', method: 'card', amount: 700000 },
    ]);
    expect(getPaymentAmount(state.payments, 'card')).toBe(680000);
    expect(state.validationErrors).toContainEqual({
      field: 'card',
      message: 'Card payment cannot exceed the remaining balance.',
    });
    // The sale is fully paid, but the validation error still blocks completion.
    expect(state.paidAmount).toBe(PAYABLE);
    expect(state.canComplete).toBe(false);
  });

  it('clears the card error once a valid amount is entered', () => {
    const state = applyActions(start(), [
      { type: 'UPDATE_PAYMENT', method: 'card', amount: 700000 },
      { type: 'UPDATE_PAYMENT', method: 'card', amount: 680000 },
    ]);
    expect(getPaymentAmount(state.payments, 'card')).toBe(680000);
    expect(state.validationErrors).toEqual([]);
    expect(state.canComplete).toBe(true);
  });

  it('prevents bank transfer payment from exceeding remaining payable amount', () => {
    const withCard = applyActions(createInitialCheckoutState(fixtureCart), [
      { type: 'UPDATE_PAYMENT', method: 'card', amount: 400000 },
    ]);
    const state = applyActions(withCard, [
      { type: 'UPDATE_PAYMENT', method: 'bank_transfer', amount: 700000 },
    ]);
    expect(getPaymentAmount(state.payments, 'bank_transfer')).toBe(680000);
    expect(state.validationErrors).toContainEqual({
      field: 'bank_transfer',
      message: 'Bank transfer cannot exceed the remaining balance.',
    });
    expect(state.canComplete).toBe(false);
  });

  it('allows cash to exceed the payable amount and computes change', () => {
    const state = applyActions(createInitialCheckoutState(fixtureCart), [
      { type: 'UPDATE_PAYMENT', method: 'cash', amount: 2000000 },
    ]);
    expect(getPaymentAmount(state.payments, 'cash')).toBe(2000000);
    expect(state.paidAmount).toBe(2000000);
    expect(state.changeDue).toBe(920000);
    expect(state.canComplete).toBe(true);
  });

  it('ignores invalid payment amounts instead of corrupting state', () => {
    const initial = createInitialCheckoutState(fixtureCart);
    const negative = checkoutReducer(initial, {
      type: 'UPDATE_PAYMENT',
      method: 'cash',
      amount: -100,
    });
    expect(negative).toBe(initial);
    const notANumber = checkoutReducer(initial, {
      type: 'UPDATE_PAYMENT',
      method: 'card',
      amount: Number.NaN,
    });
    expect(notANumber).toBe(initial);
  });

  it('updates remaining balance immediately when a tender changes', () => {
    const state = applyActions(createInitialCheckoutState(fixtureCart), [
      { type: 'UPDATE_PAYMENT', method: 'card', amount: 300000 },
    ]);
    expect(state.remainingAmount).toBe(780000);
    const updated = applyActions(state, [
      { type: 'UPDATE_PAYMENT', method: 'card', amount: 600000 },
    ]);
    expect(updated.remainingAmount).toBe(480000);
  });

  it('removes a tender completely', () => {
    const state = applyActions(createInitialCheckoutState(fixtureCart), [
      { type: 'UPDATE_PAYMENT', method: 'card', amount: 300000 },
      { type: 'REMOVE_PAYMENT', method: 'card' },
    ]);
    expect(state.payments).toEqual([]);
    expect(state.paidAmount).toBe(0);
  });

  it('never keeps a stale insufficient-payment error once the balance is settled', () => {
    const underpaid = applyActions(createInitialCheckoutState(fixtureCart), [
      { type: 'UPDATE_PAYMENT', method: 'cash', amount: 500000 },
    ]);
    expect(underpaid.validationErrors).toContainEqual({
      field: 'checkout',
      message: 'Payment is insufficient.',
    });

    const settled = applyActions(underpaid, [
      { type: 'UPDATE_PAYMENT', method: 'cash', amount: 1080000 },
    ]);
    expect(settled.validationErrors).toEqual([]);
    expect(settled.remainingAmount).toBe(0);
    expect(settled.canComplete).toBe(true);
  });

  it('recalculates validation state when a payment is removed', () => {
    const paid = applyActions(createInitialCheckoutState(fixtureCart), [
      { type: 'UPDATE_PAYMENT', method: 'card', amount: 600000 },
      { type: 'UPDATE_PAYMENT', method: 'cash', amount: 480000 },
    ]);
    expect(paid.validationErrors).toEqual([]);
    expect(paid.canComplete).toBe(true);

    const removed = applyActions(paid, [{ type: 'REMOVE_PAYMENT', method: 'cash' }]);
    expect(removed.paidAmount).toBe(600000);
    expect(removed.remainingAmount).toBe(480000);
    expect(removed.validationErrors).toContainEqual({
      field: 'checkout',
      message: 'Payment is insufficient.',
    });
    expect(removed.canComplete).toBe(false);
  });
});
