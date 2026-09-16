import type {
  SupportAction,
  SupportDecisionContract,
  SupportActionResult,
} from '@kuri/contracts';
import type {
  SupportActionRecord,
  ApprovalRequestRecord,
} from '../../../domain/support/entities/support-action';

export const SUPPORT_ACTION_REPOSITORY = Symbol('SUPPORT_ACTION_REPOSITORY');
export interface SupportActionRepository {
  findByIdempotencyKey(key: string): Promise<SupportActionRecord | null>;
  saveEffect(record: SupportActionRecord): Promise<SupportActionResult>;
  saveApproval(
    record: ApprovalRequestRecord,
  ): Promise<SupportDecisionContract & { approval_request_id: string }>;
}
export const ACTION_EFFECT_PORT = Symbol('ACTION_EFFECT_PORT');
export interface ActionEffectPort {
  execute(
    action: SupportAction,
    orderId: string,
    amountCents?: number,
  ): Promise<{ effectId: string }>;
}
