import {
  Inject,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import type {
  ApprovalRequestContract,
  PaginatedApprovalsContract,
  SupportActionResult,
} from '@kuri/contracts';
import { DataSource } from 'typeorm';
import {
  SupportActionEffectEntity,
  SupportApprovalRequestEntity,
} from '../../../infrastructure/database/typeorm/entities/support-action.entities';
import {
  ACTION_EFFECT_PORT,
  type ActionEffectPort,
} from '../../support/ports/support-action.ports';
import { SupportOrderContextService } from '../../support/services/support-order-context.service';
import { AuditTraceService } from './audit-trace.service';
import { createApprovalContextFingerprint } from '../../../domain/audit/services/approval-context-fingerprint';

@Injectable()
export class ApprovalService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly orderContext: SupportOrderContextService,
    @Inject(ACTION_EFFECT_PORT) private readonly effects: ActionEffectPort,
    private readonly audit?: AuditTraceService,
  ) {}

  async list(
    status: string | undefined,
    page = 1,
    limit = 20,
  ): Promise<PaginatedApprovalsContract> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const repository = this.dataSource.getRepository(
      SupportApprovalRequestEntity,
    );
    const query = repository
      .createQueryBuilder('approval')
      .orderBy('approval.created_at', 'ASC')
      .addOrderBy('approval.approval_request_id', 'ASC');
    if (status) query.andWhere('approval.status = :status', { status });
    const [rows, total] = await query
      .skip((safePage - 1) * safeLimit)
      .take(safeLimit)
      .getManyAndCount();
    return {
      data: rows.map(toContract),
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  async resolve(
    id: string,
    resolver: string,
    action: 'APPROVE' | 'REJECT',
  ): Promise<SupportActionResult> {
    const repository = this.dataSource.getRepository(
      SupportApprovalRequestEntity,
    );
    const approval = await repository.findOneBy({ approvalRequestId: id });
    if (!approval) throw new NotFoundException('Approval request not found.');
    if (approval.status !== 'PENDING')
      throw new ConflictException('Approval request is already resolved.');
    if (action === 'REJECT') {
      await this.transition(id, 'REJECTED', resolver);
      await this.audit?.record({
        type: 'APPROVAL',
        conversationId: approval.conversationId ?? undefined,
        orderId: approval.orderId,
        payload: {
          approval_request_id: id,
          status: 'REJECTED',
          resolved_by: resolver,
        },
      });
      return result(
        approval,
        'REJECTED',
        'La solicitud fue rechazada por Operaciones.',
      );
    }
    const context = await this.orderContext.findOwned(
      approval.orderId,
      approval.userId,
    );
    const fingerprint = context
      ? createApprovalContextFingerprint(context)
      : null;
    if (
      approval.contextFingerprint &&
      approval.contextFingerprint !== fingerprint
    ) {
      await this.transition(id, 'OBSOLETE', resolver);
      await this.audit?.record({
        type: 'APPROVAL',
        conversationId: approval.conversationId ?? undefined,
        orderId: approval.orderId,
        payload: {
          approval_request_id: id,
          status: 'OBSOLETE',
          resolved_by: resolver,
        },
      });
      return result(
        approval,
        'OBSOLETE',
        'La solicitud quedó obsoleta porque cambió el pedido. Requiere una nueva evaluación.',
      );
    }
    const effect = await this.dataSource.transaction(async (manager) => {
      const changed = await manager
        .createQueryBuilder()
        .update(SupportApprovalRequestEntity)
        .set({
          status: 'APPROVED',
          resolvedBy: resolver,
          resolvedAt: new Date(),
        })
        .where('approval_request_id = :id AND status = :pending', {
          id,
          pending: 'PENDING',
        })
        .execute();
      if (changed.affected !== 1)
        throw new ConflictException('Approval request is already resolved.');

      const executed = await this.effects.execute(
        approval.action as 'CANCEL_ORDER' | 'ISSUE_COUPON' | 'REFUND',
        approval.orderId,
        Number(approval.amountCents),
      );
      const effectEntity = await manager
        .getRepository(SupportActionEffectEntity)
        .save({
          idempotencyKey: approval.idempotencyKey,
          orderId: approval.orderId,
          userId: approval.userId,
          action: approval.action,
          decisionStatus: 'ALLOWED',
          policyVersion: approval.policyVersion,
          amountCents: approval.amountCents,
          providerReference: null,
          result: { effect_id: executed.effectId, approval_request_id: id },
        });
      await this.audit?.record({
        type: 'EFFECT',
        conversationId: approval.conversationId ?? undefined,
        orderId: approval.orderId,
        payload: {
          approval_request_id: id,
          effect_id: executed.effectId,
          action: approval.action,
          status: 'ALLOWED',
        },
      });
      return { effectId: effectEntity.effectId };
    });
    await this.audit?.record({
      type: 'APPROVAL',
      conversationId: approval.conversationId ?? undefined,
      orderId: approval.orderId,
      payload: {
        approval_request_id: id,
        status: 'APPROVED',
        resolved_by: resolver,
      },
    });
    return {
      ...result(
        approval,
        'APPROVED',
        'La solicitud fue aprobada y ejecutada por Operaciones.',
      ),
      effect_id: effect.effectId,
    };
  }

  private async transition(
    id: string,
    status: string,
    resolver: string,
  ): Promise<void> {
    const changed = await this.dataSource
      .createQueryBuilder()
      .update(SupportApprovalRequestEntity)
      .set({ status, resolvedBy: resolver, resolvedAt: new Date() })
      .where('approval_request_id = :id AND status = :pending', {
        id,
        pending: 'PENDING',
      })
      .execute();
    if (changed.affected !== 1)
      throw new ConflictException('Approval request is already resolved.');
  }
}

function toContract(
  entity: SupportApprovalRequestEntity,
): ApprovalRequestContract {
  return {
    approval_request_id: entity.approvalRequestId,
    idempotency_key: entity.idempotencyKey,
    order_id: entity.orderId,
    ...(entity.conversationId
      ? { conversation_id: entity.conversationId }
      : {}),
    action_type: entity.action,
    amount_cents: Number(entity.amountCents),
    reason: entity.reason,
    policy_version: entity.policyVersion,
    status: entity.status as ApprovalRequestContract['status'],
    created_at: entity.createdAt.toISOString(),
    ...(entity.resolvedAt
      ? { resolved_at: entity.resolvedAt.toISOString() }
      : {}),
    ...(entity.resolvedBy ? { resolved_by: entity.resolvedBy } : {}),
  };
}

function result(
  entity: SupportApprovalRequestEntity,
  status: 'APPROVED' | 'REJECTED' | 'OBSOLETE',
  reason: string,
): SupportActionResult {
  const decision = entity.decision as unknown as SupportActionResult;
  return {
    ...decision,
    status: status === 'APPROVED' ? 'ALLOWED' : 'REJECTED',
    reason,
  };
}
