import { useState } from 'react';
import Button from './components/ui/Button';
import QuickCheckoutModal from './components/checkout/QuickCheckoutModal';

export default function App() {
  // Opens by default so the terminal lands directly on the checkout screen.
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(true);

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <span
          aria-hidden="true"
          className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-950 text-xl font-bold text-white"
        >
          C
        </span>
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.25em] text-indigo-700">
          Cavelle POS
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Checkout Terminal</h1>
        <p className="mt-2 text-sm text-slate-500">
          Precision Checkout &amp; Split-Payment Engine — open the quick checkout modal to
          process an in-store sale.
        </p>
        <Button className="mt-6 w-full py-3" onClick={() => setIsCheckoutOpen(true)}>
          Open Quick Checkout
        </Button>
      </div>

      {isCheckoutOpen ? <QuickCheckoutModal onClose={() => setIsCheckoutOpen(false)} /> : null}
    </main>
  );
}
