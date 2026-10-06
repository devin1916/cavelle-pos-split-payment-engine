import type {
  CartItem,
  CheckoutAction,
  CheckoutCalculation,
  CheckoutError,
  CheckoutInputs,
  CheckoutState,
  CheckoutStatus,
  Payment,
  PaymentMethod,
} from '../types/checkout';
import { VALIDATION_MESSAGES } from '../constants/checkout';
import { calculateCheckout } from '../utils/calculations';
import { getMaxNonCashAmount } from '../utils/payments';
import { isPaymentLimitError, withoutFieldErrors } from '../utils/validation';

/**
 * Rebuilds the whole state from its inputs using the single calculation
 * pipeline. Derived totals are therefore recomputed on every transition and
 * can never be stale; `transientErrors` carries payment-limit errors recorded
 * by earlier over-limit tender attempts.
 */
function buildState(
  inputs: CheckoutInputs,
  transientErrors: readonly CheckoutError[],
  status: CheckoutStatus,
): CheckoutState {
  const calculation: CheckoutCalculation = calculateCheckout(inputs);
  return {
    cart: [...inputs.cart],
    discount: inputs.discount,
    payments: [...inputs.payments],
    subtotal: calculation.subtotalCents,
    discountAmount: calculation.discountCents,
    taxableAmount: calculation.taxableCents,
    vatAmount: calculation.vatCents,
    payableAmount: calculation.payableCents,
    paidAmount: calculation.paidCents,
    remainingAmount: calculation.remainingCents,
    changeDue: calculation.changeCents,
    validationErrors: [...calculation.errors, ...transientErrors],
    canComplete: calculation.canComplete && transientErrors.length === 0,
    status,
  };
}

export function createInitialCheckoutState(cart: readonly CartItem[]): CheckoutState {
  return buildState(
    { cart: [...cart], discount: { type: 'percentage', value: 0 }, payments: [] },
    [],
    'draft',
  );
}

function upsertPayment(
  payments: readonly Payment[],
  method: PaymentMethod,
  amount: number,
): Payment[] {
  const withoutMethod = payments.filter((payment) => payment.method !== method);
  return amount > 0 ? [...withoutMethod, { method, amount }] : withoutMethod;
}

function getPaymentLimitError(method: PaymentMethod): CheckoutError | null {
  if (method === 'card') {
    return { field: 'card', message: VALIDATION_MESSAGES.cardExceedsRemaining };
  }
  if (method === 'bank_transfer') {
    return { field: 'bank_transfer', message: VALIDATION_MESSAGES.bankTransferExceedsRemaining };
  }
  return null;
}

export function checkoutReducer(state: CheckoutState, action: CheckoutAction): CheckoutState {
  switch (action.type) {
    case 'SET_DISCOUNT': {
      // Guard against non-integer/negative values reaching the pipeline.
      if (!Number.isInteger(action.discount.value) || action.discount.value < 0) return state;
      return buildState(
        { cart: state.cart, discount: action.discount, payments: state.payments },
        state.validationErrors.filter(isPaymentLimitError),
        state.status,
      );
    }

    case 'UPDATE_PAYMENT': {
      // Defensive: only finite non-negative integers may enter monetary state.
      if (!Number.isInteger(action.amount) || action.amount < 0) return state;

      const keptErrors = withoutFieldErrors(
        state.validationErrors.filter(isPaymentLimitError),
        action.method,
      );
      let amount = action.amount;
      let transientErrors = keptErrors;

      if (action.method !== 'cash') {
        const maxAmount = getMaxNonCashAmount(state.payableAmount, state.payments, action.method);
        const cappedAmount = Math.min(action.amount, maxAmount);
        if (cappedAmount < action.amount) {
          // Over-limit tender: cap it and record a clear, transient error.
          const limitError = getPaymentLimitError(action.method);
          transientErrors = limitError ? [...keptErrors, limitError] : keptErrors;
        }
        amount = cappedAmount;
      }

      return buildState(
        {
          cart: state.cart,
          discount: state.discount,
          payments: upsertPayment(state.payments, action.method, amount),
        },
        transientErrors,
        state.status,
      );
    }

    case 'REMOVE_PAYMENT':
      return buildState(
        {
          cart: state.cart,
          discount: state.discount,
          payments: state.payments.filter((payment) => payment.method !== action.method),
        },
        withoutFieldErrors(
          state.validationErrors.filter(isPaymentLimitError),
          action.method,
        ),
        state.status,
      );

    case 'RESET_CHECKOUT':
      return createInitialCheckoutState(state.cart);

    case 'COMPLETE_CHECKOUT':
      // Guarded transition: completion only happens from a valid, settled sale.
      return state.canComplete ? { ...state, status: 'completed' } : state;

    default:
      return state;
  }
}
