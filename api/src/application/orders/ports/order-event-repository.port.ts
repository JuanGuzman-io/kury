import type { OrderEvent } from '../../../domain/orders/entities/order-event';

export interface OrderEventRepositoryPort {
  findByEventId(eventId: string): Promise<OrderEvent | null>;
  findByOrderId(orderId: string): Promise<OrderEvent[]>;
}
