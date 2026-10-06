/**
 * Domain types for the CAVELLE POS checkout flow.
 *
 * Every monetary value in the system is an integer count of cents (LKR minor
 * units): LKR 1,250.50 is represented as 125050. Percentages are represented
 * as integer basis points: 10.5% is 1050. Floating-point numbers never take
 * part in financial arithmetic — raw input text is parsed and quantised by
 * utils/money.ts before it reaches any calculation.
 */

export type DiscountType = 'percentage' | 'flat';

export type PaymentMethod = 'cash' | 'card' | 'bank_transfer';

export type CheckoutStatus = 'draft' | 'completed';

export interface CartItem {
  id: string;
  name: string;
  /** Unit price in integer cents. */
  unitPrice: number;
  qty: number;
}

export interface Discount {
  type: DiscountType;
  /** Integer cents for `flat`, integer basis points for `percentage`. */
  value: number;
}

export interface Payment {
  method: PaymentMethod;
  /** Tendered amount in integer cents. */
  amount: number;
}

export type ValidationField = 'discount' | 'checkout' | PaymentMethod;

export interface CheckoutError {
  field: ValidationField;
  message: string;
}

/** The three inputs that drive every checkout calculation. */
export interface CheckoutInputs {
  cart: readonly CartItem[];
  discount: Discount;
  payments: readonly Payment[];
}

/** Result of the single calculation pipeline. All amounts are integer cents. */
export interface CheckoutCalculation {
  subtotalCents: number;
  discountCents: number;
  taxableCents: number;
  vatCents: number;
  payableCents: number;
  cashCents: number;
  cardCents: number;
  bankTransferCents: number;
  paidCents: number;
  remainingCents: number;
  changeCents: number;
  cashRequiredCents: number;
  errors: CheckoutError[];
  canComplete: boolean;
}

/**
 * Checkout state: inputs (cart, discount, payments) plus the derived totals.
 * Derived fields are recomputed from the inputs by `calculateCheckout` on
 * every reducer transition, so they can never go stale.
 */
export interface CheckoutState {
  cart: CartItem[];
  discount: Discount;
  payments: Payment[];
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  vatAmount: number;
  payableAmount: number;
  paidAmount: number;
  remainingAmount: number;
  changeDue: number;
  validationErrors: CheckoutError[];
  canComplete: boolean;
  status: CheckoutStatus;
}

export type CheckoutAction =
  | { type: 'SET_DISCOUNT'; discount: Discount }
  | { type: 'UPDATE_PAYMENT'; method: PaymentMethod; amount: number }
  | { type: 'REMOVE_PAYMENT'; method: PaymentMethod }
  | { type: 'RESET_CHECKOUT' }
  | { type: 'COMPLETE_CHECKOUT' };
