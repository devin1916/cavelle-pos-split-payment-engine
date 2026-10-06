import type { DiscountType, PaymentMethod } from '../types/checkout';

export const CURRENCY_CODE = 'LKR';

/** en-LK keeps digit grouping consistent across environments. */
export const CURRENCY_LOCALE = 'en-LK';

export const VAT_RATE_PERCENT = 8;

/** 8% expressed in basis points — used for integer VAT arithmetic. */
export const VAT_BASIS_POINTS = VAT_RATE_PERCENT * 100;

/** 100% expressed in basis points (1 bp = 0.01%). */
export const HUNDRED_PERCENT_BASIS_POINTS = 10_000;

/**
 * User-facing validation messages. Kept in one place so the reducer, the
 * calculation pipeline and the UI never drift apart.
 */
export const VALIDATION_MESSAGES = {
  insufficientPayment: 'Payment is insufficient.',
  cardExceedsRemaining: 'Card payment cannot exceed the remaining balance.',
  bankTransferExceedsRemaining: 'Bank transfer cannot exceed the remaining balance.',
  paymentsExceedPayable: 'Payments exceed the payable amount. Adjust Card or Bank Transfer.',
  discountExceedsSubtotal: 'Discount cannot exceed the subtotal.',
  discountOver100: 'Percentage discount cannot exceed 100%.',
} as const;

export interface PaymentMethodOption {
  method: PaymentMethod;
  label: string;
  hint: string;
}

export const PAYMENT_METHOD_OPTIONS: readonly PaymentMethodOption[] = [
  { method: 'cash', label: 'Cash', hint: 'Tendered at the counter' },
  { method: 'card', label: 'Card', hint: 'Credit or debit card terminal' },
  { method: 'bank_transfer', label: 'Bank Transfer', hint: 'Direct bank transfer' },
];

export function getPaymentMethodLabel(method: PaymentMethod): string {
  return PAYMENT_METHOD_OPTIONS.find((option) => option.method === method)?.label ?? method;
}

export interface DiscountOption {
  type: DiscountType;
  label: string;
  /** Suffix rendered inside the value input, e.g. `%` or `LKR`. */
  unit: string;
}

export const DISCOUNT_OPTIONS: readonly DiscountOption[] = [
  { type: 'percentage', label: 'Percentage', unit: '%' },
  { type: 'flat', label: 'Flat amount', unit: 'LKR' },
];
