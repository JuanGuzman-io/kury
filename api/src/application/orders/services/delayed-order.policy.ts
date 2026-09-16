export function isOrderDelayed(
  promisedAt: Date,
  currentStatus: string,
  evaluationInstant: Date,
): boolean {
  return (
    evaluationInstant.getTime() > promisedAt.getTime() &&
    currentStatus !== 'DELIVERED'
  );
}
