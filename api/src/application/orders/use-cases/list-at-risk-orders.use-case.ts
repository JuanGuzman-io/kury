import { Inject, Injectable } from '@nestjs/common';
import type { AtRiskOrderResponse, OrderListQuery } from '@kuri/contracts';
import {
  ORDER_QUERY_REPOSITORY,
  type OrderQueryRepository,
} from '../ports/order-query-repository.port';

@Injectable()
export class ListAtRiskOrdersUseCase {
  constructor(
    @Inject(ORDER_QUERY_REPOSITORY)
    private readonly orders: OrderQueryRepository,
  ) {}

  execute(
    query: OrderListQuery,
    evaluationInstant = new Date(),
  ): Promise<AtRiskOrderResponse> {
    return this.orders.findAtRiskPage(query, evaluationInstant);
  }
}
