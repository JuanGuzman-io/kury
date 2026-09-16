import type {
  OrderDetailResponse,
  OrderListItem,
  OrderListQuery,
} from '@kuri/contracts';

export const ORDER_QUERY_REPOSITORY = Symbol('ORDER_QUERY_REPOSITORY');

export interface OrderQueryRepository {
  findDetail(orderId: string): Promise<OrderDetailResponse | null>;
  findPage(
    query: OrderListQuery,
    evaluationInstant: Date,
  ): Promise<{ data: OrderListItem[]; total: number }>;
}
