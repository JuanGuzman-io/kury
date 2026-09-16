import type { OrderListItem, OrderListQuery } from '@kuri/contracts';
import type { AtRiskOrderResponse, RiskOrderDetail } from '@kuri/contracts';

export const ORDER_QUERY_REPOSITORY = Symbol('ORDER_QUERY_REPOSITORY');

export interface OrderQueryRepository {
  findDetail(orderId: string): Promise<RiskOrderDetail | null>;
  findPage(
    query: OrderListQuery,
    evaluationInstant: Date,
  ): Promise<{ data: OrderListItem[]; total: number }>;
  findAtRiskPage(
    query: OrderListQuery,
    evaluationInstant: Date,
  ): Promise<AtRiskOrderResponse>;
}
