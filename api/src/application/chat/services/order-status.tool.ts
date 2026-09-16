import { Inject, Injectable } from '@nestjs/common';
import {
  ORDER_QUERY_REPOSITORY,
  type OrderQueryRepository,
} from '../../orders/ports/order-query-repository.port';
import type { RiskOrderDetail } from '@kuri/contracts';

export type StatusToolResult =
  | {
      ok: true;
      order: {
        order_id: string;
        current_status: string;
        promised_at: string;
        delayed: boolean;
        risk?: RiskOrderDetail['risk'];
      };
    }
  | { ok: false; code: 'ORDER_NOT_FOUND' | 'ORDER_NOT_OWNED_BY_USER' };

@Injectable()
export class OrderStatusTool {
  constructor(
    @Inject(ORDER_QUERY_REPOSITORY)
    private readonly orders: OrderQueryRepository,
  ) {}

  async execute(userId: string, orderId: string): Promise<StatusToolResult> {
    const order = await this.orders.findDetail(orderId);
    if (!order) return { ok: false, code: 'ORDER_NOT_FOUND' };
    if (order.user_id !== userId)
      return { ok: false, code: 'ORDER_NOT_OWNED_BY_USER' };
    return {
      ok: true,
      order: {
        order_id: order.order_id,
        current_status: order.current_status,
        promised_at: order.promised_at,
        delayed: order.delayed,
        risk: order.risk,
      },
    };
  }
}
