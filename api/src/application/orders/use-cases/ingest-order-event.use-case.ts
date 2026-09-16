import { Injectable } from '@nestjs/common';
import type { IngestionOutcome } from '@kuri/contracts';
import { reduceOrderTimeline } from '../../../domain/orders/services/order-timeline-reducer';
import type { IngestOrderEventCommand } from '../dto/ingest-order-event.command';
import type { IngestionResult } from '../dto/ingestion-result.dto';
import { TypeormOrderEventRepository } from '../../../infrastructure/database/typeorm/repositories/typeorm-order-event.repository';
import { TypeormOrderRepository } from '../../../infrastructure/database/typeorm/repositories/typeorm-order.repository';
import { TypeormOrderTransaction } from '../../../infrastructure/database/typeorm/typeorm-order-transaction';

@Injectable()
export class IngestOrderEventUseCase {
  constructor(
    private readonly transaction: TypeormOrderTransaction,
    private readonly events: TypeormOrderEventRepository,
    private readonly orders: TypeormOrderRepository,
  ) {}

  async execute(
    command: IngestOrderEventCommand,
    loadRunId?: string,
  ): Promise<IngestionResult> {
    return this.transaction.execute(command.event.orderId, async (manager) => {
      const existing = await this.events.findByEventId(
        manager,
        command.event.eventId,
      );
      if (existing) {
        const sameContent = existing.contentHash === command.event.contentHash;
        const currentStatus = await this.orders.currentStatus(
          manager,
          command.event.orderId,
        );
        await this.events.recordAttempt(manager, {
          eventId: command.event.eventId,
          orderId: command.event.orderId,
          contentHash: command.event.contentHash,
          outcome: sameContent ? 'DUPLICATE' : 'REJECTED_CONFLICT',
          reasonCode: sameContent ? null : 'EVENT_ID_CONFLICT',
          loadRunId,
        });
        return {
          outcome: sameContent ? 'DUPLICATE' : 'REJECTED_CONFLICT',
          eventId: command.event.eventId,
          orderId: command.event.orderId,
          currentStatus: currentStatus as IngestionResult['currentStatus'],
          reasonCode: sameContent ? null : 'EVENT_ID_CONFLICT',
        };
      }

      await this.events.insert(manager, command.event);
      const timeline = await this.events.findByOrderId(
        manager,
        command.event.orderId,
      );
      const reduction = reduceOrderTimeline(timeline);
      await this.events.updateOutcomes(manager, reduction.events);
      if (reduction.projection) {
        await this.orders.replaceProjection(manager, reduction.projection);
      }
      const inserted = reduction.events.find(
        (event) => event.eventId === command.event.eventId,
      )!;
      const outcome = mapOutcome(inserted.outcome);
      await this.events.recordAttempt(manager, {
        eventId: command.event.eventId,
        orderId: command.event.orderId,
        contentHash: command.event.contentHash,
        outcome,
        reasonCode: inserted.rejectionCode,
        loadRunId,
      });
      return {
        outcome,
        eventId: command.event.eventId,
        orderId: command.event.orderId,
        currentStatus: reduction.projection?.currentStatus ?? null,
        reasonCode: inserted.rejectionCode,
      };
    });
  }
}

function mapOutcome(outcome: string): IngestionOutcome {
  if (outcome === 'PENDING_SEQUENCE') return 'PENDING';
  if (outcome === 'REJECTED_CONFLICT') return 'REJECTED_CONFLICT';
  return outcome as IngestionOutcome;
}
