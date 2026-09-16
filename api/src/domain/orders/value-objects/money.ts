export class MoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MoneyError';
  }
}

export function toCents(value: string | number): number {
  const raw = typeof value === 'number' ? String(value) : value;
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) {
    throw new MoneyError(
      'Amount must be a non-negative decimal with at most two decimal places.',
    );
  }

  const [whole, fraction = ''] = raw.split('.');
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  if (cents > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new MoneyError('Amount exceeds the supported range.');
  }
  return Number(cents);
}

export function assertItemTotal(
  items: ReadonlyArray<{ quantity: number; unitPriceCents: number }>,
  total: number,
): void {
  const computed = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPriceCents,
    0,
  );
  if (!Number.isSafeInteger(computed) || computed !== total) {
    throw new MoneyError('Item total does not match total amount.');
  }
}
