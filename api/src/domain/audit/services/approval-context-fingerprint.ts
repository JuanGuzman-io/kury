export interface ApprovalContextSnapshot {
  currentStatus: string;
  statusOccurredAt: Date;
  totalAmountCents: number;
}

export function createApprovalContextFingerprint(
  context: ApprovalContextSnapshot,
): string {
  return `${context.currentStatus}:${context.statusOccurredAt.toISOString()}:${context.totalAmountCents}`;
}
