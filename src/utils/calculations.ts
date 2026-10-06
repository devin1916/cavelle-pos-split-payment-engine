import { HUNDRED_PERCENT_BASIS_POINTS, VAT_BASIS_POINTS } from '../constants/checkout';
import type { CartItem, CheckoutInputs, Discount } from '../types/checkout';
import { roundHalfUp } from './money';
import { getPaymentAmount } from './payments';
import {
  validateDiscount,
  validateNonCashCoverage,
  validatePaymentCoverage,
} from './validation';
import type { CheckoutCalculation } from '../types/checkout';

/**
 * The single financial pipeline. Every figure the UI shows comes from here —
 * components and the reducer never re-implement these formulas.
 *
 * Calculation order (strict):
 *   subtotal → discount → taxable amount → 8% VAT → payable amount
 *
 * Rounding policy: percentages and VAT are computed with exact integer
 * arithmetic and rounded half-up once, at their own boundary.
 */

export function calculateLineTotal(item: CartItem): number {
  return item.unitPrice * item.qty;
}

export function calculateSubtotal(cart: readonly CartItem[]): number {
  return cart.reduce((total, item) => total + calculateLineTotal(item), 0);
}

/**
 * Discount for the current subtotal, capped at the subtotal so the taxable
 * amount can never become negative. Over-entered discounts are surfaced as
 * validation errors by `validateDiscount`.
 */
export function calculateDiscount(subtotalCents: number, discount: Discount): number {
  const enteredCents =
    discount.type === 'percentage'
      ? roundHalfUp(
          subtotalCents * Math.min(discount.value, HUNDRED_PERCENT_BASIS_POINTS),
          HUNDRED_PERCENT_BASIS_POINTS,
        )
      : discount.value;
  return Math.min(Math.max(enteredCents, 0), subtotalCents);
}

export function calculateTaxableAmount(subtotalCents: number, discountCents: number): number {
  return Math.max(subtotalCents - discountCents, 0);
}

/** VAT is always calculated on the taxable amount, i.e. after discount. */
export function calculateVAT(taxableCents: number): number {
  return roundHalfUp(taxableCents * VAT_BASIS_POINTS, HUNDRED_PERCENT_BASIS_POINTS);
}

export function calculatePayable(taxableCents: number, vatCents: number): number {
  return taxableCents + vatCents;
}

export function calculateCheckout(inputs: CheckoutInputs): CheckoutCalculation {
  const subtotalCents = calculateSubtotal(inputs.cart);
  const discountCents = calculateDiscount(subtotalCents, inputs.discount);
  const taxableCents = calculateTaxableAmount(subtotalCents, discountCents);
  const vatCents = calculateVAT(taxableCents);
  const payableCents = calculatePayable(taxableCents, vatCents);

  const cashCents = getPaymentAmount(inputs.payments, 'cash');
  const cardEnteredCents = getPaymentAmount(inputs.payments, 'card');
  const bankTransferEnteredCents = getPaymentAmount(inputs.payments, 'bank_transfer');

  // Only cash may over-tender. If non-cash tenders jointly exceed the payable
  // amount (possible when a discount is raised after payment entry) they are
  // capped in a fixed order — card first — and flagged as a validation error.
  const nonCashExceeds = cardEnteredCents + bankTransferEnteredCents > payableCents;
  const cardCents = nonCashExceeds
    ? Math.min(cardEnteredCents, payableCents)
    : cardEnteredCents;
  const bankTransferCents = nonCashExceeds
    ? Math.min(bankTransferEnteredCents, payableCents - cardCents)
    : bankTransferEnteredCents;

  const paidCents = cashCents + cardCents + bankTransferCents;
  const remainingCents = Math.max(payableCents - paidCents, 0);
  const changeCents = Math.max(paidCents - payableCents, 0);
  const cashRequiredCents = Math.max(payableCents - (cardCents + bankTransferCents), 0);

  const errors = [
    ...validateDiscount(inputs.discount, subtotalCents),
    ...validateNonCashCoverage(payableCents, cardEnteredCents, bankTransferEnteredCents),
    ...validatePaymentCoverage(payableCents, paidCents),
  ];

  return {
    subtotalCents,
    discountCents,
    taxableCents,
    vatCents,
    payableCents,
    cashCents,
    cardCents,
    bankTransferCents,
    paidCents,
    remainingCents,
    changeCents,
    cashRequiredCents,
    errors,
    canComplete: errors.length === 0 && paidCents >= payableCents,
  };
}
