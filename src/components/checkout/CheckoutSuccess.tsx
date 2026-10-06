import Button from '../ui/Button';
import { PAYMENT_METHOD_OPTIONS } from '../../constants/checkout';
import type { Payment } from '../../types/checkout';
import { formatLKR } from '../../utils/money';
import { getPaymentAmount } from '../../utils/payments';

interface CheckoutSuccessProps {
  orderReference: string;
  payableAmount: number;
  paidAmount: number;
  changeDue: number;
  payments: readonly Payment[];
  onNewTransaction: () => void;
}

interface StatProps {
  label: string;
  value: string;
  emphasis?: boolean;
}

function Stat({ label, value, emphasis = false }: StatProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p
        className={`mt-1 tabular-nums ${
          emphasis ? 'text-xl font-bold text-emerald-700' : 'text-lg font-semibold text-slate-900'
        }`}
      >
        {value}
      </p>
    </div>
  );
}

/** Frontend-only completed state: order reference, final figures, reset path. */
export default function CheckoutSuccess({
  orderReference,
  payableAmount,
  paidAmount,
  changeDue,
  payments,
  onNewTransaction,
}: CheckoutSuccessProps) {
  const recordedPayments = PAYMENT_METHOD_OPTIONS.map((option) => ({
    label: option.label,
    amount: getPaymentAmount(payments, option.method),
  })).filter((payment) => payment.amount > 0);

  return (
    <section role="status" className="px-5 py-8 sm:px-8 sm:py-10">
      <div className="text-center">
        <span
          aria-hidden="true"
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-7 w-7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 13l4 4L19 7" />
          </svg>
        </span>
        <h2 className="mt-4 text-xl font-semibold text-slate-900">Checkout complete</h2>
        <p className="mt-1 text-sm text-slate-500">
          Order{' '}
          <span className="font-semibold tabular-nums text-slate-800">{orderReference}</span>{' '}
          has been settled.
        </p>
      </div>

      <div className="mx-auto mt-6 grid max-w-2xl gap-3 sm:grid-cols-3">
        <Stat label="Total Payable" value={formatLKR(payableAmount)} />
        <Stat label="Paid" value={formatLKR(paidAmount)} />
        <Stat label="Change Due" value={formatLKR(changeDue)} emphasis={changeDue > 0} />
      </div>

      <div className="mx-auto mt-4 max-w-2xl rounded-xl border border-slate-200">
        {recordedPayments.length === 0 ? (
          <p className="px-4 py-3 text-sm text-slate-500">No payment was required.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recordedPayments.map((payment) => (
              <li
                key={payment.label}
                className="flex items-center justify-between px-4 py-3 text-sm"
              >
                <span className="font-medium text-slate-600">{payment.label}</span>
                <span className="font-semibold tabular-nums text-slate-900">
                  {formatLKR(payment.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6 text-center">
        <Button type="button" className="px-8 py-3" onClick={onNewTransaction}>
          Start New Transaction
        </Button>
        <p className="mt-2 text-xs text-slate-400">
          Cash over-tender is returned as change; card and bank transfers never produce
          change.
        </p>
      </div>
    </section>
  );
}
