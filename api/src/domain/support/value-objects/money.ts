export const USD_CENTS = {
  fiveDollars: 500,
  eightDollars: 800,
  tenDollars: 1000,
} as const;

export function percentageCents(
  amountCents: number,
  percentage: number,
): number {
  if (!Number.isSafeInteger(amountCents) || amountCents < 0)
    throw new Error('INVALID_MONEY');
  if (!Number.isSafeInteger(percentage) || percentage < 0)
    throw new Error('INVALID_PERCENTAGE');
  return Math.floor((amountCents * percentage) / 100);
}

export function cappedCents(amountCents: number, capCents: number): number {
  if (!Number.isSafeInteger(capCents) || capCents < 0)
    throw new Error('INVALID_CAP');
  return Math.min(amountCents, capCents);
}
