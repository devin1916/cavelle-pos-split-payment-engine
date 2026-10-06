import type { CartItem } from '../../types/checkout';
import { calculateLineTotal } from '../../utils/calculations';
import { formatLKR } from '../../utils/money';

interface CartTableProps {
  items: readonly CartItem[];
  /** Passed in from checkout state so the subtotal is not computed twice. */
  subtotal: number;
}

/** Polished cart rows: product, unit price, quantity and line total. */
export default function CartTable({ items, subtotal }: CartTableProps) {
  const totalUnits = items.reduce((total, item) => total + item.qty, 0);

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <header className="flex items-baseline justify-between gap-4 border-b border-slate-200 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Cart</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {items.length} {items.length === 1 ? 'product' : 'products'} · {totalUnits} units
          </p>
        </div>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[440px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500">
              <th scope="col" className="px-5 py-3 text-left font-semibold">
                Product
              </th>
              <th scope="col" className="px-3 py-3 text-right font-semibold">
                Unit Price
              </th>
              <th scope="col" className="px-3 py-3 text-center font-semibold">
                Qty
              </th>
              <th scope="col" className="px-5 py-3 text-right font-semibold">
                Line Total
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-slate-100 last:border-b-0">
                <td className="px-5 py-3.5">
                  <p className="font-medium text-slate-900">{item.name}</p>
                  <p className="text-xs text-slate-400">{item.id}</p>
                </td>
                <td className="px-3 py-3.5 text-right tabular-nums text-slate-600">
                  {formatLKR(item.unitPrice)}
                </td>
                <td className="px-3 py-3.5 text-center">
                  <span className="inline-flex min-w-8 justify-center whitespace-nowrap rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-600">
                    × {item.qty}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right font-semibold tabular-nums text-slate-900">
                  {formatLKR(calculateLineTotal(item))}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-200 bg-slate-50">
              <td
                colSpan={3}
                className="px-5 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500"
              >
                Subtotal
              </td>
              <td className="px-5 py-3.5 text-right text-base font-semibold tabular-nums text-slate-900">
                {formatLKR(subtotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
