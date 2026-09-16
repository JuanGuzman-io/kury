import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import type { OrderProjection } from '../../../../domain/orders/entities/order';
import {
  OrderEntity,
  OrderItemEntity,
} from '../entities/order-ingestion.entities';

@Injectable()
export class TypeormOrderRepository {
  async replaceProjection(
    manager: EntityManager,
    projection: OrderProjection,
  ): Promise<void> {
    const existing = await manager.findOneBy(OrderEntity, {
      orderId: projection.orderId,
    });
    await manager.save(OrderEntity, {
      orderId: projection.orderId,
      userId: projection.userId,
      city: projection.city,
      restaurantId: projection.restaurantId,
      courierId: projection.courierId,
      currentStatus: projection.currentStatus,
      currentEventId: projection.currentEventId,
      statusOccurredAt: projection.statusOccurredAt,
      promisedAt: projection.promisedAt,
      weather: projection.weather,
      totalAmountCents: String(projection.totalAmountCents),
      projectionVersion: existing ? existing.projectionVersion + 1 : 1,
    });
    await manager.delete(OrderItemEntity, { orderId: projection.orderId });
    await manager.insert(
      OrderItemEntity,
      projection.items.map((item, index) => ({
        orderId: projection.orderId,
        lineNumber: index + 1,
        sku: item.sku,
        name: item.name,
        quantity: item.quantity,
        unitPriceCents: String(item.unitPriceCents),
      })),
    );
  }

  async findDetails(
    manager: EntityManager,
    orderId: string,
  ): Promise<{
    order: OrderEntity;
    items: OrderItemEntity[];
  } | null> {
    const order = await manager.findOneBy(OrderEntity, { orderId });
    if (!order) return null;
    const items = await manager.find(OrderItemEntity, {
      where: { orderId },
      order: { lineNumber: 'ASC' },
    });
    return { order, items };
  }

  async currentStatus(
    manager: EntityManager,
    orderId: string,
  ): Promise<string | null> {
    const order = await manager.findOneBy(OrderEntity, { orderId });
    return order?.currentStatus ?? null;
  }
}
