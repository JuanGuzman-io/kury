import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { OrderDomainError } from '../../../domain/orders/errors/order-domain.error';
import { TypeormOrderEventRepository } from '../../../infrastructure/database/typeorm/repositories/typeorm-order-event.repository';
import { TypeormOrderRepository } from '../../../infrastructure/database/typeorm/repositories/typeorm-order.repository';

@Injectable()
export class GetOrderDetailsUseCase {
  constructor(
    private readonly dataSource: DataSource,
    private readonly orders: TypeormOrderRepository,
    private readonly events: TypeormOrderEventRepository,
  ) {}

  async execute(orderId: string): Promise<Record<string, unknown>> {
    const details = await this.orders.findDetails(
      this.dataSource.manager,
      orderId,
    );
    if (!details)
      throw new OrderDomainError(
        'ORDER_NOT_FOUND',
        'Order was not found.',
        404,
      );
    const timeline = await this.events.findByOrderId(
      this.dataSource.manager,
      orderId,
    );
    return {
      order_id: details.order.orderId,
      user_id: details.order.userId,
      city: details.order.city,
      restaurant_id: details.order.restaurantId,
      courier_id: details.order.courierId,
      current_status: details.order.currentStatus,
      current_event_id: details.order.currentEventId,
      status_occurred_at: details.order.statusOccurredAt.toISOString(),
      promised_at: details.order.promisedAt.toISOString(),
      weather: details.order.weather,
      total_amount_cents: Number(details.order.totalAmountCents),
      items: details.items.map((item) => ({
        line_number: item.lineNumber,
        sku: item.sku,
        name: item.name,
        quantity: item.quantity,
        unit_price_cents: Number(item.unitPriceCents),
      })),
      timeline: timeline.map((event) => ({
        event_id: event.eventId,
        type: event.type,
        status: event.status,
        actor: event.actor,
        occurred_at: event.occurredAt.toISOString(),
        received_at: event.receivedAt.toISOString(),
        courier_id: event.courierId,
        processing_outcome: event.processingOutcome,
        rejection_code: event.rejectionCode,
      })),
    };
  }
}
