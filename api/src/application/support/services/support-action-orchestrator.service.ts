import { Inject, Injectable, Logger } from '@nestjs/common';
import type {
  SupportActionRequest,
  SupportActionResult,
  SupportDecisionContract,
} from '@kuri/contracts';
import { evaluateCancellation } from '../../../domain/support/policies/cancellation.policy';
import { evaluateDelayCompensation } from '../../../domain/support/policies/delay-compensation.policy';
import { evaluateMissingItems } from '../../../domain/support/policies/missing-items.policy';
import { SUPPORT_POLICY_VERSION } from '../../../domain/support/value-objects/support-decision';
import {
  ACTION_EFFECT_PORT,
  SUPPORT_ACTION_REPOSITORY,
  type ActionEffectPort,
  type SupportActionRepository,
} from '../ports/support-action.ports';
import {
  IDEMPOTENCY_KEY_SERVICE,
  type IdempotencyKeyService,
} from '../ports/idempotency-key.port';
import {
  supportContextFingerprint,
  SupportOrderContextService,
} from './support-order-context.service';
import type { SupportActionRecord } from '../../../domain/support/entities/support-action';
import { IngestOrderEventUseCase } from '../../orders/use-cases/ingest-order-event.use-case';
import { eventContentHash } from '../../orders/services/event-identity.service';
import type { OrderEventInput } from '@kuri/contracts';
import type { OrderEvent } from '../../../domain/orders/entities/order-event';
import { createHash } from 'node:crypto';
import { SupportActionResponseService } from './support-action-response.service';

export const SUPPORT_ACTION_ORCHESTRATOR = Symbol(
  'SUPPORT_ACTION_ORCHESTRATOR',
);

@Injectable()
export class SupportActionOrchestratorService {
  private readonly logger = new Logger(SupportActionOrchestratorService.name);

  constructor(
    private readonly context: SupportOrderContextService,
    @Inject(SUPPORT_ACTION_REPOSITORY)
    private readonly repository: SupportActionRepository,
    @Inject(IDEMPOTENCY_KEY_SERVICE)
    private readonly keys: IdempotencyKeyService,
    @Inject(ACTION_EFFECT_PORT) private readonly effects: ActionEffectPort,
    private readonly ingest: IngestOrderEventUseCase,
    private readonly responses: SupportActionResponseService,
  ) {}

  async evaluate(
    userId: string,
    request: SupportActionRequest,
  ): Promise<SupportDecisionContract> {
    const order = await this.context.findOwned(request.order_id, userId);
    if (!order)
      return this.responses.sanitize({
        decision_id: 'decision_rejected',
        status: 'REJECTED',
        action: request.action,
        reason: 'No puedo procesar una acción para ese pedido.',
        policy_version: SUPPORT_POLICY_VERSION,
      });
    if (request.action === 'CANCEL_ORDER')
      return this.responses.sanitize(evaluateCancellation(order, new Date()));
    if (request.action === 'ISSUE_COUPON')
      return this.responses.sanitize(
        evaluateDelayCompensation(order, new Date(), request.alternative),
      );
    return this.responses.sanitize(
      evaluateMissingItems(order, request.missing_item_lines ?? []),
    );
  }

  async execute(
    userId: string,
    request: SupportActionRequest,
  ): Promise<SupportActionResult> {
    const decision = await this.evaluate(userId, request);
    this.logger.log(
      `Support action evaluated: action=${request.action} order=${request.order_id} status=${decision.status}`,
    );
    const key = this.keys.create(
      request.action,
      request.order_id,
      request.alternative,
      decision.policy_version,
    );
    const existing = await this.repository.findByIdempotencyKey(key);
    if (existing) return this.responses.sanitize(existing.decision);
    const record: SupportActionRecord = {
      idempotencyKey: key,
      orderId: request.order_id,
      userId,
      decision,
    };
    if (decision.status === 'REQUIRES_APPROVAL')
      return this.responses.sanitize(
        await this.repository.saveApproval({
          ...record,
          status: 'PENDING',
          amountCents: decision.amount_cents ?? 0,
          contextFingerprint: supportContextFingerprint(
            (await this.context.findOwned(request.order_id, userId))!,
          ),
        }),
      );
    if (decision.status !== 'ALLOWED') return this.responses.sanitize(decision);
    if (decision.action === 'CANCEL_ORDER') {
      const eventId = `evt_cancel_${createHash('sha256').update(key).digest('hex').slice(0, 32)}`;
      const occurredAt = new Date();
      const input: OrderEventInput = {
        event_id: eventId,
        order_id: request.order_id,
        type: 'ORDER_STATUS_CHANGED',
        occurred_at: occurredAt.toISOString(),
        received_at: occurredAt.toISOString(),
        payload: {
          status: 'CANCELLED',
          actor: 'USER',
          cancel_reason: 'USER_REQUESTED',
        },
      };
      const event: OrderEvent = {
        eventId,
        orderId: request.order_id,
        type: 'ORDER_STATUS_CHANGED',
        status: 'CANCELLED',
        actor: 'USER',
        courierId: null,
        cancelReason: 'USER_REQUESTED',
        occurredAt,
        receivedAt: occurredAt,
        payload: input.payload as unknown as Record<string, unknown>,
        contentHash: eventContentHash(input),
        ingestionSequence: 0,
        processingOutcome: 'PENDING_SEQUENCE',
        rejectionCode: null,
        createdOrder: null,
      };
      await this.ingest.execute({ input, event });
    }
    const effect = await this.effects.execute(
      decision.action,
      request.order_id,
      decision.amount_cents,
    );
    return this.responses.sanitize({
      ...(await this.repository.saveEffect(record)),
      effect_id: effect.effectId,
    });
  }
}
