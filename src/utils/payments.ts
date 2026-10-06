import type { Payment, PaymentMethod } from '../types/checkout';

export function getPaymentAmount(
  payments: readonly Payment[],
  method: PaymentMethod,
): number {
  return payments.find((payment) => payment.method === method)?.amount ?? 0;
}

/**
 * The most a non-cash method may take: the payable amount minus what other
 * non-cash tenders already reserve. Cash is deliberately excluded — only cash
 * may over-tender, so cash never reduces the card/bank limit.
 */
export function getMaxNonCashAmount(
  payableAmount: number,
  payments: readonly Payment[],
  method: PaymentMethod,
): number {
  const reservedByOtherNonCash = payments
    .filter((payment) => payment.method !== method && payment.method !== 'cash')
    .reduce((total, payment) => total + payment.amount, 0);
  return Math.max(payableAmount - reservedByOtherNonCash, 0);
}

/** Amount Cash still needs to cover after the non-cash tenders. */
export function getCashRequiredAmount(
  payableAmount: number,
  payments: readonly Payment[],
): number {
  const paidByNonCash = payments
    .filter((payment) => payment.method !== 'cash')
    .reduce((total, payment) => total + payment.amount, 0);
  return Math.max(payableAmount - paidByNonCash, 0);
}
