import { Injectable } from '@nestjs/common';
import { DataSource, type DeepPartial } from 'typeorm';
import type {
  SupportActionResult,
  SupportDecisionContract,
} from '@kuri/contracts';
import type {
  ApprovalRequestRecord,
  SupportActionRecord,
} from '../../../../domain/support/entities/support-action';
import type { SupportActionRepository } from '../../../../application/support/ports/support-action.ports';
import {
  SupportActionEffectEntity,
  SupportApprovalRequestEntity,
} from '../entities/support-action.entities';

@Injectable()
export class TypeormSupportActionRepository implements SupportActionRepository {
  constructor(private readonly dataSource: DataSource) {}
  async findByIdempotencyKey(key: string): Promise<SupportActionRecord | null> {
    const effect = await this.dataSource
      .getRepository(SupportActionEffectEntity)
      .findOneBy({ idempotencyKey: key });
    if (effect)
      return {
        idempotencyKey: key,
        orderId: effect.orderId,
        userId: effect.userId,
        decision: effect.result as unknown as SupportDecisionContract,
      };
    const approval = await this.dataSource
      .getRepository(SupportApprovalRequestEntity)
      .findOneBy({ idempotencyKey: key });
    if (approval)
      return {
        idempotencyKey: key,
        orderId: approval.orderId,
        userId: approval.userId,
        decision: {
          ...(approval.decision as unknown as SupportDecisionContract),
          approval_request_id: approval.approvalRequestId,
        },
      };
    return null;
  }
  async saveEffect(record: SupportActionRecord): Promise<SupportActionResult> {
    const entity = await this.dataSource
      .getRepository(SupportActionEffectEntity)
      .save({
        idempotencyKey: record.idempotencyKey,
        orderId: record.orderId,
        userId: record.userId,
        action: record.decision.action,
        decisionStatus: record.decision.status,
        policyVersion: record.decision.policy_version,
        amountCents: record.decision.amount_cents?.toString() ?? null,
        providerReference: null,
        result: record.decision as unknown as Record<string, unknown>,
      } as DeepPartial<SupportActionEffectEntity>);
    return { ...record.decision, effect_id: entity.effectId };
  }
  async saveApproval(
    record: ApprovalRequestRecord,
  ): Promise<SupportDecisionContract & { approval_request_id: string }> {
    const entity = await this.dataSource
      .getRepository(SupportApprovalRequestEntity)
      .save({
        idempotencyKey: record.idempotencyKey,
        orderId: record.orderId,
        userId: record.userId,
        action: record.decision.action,
        policyVersion: record.decision.policy_version,
        amountCents: record.amountCents.toString(),
        reason: record.decision.reason,
        status: 'PENDING',
        decision: record.decision as unknown as Record<string, unknown>,
        contextFingerprint: record.contextFingerprint ?? null,
        conversationId: record.conversationId ?? null,
      } as DeepPartial<SupportApprovalRequestEntity>);
    return {
      ...record.decision,
      approval_request_id: entity.approvalRequestId,
    };
  }
}
