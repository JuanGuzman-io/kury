import { Inject, Injectable } from '@nestjs/common';
import {
  ORDER_QUERY_REPOSITORY,
  type OrderQueryRepository,
} from '../../orders/ports/order-query-repository.port';
import type { SupportOrderContext } from '../../../domain/support/entities/support-order-context';

@Injectable()
export class SupportOrderContextService {
  constructor(
    @Inject(ORDER_QUERY_REPOSITORY)
    private readonly orders: OrderQueryRepository,
  ) {}
  async findOwned(
    orderId: string,
    userId: string,
  ): Promise<SupportOrderContext | null> {
    const order = await this.orders.findDetail(orderId);
    if (!order || order.user_id !== userId) return null;
    return {
      orderId: order.order_id,
      userId: order.user_id,
      currentStatus: order.current_status,
      statusOccurredAt: new Date(order.status_occurred_at),
      promisedAt: new Date(order.promised_at),
      totalAmountCents: order.total_amount_cents,
      city: order.city,
      restaurantId: order.restaurant.restaurant_id,
      items: order.items.map((item) => ({
        lineNumber: item.line_number,
        unitPriceCents: item.unit_price_cents,
        quantity: item.quantity,
      })),
    };
  }
}
