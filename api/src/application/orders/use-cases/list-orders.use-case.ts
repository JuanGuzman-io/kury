import { Inject, Injectable } from '@nestjs/common';
import type { OrderListQuery, OrderListResponse } from '@kuri/contracts';
import {
  ORDER_QUERY_REPOSITORY,
  type OrderQueryRepository,
} from '../ports/order-query-repository.port';

@Injectable()
export class ListOrdersUseCase {
  constructor(
    @Inject(ORDER_QUERY_REPOSITORY)
    private readonly orders: OrderQueryRepository,
  ) {}

  async execute(
    query: OrderListQuery,
    evaluationInstant = new Date(),
  ): Promise<OrderListResponse> {
    const result = await this.orders.findPage(query, evaluationInstant);
    return {
      data: result.data,
      pagination: {
        page: query.page,
        limit: query.limit,
        total: result.total,
        totalPages:
          result.total === 0 ? 0 : Math.ceil(result.total / query.limit),
      },
    };
  }
}
