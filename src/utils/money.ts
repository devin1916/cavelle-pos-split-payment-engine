import { CURRENCY_CODE, CURRENCY_LOCALE } from '../constants/checkout';

/** Reject absurd inputs before they lose precision as floats. */
const MAX_INTEGER_DIGITS = 12;
const MAX_FRACTION_DIGITS = 6;

/**
 * Exact integer round-half-away-from-zero division: floor((2n + d) / (2d)).
 * The whole computation stays in integer space (as long as 2n + d < 2^53),
 * so no floating-point rounding error can enter at this boundary.
 */
export function roundHalfUp(numerator: number, denominator: number): number {
  const sign = numerator < 0 ? -1 : 1;
  const magnitude = Math.floor((Math.abs(numerator) * 2 + denominator) / (denominator * 2));
  return sign * magnitude;
}

/**
 * Shared parser for "×100" minor units (cents for money, basis points for
 * percentages). Returns 0 for empty input, `null` for input that is not a
 * valid non-negative decimal number, and otherwise quantises fractional
 * digits with round-half-up (e.g. "1250.567" → 125057).
 */
function parseToMinorUnits(raw: string): number | null {
  let text = raw.trim();
  if (text === '') return 0;

  // Accept thousands separators ("1,250.50") and nothing else.
  if (/^\d{1,3}(?:,\d{3})+(?:\.\d*)?$/.test(text)) text = text.replace(/,/g, '');

  // Allows "1250", "1250.", ".5"; rejects "-", "abc", "1.2.3", "5-".
  if (text === '.' || !/^\d*(?:\.\d*)?$/.test(text)) return null;

  const [rawWhole, rawFraction = ''] = text.split('.');
  if (rawWhole.length > MAX_INTEGER_DIGITS || rawFraction.length > MAX_FRACTION_DIGITS) return null;

  const whole = rawWhole === '' ? 0 : Number(rawWhole);
  const fraction =
    rawFraction === ''
      ? 0
      : roundHalfUp(Number(rawFraction) * 100, 10 ** rawFraction.length);
  const minorUnits = whole * 100 + fraction;

  return Number.isSafeInteger(minorUnits) ? minorUnits : null;
}

/** Parses user-entered money ("1,250.50") into integer cents (125050). */
export function parseMoneyToCents(raw: string): number | null {
  return parseToMinorUnits(raw);
}

/** Parses a user-entered percentage ("10.5") into basis points (1050). */
export function parsePercentToBasisPoints(raw: string): number | null {
  return parseToMinorUnits(raw);
}

const decimalFormatter = new Intl.NumberFormat(CURRENCY_LOCALE, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Formats integer cents as `LKR 1,250.50` with exactly two decimals.
 * This is the only place in the app where cents become decimals.
 */
export function formatLKR(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  return `${sign}${CURRENCY_CODE} ${decimalFormatter.format(Math.abs(cents) / 100)}`;
}

/** Converts integer minor units back to input text: 600000 → "6000". */
export function minorUnitsToInputValue(minorUnits: number): string {
  const units = Math.floor(minorUnits / 100);
  const remainder = minorUnits - units * 100;
  if (remainder === 0) return String(units);
  return `${units}.${String(remainder).padStart(2, '0')}`;
}
