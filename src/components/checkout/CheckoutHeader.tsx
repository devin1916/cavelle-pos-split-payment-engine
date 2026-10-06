import type { CheckoutStatus } from '../../types/checkout';

interface CheckoutHeaderProps {
  titleId: string;
  orderReference: string;
  status: CheckoutStatus;
}

const STATUS_LABELS: Record<CheckoutStatus, string> = {
  draft: 'Draft',
  completed: 'Completed',
};

const STATUS_CLASSES: Record<CheckoutStatus, string> = {
  draft: 'bg-slate-100 text-slate-600',
  completed: 'bg-emerald-100 text-emerald-700',
};

export default function CheckoutHeader({ titleId, orderReference, status }: CheckoutHeaderProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 py-5 pl-5 pr-16 sm:pl-6">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-950 text-lg font-bold text-white"
        >
          C
        </span>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-700">
            Cavelle POS
            <span className="ml-2 font-medium normal-case tracking-normal text-slate-400">
              Precision Checkout &amp; Split-Payment Engine
            </span>
          </p>
          <h1 id={titleId} className="text-xl font-semibold text-slate-900">
            Quick Checkout
          </h1>
        </div>
      </div>

      {/* Right padding keeps the order reference clear of the modal close button. */}
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-xs text-slate-500">Order reference</p>
          <p className="text-sm font-semibold tabular-nums text-slate-800">{orderReference}</p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_CLASSES[status]}`}>
          {STATUS_LABELS[status]}
        </span>
      </div>
    </header>
  );
}
