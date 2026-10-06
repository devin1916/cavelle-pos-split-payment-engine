import { describe, expect, it } from 'vitest';
import {
  formatLKR,
  minorUnitsToInputValue,
  parseMoneyToCents,
  parsePercentToBasisPoints,
  roundHalfUp,
} from '../utils/money';

describe('parseMoneyToCents', () => {
  it('converts decimal currency strings into integer cents', () => {
    expect(parseMoneyToCents('1250')).toBe(125000);
    expect(parseMoneyToCents('1250.50')).toBe(125050);
    expect(parseMoneyToCents('0.05')).toBe(5);
  });

  it('parses small decimals exactly where floats are unsafe', () => {
    expect(parseMoneyToCents('0.10')).toBe(10);
    expect(parseMoneyToCents('0.1')).toBe(10);
    expect(parseMoneyToCents('0.2')).toBe(20);
  });

  it('treats empty input as zero', () => {
    expect(parseMoneyToCents('')).toBe(0);
    expect(parseMoneyToCents('   ')).toBe(0);
  });

  it('accepts thousands separators', () => {
    expect(parseMoneyToCents('1,250.50')).toBe(125050);
    expect(parseMoneyToCents('1,000,000')).toBe(100000000);
  });

  it('rounds excess decimal places half-up to the nearest cent', () => {
    expect(parseMoneyToCents('1250.567')).toBe(125057);
    expect(parseMoneyToCents('1250.555')).toBe(125056);
    expect(parseMoneyToCents('0.005')).toBe(1);
    expect(parseMoneyToCents('1250.999')).toBe(125100);
  });

  it('accepts partial input a cashier may still be typing', () => {
    expect(parseMoneyToCents('1250.')).toBe(125000);
    expect(parseMoneyToCents('.5')).toBe(50);
  });

  it('rejects invalid monetary input', () => {
    expect(parseMoneyToCents('abc')).toBeNull();
    expect(parseMoneyToCents('-5')).toBeNull();
    expect(parseMoneyToCents('1.2.3')).toBeNull();
    expect(parseMoneyToCents('.')).toBeNull();
    expect(parseMoneyToCents('10rpg')).toBeNull();
  });

  it('rejects input with more than six decimal places', () => {
    expect(parseMoneyToCents('1.1234567')).toBeNull();
  });
});

describe('parsePercentToBasisPoints', () => {
  it('converts percentages into integer basis points', () => {
    expect(parsePercentToBasisPoints('10')).toBe(1000);
    expect(parsePercentToBasisPoints('10.5')).toBe(1050);
    expect(parsePercentToBasisPoints('0.05')).toBe(5);
    expect(parsePercentToBasisPoints('100')).toBe(10000);
  });

  it('keeps over-100 values representable so validation can flag them', () => {
    expect(parsePercentToBasisPoints('150')).toBe(15000);
  });

  it('treats empty input as zero and rejects invalid input', () => {
    expect(parsePercentToBasisPoints('')).toBe(0);
    expect(parsePercentToBasisPoints('-1')).toBeNull();
    expect(parsePercentToBasisPoints('ten')).toBeNull();
  });
});

describe('formatLKR', () => {
  it('always displays exactly two decimals', () => {
    expect(formatLKR(0)).toBe('LKR 0.00');
    expect(formatLKR(5)).toBe('LKR 0.05');
    expect(formatLKR(125000)).toBe('LKR 1,250.00');
    expect(formatLKR(125050)).toBe('LKR 1,250.50');
    expect(formatLKR(100000000)).toBe('LKR 1,000,000.00');
  });

  it('prefixes negative amounts with a minus sign', () => {
    expect(formatLKR(-500)).toBe('-LKR 5.00');
  });

  it('renders 0.1 + 0.2 style totals exactly, unlike raw floats', () => {
    // 0.1 + 0.2 is 0.30000000000000004 in floating point.
    expect(0.1 + 0.2).not.toBe(0.3);
    const tenCents = parseMoneyToCents('0.1');
    const twentyCents = parseMoneyToCents('0.2');
    expect(tenCents).toBe(10);
    expect(twentyCents).toBe(20);
    const total = (tenCents ?? 0) + (twentyCents ?? 0);
    expect(total).toBe(30);
    expect(formatLKR(total)).toBe('LKR 0.30');
  });
});

describe('roundHalfUp', () => {
  it('rounds exact halves away from zero using integer arithmetic', () => {
    expect(roundHalfUp(15, 10)).toBe(2);
    expect(roundHalfUp(5, 10)).toBe(1);
    expect(roundHalfUp(-5, 10)).toBe(-1);
  });

  it('rounds non-halves normally', () => {
    expect(roundHalfUp(14, 10)).toBe(1);
    expect(roundHalfUp(4, 10)).toBe(0);
    expect(roundHalfUp(2, 3)).toBe(1);
    expect(roundHalfUp(1, 3)).toBe(0);
  });
});

describe('minorUnitsToInputValue', () => {
  it('converts integer minor units back to clean input text', () => {
    expect(minorUnitsToInputValue(0)).toBe('0');
    expect(minorUnitsToInputValue(5)).toBe('0.05');
    expect(minorUnitsToInputValue(60050)).toBe('600.50');
    expect(minorUnitsToInputValue(600000)).toBe('6000');
  });
});
