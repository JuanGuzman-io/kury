import { DataSource } from 'typeorm';
import {
  OrderEntity,
  OrderEventEntity,
  OrderItemEntity,
} from '../../src/infrastructure/database/typeorm/entities/order-ingestion.entities';
import { insertReferences } from './test-app';

export async function insertOrderFixture(
  dataSource: DataSource,
  suffix: string,
  options: {
    city?: 'BOG' | 'MEX' | 'LIM';
    status?: string;
    promisedAt?: Date;
    courier?: boolean;
  } = {},
): Promise<string> {
  const { restaurantId, courierId } = await insertReferences(
    dataSource,
    suffix,
  );
  const orderId = `ord_query_${suffix}`;
  const status = options.status ?? 'ACCEPTED';
  const eventId = `evt_query_${suffix}`;
  const promisedAt = options.promisedAt ?? new Date('2099-01-01T00:00:00Z');
  await dataSource.manager.save(OrderEntity, {
    orderId,
    userId: `usr_query_${suffix}`,
    city: options.city ?? 'BOG',
    restaurantId,
    courierId: options.courier === false ? null : courierId,
    currentStatus: status,
    currentEventId: eventId,
    statusOccurredAt: new Date('2026-09-15T12:10:00Z'),
    promisedAt,
    weather: 'CLEAR',
    totalAmountCents: '1250',
    projectionVersion: 1,
  });
  await dataSource.manager.save(OrderItemEntity, {
    orderId,
    lineNumber: 1,
    sku: 'meal',
    name: 'Meal',
    quantity: 1,
    unitPriceCents: '1250',
  });
  await dataSource.manager.save(OrderEventEntity, {
    eventId,
    orderId,
    eventType: 'ORDER_STATUS_CHANGED',
    status,
    occurredAt: new Date('2026-09-15T12:10:00Z'),
    receivedAt: new Date('2026-09-15T12:11:00Z'),
    actor: 'SYSTEM',
    courierId: options.courier === false ? null : courierId,
    cancelReason: null,
    payload: { status },
    contentHash: eventId.padEnd(64, '0').slice(0, 64),
    processingOutcome: 'APPLIED',
    rejectionCode: null,
    processedAt: new Date('2026-09-15T12:12:00Z'),
  });
  return orderId;
}
