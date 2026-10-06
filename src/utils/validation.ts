import { HUNDRED_PERCENT_BASIS_POINTS, VALIDATION_MESSAGES } from '../constants/checkout';
import type { CheckoutError, Discount, ValidationField } from '../types/checkout';

/**
 * Validation rules return structured errors; the calculation pipeline and the
 * reducer both consume them so the same rule is never expressed twice.
 */

export function validateDiscount(discount: Discount, subtotalCents: number): CheckoutError[] {
  if (discount.type === 'percentage') {
    return discount.value > HUNDRED_PERCENT_BASIS_POINTS
      ? [{ field: 'discount', message: VALIDATION_MESSAGES.discountOver100 }]
      : [];
  }
  return discount.value > subtotalCents
    ? [{ field: 'discount', message: VALIDATION_MESSAGES.discountExceedsSubtotal }]
    : [];
}

/** Non-cash tenders may never jointly exceed the payable amount. */
export function validateNonCashCoverage(
  payableCents: number,
  cardCents: number,
  bankTransferCents: number,
): CheckoutError[] {
  return cardCents + bankTransferCents > payableCents
    ? [{ field: 'checkout', message: VALIDATION_MESSAGES.paymentsExceedPayable }]
    : [];
}

export function validatePaymentCoverage(
  payableCents: number,
  paidCents: number,
): CheckoutError[] {
  return paidCents < payableCents
    ? [{ field: 'checkout', message: VALIDATION_MESSAGES.insufficientPayment }]
    : [];
}

export function findErrorByField(
  errors: readonly CheckoutError[],
  field: ValidationField,
): CheckoutError | null {
  return errors.find((error) => error.field === field) ?? null;
}

export function withoutFieldErrors(
  errors: readonly CheckoutError[],
  field: ValidationField,
): CheckoutError[] {
  return errors.filter((error) => error.field !== field);
}

/**
 * Card/bank limit errors are transient: they are recorded when an over-limit
 * tender is capped and live in state until that tender is edited or removed.
 */
export function isPaymentLimitError(error: CheckoutError): boolean {
  return error.field === 'card' || error.field === 'bank_transfer';
}
