import { useState, type ChangeEvent } from 'react';
import Panel from '../ui/Panel';
import { DISCOUNT_OPTIONS } from '../../constants/checkout';
import type { CheckoutError, Discount, DiscountType } from '../../types/checkout';
import {
  minorUnitsToInputValue,
  parseMoneyToCents,
  parsePercentToBasisPoints,
} from '../../utils/money';

interface DiscountSectionProps {
  discount: Discount;
  /** Discount validation error derived by the calculation pipeline. */
  error: CheckoutError | null;
  onDiscountChange: (discount: Discount) => void;
}

function parseDiscountValue(raw: string, type: DiscountType): number | null {
  return type === 'percentage'
    ? parsePercentToBasisPoints(raw)
    : parseMoneyToCents(raw);
}

const INVALID_MESSAGE = 'Enter a valid discount value.';

/**
 * Discount controls. Stores the chosen type and integer value in checkout
 * state; the discounted amount itself comes from the calculation pipeline.
 */
export default function DiscountSection({ discount, error, onDiscountChange }: DiscountSectionProps) {
  const [rawValue, setRawValue] = useState(
    discount.value === 0 ? '' : minorUnitsToInputValue(discount.value),
  );
  const [isInputInvalid, setIsInputInvalid] = useState(false);

  const activeUnit = DISCOUNT_OPTIONS.find((option) => option.type === discount.type)?.unit ?? '';

  const handleValueChange = (event: ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    setRawValue(raw);
    const parsed = parseDiscountValue(raw, discount.type);
    if (parsed === null) {
      setIsInputInvalid(true);
      return;
    }
    setIsInputInvalid(false);
    onDiscountChange({ type: discount.type, value: parsed });
  };

  const handleTypeChange = (type: DiscountType) => {
    const parsed = parseDiscountValue(rawValue, type);
    setIsInputInvalid(parsed === null);
    onDiscountChange({ type, value: parsed ?? 0 });
  };

  const handleBlur = () => {
    if (!isInputInvalid) return;
    setRawValue(discount.value === 0 ? '' : minorUnitsToInputValue(discount.value));
    setIsInputInvalid(false);
  };

  const message = isInputInvalid ? INVALID_MESSAGE : error?.message;
  const inputId = 'discount-value';
  const errorId = 'discount-error';

  return (
    <Panel title="Discount" hint="Applied before VAT when the totals are calculated">
      <fieldset>
        <legend className="text-xs font-medium text-slate-600">Discount type</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {DISCOUNT_OPTIONS.map((option) => (
            <label
              key={option.type}
              className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 transition-colors has-[:checked]:border-indigo-700 has-[:checked]:bg-indigo-50 has-[:checked]:text-indigo-900 has-[:checked]:font-semibold hover:bg-slate-50"
            >
              <input
                type="radio"
                name="discount-type"
                className="h-4 w-4 accent-indigo-700"
                checked={discount.type === option.type}
                onChange={() => handleTypeChange(option.type)}
              />
              {option.label}
              <span className="ml-auto text-xs font-normal text-slate-400">{option.unit}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-4">
        <label htmlFor={inputId} className="text-xs font-medium text-slate-600">
          Discount value
        </label>
        <div
          className={`mt-1.5 flex max-w-56 items-center overflow-hidden rounded-lg border bg-white transition-shadow focus-within:ring-2 ${
            message
              ? 'border-red-400 focus-within:border-red-500 focus-within:ring-red-100'
              : 'border-slate-300 focus-within:border-indigo-600 focus-within:ring-indigo-600/15'
          }`}
        >
          <input
            id={inputId}
            type="text"
            inputMode="decimal"
            placeholder="0"
            value={rawValue}
            onChange={handleValueChange}
            onBlur={handleBlur}
            aria-invalid={Boolean(message)}
            aria-describedby={message ? errorId : undefined}
            className="w-full bg-transparent px-3 py-2 text-sm tabular-nums text-slate-900 outline-none placeholder:text-slate-400"
          />
          <span className="border-l border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500">
            {activeUnit}
          </span>
        </div>
        {message ? (
          <p id={errorId} role="alert" className="mt-1.5 text-xs font-medium text-red-600">
            {message}
          </p>
        ) : (
          <p className="mt-1.5 text-xs text-slate-400">
            {discount.type === 'percentage'
              ? 'Percentage of the subtotal, e.g. 10 or 10.5'
              : 'Fixed amount in LKR, e.g. 500'}
          </p>
        )}
      </div>
    </Panel>
  );
}
