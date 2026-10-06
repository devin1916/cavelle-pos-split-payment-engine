import Button from '../ui/Button';
import { VALIDATION_MESSAGES, VAT_RATE_PERCENT } from '../../constants/checkout';
import type { CheckoutState } from '../../types/checkout';
import { formatLKR } from '../../utils/money';

interface SummaryPanelProps {
  state: CheckoutState;
  onComplete: () => void;
}

type SummaryTone = 'default' | 'warning' | 'positive' | 'muted';

const TONE_CLASSES: Record<SummaryTone, string> = {
  default: 'text-slate-700',
  warning: 'text-amber-600',
  positive: 'text-emerald-700',
  muted: 'text-slate-400',
};

interface SummaryRowProps {
  label: string;
  value: string;
  tone?: SummaryTone;
}

function SummaryRow({ label, value, tone = 'default' }: SummaryRowProps) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <span className="font-medium text-slate-500">{label}</span>
      <span className={`font-semibold tabular-nums ${TONE_CLASSES[tone]}`}>{value}</span>
    </div>
  );
}

/**
 * The premium financial summary. Every amount is read from checkout state —
 * this component never calculates money itself.
 */
export default function SummaryPanel({ state, onComplete }: SummaryPanelProps) {
  const checkoutErrors = state.validationErrors.filter(
    (error) => error.field === 'checkout',
  );

  const buttonHint = state.canComplete
    ? 'Payment settled — ready to complete.'
    : state.remainingAmount > 0
      ? `${formatLKR(state.remainingAmount)} still due before checkout.`
      : 'Resolve the validation errors to continue.';

  return (
    <section className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-900">Summary</h2>
      </header>

      <div className="flex-1 px-5 py-4">
        <div className="space-y-3">
          <SummaryRow label="Subtotal" value={formatLKR(state.subtotal)} />
          <SummaryRow label="Discount" value={`-${formatLKR(state.discountAmount)}`} />
          <SummaryRow
            label={`VAT (${VAT_RATE_PERCENT}%)`}
            value={formatLKR(state.vatAmount)}
          />
        </div>

        <div className="mt-4 flex items-baseline justify-between gap-4 rounded-xl bg-indigo-950 px-4 py-4">
          <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-indigo-200">
            Total Payable
          </span>
          <span className="text-2xl font-bold tabular-nums text-white">
            {formatLKR(state.payableAmount)}
          </span>
        </div>

        <div className="mt-4 space-y-3">
          <div className="flex items-baseline justify-between gap-4 rounded-lg bg-emerald-50 px-3 py-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
              Paid
            </span>
            <span className="text-base font-semibold tabular-nums text-emerald-700">
              {formatLKR(state.paidAmount)}
            </span>
          </div>
          <SummaryRow
            label="Remaining"
            value={formatLKR(state.remainingAmount)}
            tone="warning"
          />
          <SummaryRow
            label="Change Due"
            value={formatLKR(state.changeDue)}
            tone={state.changeDue > 0 ? 'positive' : 'muted'}
          />
        </div>

        {checkoutErrors.length > 0 ? (
          <ul className="mt-4 space-y-2" aria-label="Checkout validation">
            {checkoutErrors.map((error) => {
              const isUnderpayment = error.message === VALIDATION_MESSAGES.insufficientPayment;
              return (
                <li
                  key={error.message}
                  role="alert"
                  className={`rounded-lg border px-3 py-2 text-xs font-medium ${
                    isUnderpayment
                      ? 'border-amber-200 bg-amber-50 text-amber-700'
                      : 'border-red-200 bg-red-50 text-red-700'
                  }`}
                >
                  {error.message}
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      <div className="border-t border-slate-200 px-5 py-4">
        <Button
          type="button"
          className="w-full py-3 text-[15px]"
          disabled={!state.canComplete}
          aria-describedby="complete-checkout-hint"
          onClick={onComplete}
        >
          Complete Checkout
        </Button>
        <p
          id="complete-checkout-hint"
          className={`mt-2 text-center text-xs font-medium ${
            state.canComplete ? 'text-emerald-700' : 'text-slate-500'
          }`}
        >
          {buttonHint}
        </p>
      </div>
    </section>
  );
}
