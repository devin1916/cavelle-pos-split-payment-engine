import { useState, type ChangeEvent } from 'react';
import Button from '../ui/Button';
import PaymentMethodIcon from './PaymentMethodIcon';
import type { PaymentMethod } from '../../types/checkout';
import type { PaymentMethodOption } from '../../constants/checkout';
import { minorUnitsToInputValue, parseMoneyToCents } from '../../utils/money';

export interface PaymentHint {
  label: string;
  value: string;
  tone: 'warning' | 'info';
}

interface PaymentMethodFieldProps {
  option: PaymentMethodOption;
  /** Tendered amount in integer cents, as stored in checkout state. */
  amount: number;
  /** Context line, e.g. "Cash required" or "Maximum allowed". */
  hint: PaymentHint | null;
  /** Extra positive note, e.g. the change due for cash. */
  note: string | null;
  /** Validation error message for this tender. */
  error: string | null;
  onAmountChange: (method: PaymentMethod, amount: number) => void;
  onRemove: (method: PaymentMethod) => void;
}

const INVALID_MESSAGE = 'Enter a valid amount.';

/**
 * One tender card: label, icon, LKR amount input, contextual hint and
 * validation feedback. The raw text stays local so partial values ("1250.")
 * can be typed; only parsed integer cents reach checkout state.
 */
export default function PaymentMethodField({
  option,
  amount,
  hint,
  note,
  error,
  onAmountChange,
  onRemove,
}: PaymentMethodFieldProps) {
  const [rawValue, setRawValue] = useState(amount === 0 ? '' : minorUnitsToInputValue(amount));
  const [isInputInvalid, setIsInputInvalid] = useState(false);

  const inputId = `payment-${option.method}`;
  const hintId = `${inputId}-hint`;
  const noteId = `${inputId}-note`;
  const errorId = `${inputId}-error`;

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    setRawValue(raw);
    const parsed = parseMoneyToCents(raw);
    if (parsed === null) {
      setIsInputInvalid(true);
      return;
    }
    setIsInputInvalid(false);
    onAmountChange(option.method, parsed);
  };

  const handleBlur = () => {
    if (isInputInvalid) {
      setRawValue(amount === 0 ? '' : minorUnitsToInputValue(amount));
      setIsInputInvalid(false);
      return;
    }
    // Snap back when the reducer capped an over-limit tender.
    const parsed = parseMoneyToCents(rawValue);
    if (parsed !== null && parsed !== amount) {
      setRawValue(minorUnitsToInputValue(amount));
    }
  };

  const handleClear = () => {
    setRawValue('');
    setIsInputInvalid(false);
    onRemove(option.method);
  };

  const message = isInputInvalid ? INVALID_MESSAGE : error;
  const describedBy =
    [hint ? hintId : null, note ? noteId : null, message ? errorId : null]
      .filter(Boolean)
      .join(' ') || undefined;

  const hintClasses =
    hint?.tone === 'warning'
      ? 'bg-amber-50 text-amber-700'
      : 'bg-slate-100 text-slate-600';

  return (
    <div
      className={`rounded-xl border bg-white p-4 shadow-sm ${
        message ? 'border-red-300' : 'border-slate-200'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3">
          <span className="rounded-lg bg-indigo-50 p-2 text-indigo-700">
            <PaymentMethodIcon method={option.method} />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">{option.label}</p>
            <p className="text-xs text-slate-500">{option.hint}</p>
          </div>
        </div>
        {amount > 0 ? (
          <Button
            variant="ghost"
            className="px-2 py-1 text-xs"
            onClick={handleClear}
            aria-label={`Clear ${option.label} payment`}
          >
            Clear
          </Button>
        ) : null}
      </div>

      <label htmlFor={inputId} className="mt-4 block text-xs font-medium text-slate-600">
        {option.label} amount
      </label>
      <div
        className={`mt-1.5 flex items-center overflow-hidden rounded-lg border bg-white transition-shadow focus-within:ring-2 ${
          message
            ? 'border-red-400 focus-within:border-red-500 focus-within:ring-red-100'
            : 'border-slate-300 focus-within:border-indigo-600 focus-within:ring-indigo-600/15'
        }`}
      >
        <span className="border-r border-slate-200 px-2.5 py-2 text-xs font-semibold text-slate-500">
          LKR
        </span>
        <input
          id={inputId}
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={rawValue}
          onChange={handleChange}
          onBlur={handleBlur}
          aria-invalid={Boolean(message)}
          aria-describedby={describedBy}
          className="w-full bg-transparent px-2.5 py-2 text-sm font-medium tabular-nums text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400"
        />
      </div>

      {hint ? (
        <p
          id={hintId}
          className={`mt-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold ${hintClasses}`}
        >
          {hint.label}
          <span className="tabular-nums">{hint.value}</span>
        </p>
      ) : null}
      {note ? (
        <p id={noteId} className="mt-2 text-xs font-semibold text-emerald-700">
          {note}
        </p>
      ) : null}
      {message ? (
        <p id={errorId} role="alert" className="mt-2 text-xs font-medium text-red-600">
          {message}
        </p>
      ) : null}
    </div>
  );
}
