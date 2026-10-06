import { useId, useMemo, useState } from 'react';
import Modal from '../ui/Modal';
import CheckoutHeader from './CheckoutHeader';
import CheckoutSuccess from './CheckoutSuccess';
import DiscountSection from './DiscountSection';
import SummaryPanel from './SummaryPanel';
import TaxSection from './TaxSection';
import CartTable from '../cart/CartTable';
import PaymentSection from '../payment/PaymentSection';
import { useCheckout } from '../../hooks/useCheckout';
import { MOCK_CART_ITEMS } from '../../data/mockCart';
import { createOrderReference } from '../../utils/order';
import { findErrorByField } from '../../utils/validation';

interface QuickCheckoutModalProps {
  onClose: () => void;
}

/**
 * Quick Checkout modal. All money values come from `useCheckout` state, which
 * the reducer derives through the single calculation pipeline; this component
 * only wires sections to the reducer.
 *
 * Desktop layout: cart + discount + tax on the left, payment + summary on the
 * right. Sections stack vertically on smaller screens.
 */
export default function QuickCheckoutModal({ onClose }: QuickCheckoutModalProps) {
  const checkout = useCheckout(MOCK_CART_ITEMS);
  const { state } = checkout;
  const titleId = useId();
  const [transactionNumber, setTransactionNumber] = useState(0);
  const orderReference = useMemo(() => createOrderReference(), [transactionNumber]);

  const discountError = findErrorByField(state.validationErrors, 'discount');

  const handleNewTransaction = () => {
    checkout.resetCheckout();
    setTransactionNumber((current) => current + 1);
  };

  return (
    <Modal onClose={onClose} labelledBy={titleId}>
      <CheckoutHeader titleId={titleId} orderReference={orderReference} status={state.status} />

      {state.status === 'completed' ? (
        <CheckoutSuccess
          orderReference={orderReference}
          payableAmount={state.payableAmount}
          paidAmount={state.paidAmount}
          changeDue={state.changeDue}
          payments={state.payments}
          onNewTransaction={handleNewTransaction}
        />
      ) : (
        <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div className="min-w-0 space-y-5">
            <CartTable items={state.cart} subtotal={state.subtotal} />
            <DiscountSection
              discount={state.discount}
              error={discountError}
              onDiscountChange={checkout.setDiscount}
            />
            <TaxSection />
          </div>

          <div className="min-w-0 space-y-5 self-start lg:sticky lg:top-4">
            <PaymentSection
              payableAmount={state.payableAmount}
              payments={state.payments}
              changeDue={state.changeDue}
              validationErrors={state.validationErrors}
              onPaymentChange={checkout.updatePayment}
              onPaymentRemove={checkout.removePayment}
            />
            <SummaryPanel state={state} onComplete={checkout.completeCheckout} />
          </div>
        </div>
      )}
    </Modal>
  );
}
