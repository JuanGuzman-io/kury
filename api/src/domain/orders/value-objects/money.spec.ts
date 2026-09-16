import { assertItemTotal, MoneyError, toCents } from './money';

describe('money boundary', () => {
  it('converts decimal input to exact integer cents', () => {
    expect(toCents('12.50')).toBe(1250);
    expect(toCents(8)).toBe(800);
  });

  it('rejects imprecise money and mismatched item totals', () => {
    expect(() => toCents('1.001')).toThrow(MoneyError);
    expect(() =>
      assertItemTotal([{ quantity: 2, unitPriceCents: 500 }], 999),
    ).toThrow(MoneyError);
  });
});
