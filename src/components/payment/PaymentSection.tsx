import Panel from '../ui/Panel';
import PaymentMethodField, { type PaymentHint } from './PaymentMethodField';
import { PAYMENT_METHOD_OPTIONS } from '../../constants/checkout';
import type { CheckoutError, Payment, PaymentMethod } from '../../types/checkout';
import { formatLKR } from '../../utils/money';
import { getCashRequiredAmount, getMaxNonCashAmount, getPaymentAmount } from '../../utils/payments';
import { findErrorByField } from '../../utils/validation';

interface PaymentSectionProps {
  payableAmount: number;
  payments: readonly Payment[];
  changeDue: number;
  validationErrors: readonly CheckoutError[];
  onPaymentChange: (method: PaymentMethod, amount: number) => void;
  onPaymentRemove: (method: PaymentMethod) => void;
}

/**
 * Split-payment tender cards. Every hint and error comes from checkout state,
 * so the "cash still required" figure updates the moment another tender moves.
 */
export default function PaymentSection({
  payableAmount,
  payments,
  changeDue,
  validationErrors,
  onPaymentChange,
  onPaymentRemove,
}: PaymentSectionProps) {
  const buildHint = (method: PaymentMethod): PaymentHint => {
    if (method === 'cash') {
      const cashRequired = getCashRequiredAmount(payableAmount, payments);
      return {
        label: 'Cash required',
        value: formatLKR(cashRequired),
        tone: cashRequired > 0 ? 'warning' : 'info',
      };
    }
    return {
      label: 'Maximum allowed',
      value: formatLKR(getMaxNonCashAmount(payableAmount, payments, method)),
      tone: 'info',
    };
  };

  const cashChangeNote =
    changeDue > 0 ? `Change due: ${formatLKR(changeDue)}` : null;

  return (
    <Panel
      title="Payment"
      hint="Split the balance across cash, card and bank transfer"
      headerAside={
        <span className="text-xs text-slate-500">
          {payments.length} of {PAYMENT_METHOD_OPTIONS.length} methods used
        </span>
      }
    >
      <div className="space-y-3">
        {PAYMENT_METHOD_OPTIONS.map((option) => (
          <PaymentMethodField
            key={option.method}
            option={option}
            amount={getPaymentAmount(payments, option.method)}
            hint={buildHint(option.method)}
            note={option.method === 'cash' ? cashChangeNote : null}
            error={findErrorByField(validationErrors, option.method)?.message ?? null}
            onAmountChange={onPaymentChange}
            onRemove={onPaymentRemove}
          />
        ))}
      </div>
    </Panel>
  );
}
