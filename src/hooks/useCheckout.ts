import { useReducer } from 'react';
import type { CartItem, Discount, PaymentMethod } from '../types/checkout';
import { checkoutReducer, createInitialCheckoutState } from '../reducers/checkoutReducer';

/**
 * Single entry point for checkout state.
 *
 * Components receive typed helpers instead of dispatching raw actions, so
 * action payloads stay consistent and business logic stays out of the UI.
 */
export function useCheckout(cart: readonly CartItem[]) {
  const [state, dispatch] = useReducer(checkoutReducer, [...cart], createInitialCheckoutState);

  return {
    state,
    setDiscount: (discount: Discount) => dispatch({ type: 'SET_DISCOUNT', discount }),
    updatePayment: (method: PaymentMethod, amount: number) =>
      dispatch({ type: 'UPDATE_PAYMENT', method, amount }),
    removePayment: (method: PaymentMethod) => dispatch({ type: 'REMOVE_PAYMENT', method }),
    resetCheckout: () => dispatch({ type: 'RESET_CHECKOUT' }),
    completeCheckout: () => dispatch({ type: 'COMPLETE_CHECKOUT' }),
  };
}
