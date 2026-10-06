import type { ReactNode } from 'react';

interface PanelProps {
  title: string;
  /** Secondary line rendered under the panel title. */
  hint?: string;
  /** Right-aligned slot in the panel header, e.g. a badge or item count. */
  headerAside?: ReactNode;
  children: ReactNode;
}

/** Standard card shell used by the checkout sections. */
export default function Panel({ title, hint, headerAside, children }: PanelProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <header className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {hint ? <p className="mt-0.5 text-xs text-slate-500">{hint}</p> : null}
        </div>
        {headerAside}
      </header>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}
