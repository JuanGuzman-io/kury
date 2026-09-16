import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import type { CityCode, Weather } from '@kuri/contracts';
import type { OrderEvent } from '../../../../domain/orders/entities/order-event';
import {
  OrderEventEntity,
  IngestionAttemptEntity,
} from '../entities/order-ingestion.entities';

function toDomain(entity: OrderEventEntity): OrderEvent {
  const payload = entity.payload;
  const creation = entity.eventType === 'ORDER_CREATED' ? payload : null;
  return {
    eventId: entity.eventId,
    orderId: entity.orderId,
    type: entity.eventType as OrderEvent['type'],
    status: entity.status as OrderEvent['status'],
    actor: entity.actor as OrderEvent['actor'],
    courierId: entity.courierId,
    cancelReason: entity.cancelReason,
    occurredAt: entity.occurredAt,
    receivedAt: entity.receivedAt,
    payload,
    contentHash: entity.contentHash,
    ingestionSequence: Number(entity.ingestionSequence),
    processingOutcome:
      entity.processingOutcome as OrderEvent['processingOutcome'],
    rejectionCode: entity.rejectionCode,
    createdOrder: creation
      ? {
          userId: String(creation.user_id),
          city: creation.city as CityCode,
          restaurantId: String(creation.restaurant_id),
          items: (creation.items as Array<Record<string, unknown>>).map(
            (item) => ({
              sku: String(item.sku),
              name: String(item.name),
              quantity: Number(item.quantity),
              unitPriceCents: Number(item.unit_price_cents),
            }),
          ),
          totalAmountCents: Number(creation.total_amount_cents),
          promisedAt: new Date(String(creation.promised_at)),
          weather: creation.weather as Weather,
        }
      : null,
  };
}

@Injectable()
export class TypeormOrderEventRepository {
  async findByEventId(
    manager: EntityManager,
    eventId: string,
  ): Promise<OrderEvent | null> {
    const entity = await manager.findOneBy(OrderEventEntity, { eventId });
    return entity ? toDomain(entity) : null;
  }

  async findByOrderId(
    manager: EntityManager,
    orderId: string,
  ): Promise<OrderEvent[]> {
    const rows = await manager.find(OrderEventEntity, {
      where: { orderId },
      order: { occurredAt: 'ASC', ingestionSequence: 'ASC' },
    });
    return rows.map(toDomain);
  }

  async insert(manager: EntityManager, event: OrderEvent): Promise<void> {
    await manager.insert(OrderEventEntity, {
      eventId: event.eventId,
      orderId: event.orderId,
      eventType: event.type,
      status: event.status,
      occurredAt: event.occurredAt,
      receivedAt: event.receivedAt,
      actor: event.actor,
      courierId: event.courierId,
      cancelReason: event.cancelReason,
      payload: event.payload as never,
      contentHash: event.contentHash,
      processingOutcome: 'PENDING_SEQUENCE',
      rejectionCode: null,
      processedAt: null,
    });
  }

  async updateOutcomes(
    manager: EntityManager,
    outcomes: ReadonlyArray<{
      eventId: string;
      outcome: string;
      rejectionCode: string | null;
    }>,
  ): Promise<void> {
    for (const { eventId, outcome, rejectionCode } of outcomes) {
      await manager.update(
        OrderEventEntity,
        { eventId },
        { processingOutcome: outcome, rejectionCode, processedAt: new Date() },
      );
    }
  }

  async recordAttempt(
    manager: EntityManager,
    input: {
      eventId: string;
      orderId: string | null;
      contentHash: string | null;
      outcome: string;
      reasonCode: string | null;
      details?: Record<string, unknown>;
      loadRunId?: string | null;
    },
  ): Promise<void> {
    await manager.insert(IngestionAttemptEntity, {
      ...input,
      loadRunId: input.loadRunId ?? null,
      details: (input.details ?? null) as never,
    });
  }
}
