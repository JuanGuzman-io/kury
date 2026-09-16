import type { SupportDecisionContract } from '@kuri/contracts';
export interface SupportActionRecord {
  idempotencyKey: string;
  orderId: string;
  userId: string;
  decision: SupportDecisionContract;
}
export interface ApprovalRequestRecord extends SupportActionRecord {
  status: 'PENDING';
  amountCents: number;
  contextFingerprint?: string;
  conversationId?: string;
}
