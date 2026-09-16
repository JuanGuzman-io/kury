import { Inject, Injectable } from '@nestjs/common';
import type { OrderDetailResponse } from '@kuri/contracts';
import { OrderDomainError } from '../../../domain/orders/errors/order-domain.error';
import {
  ORDER_QUERY_REPOSITORY,
  type OrderQueryRepository,
} from '../ports/order-query-repository.port';

@Injectable()
export class GetOrderDetailsUseCase {
  constructor(
    @Inject(ORDER_QUERY_REPOSITORY)
    private readonly orders: OrderQueryRepository,
  ) {}

  async execute(orderId: string): Promise<OrderDetailResponse> {
    const details = await this.orders.findDetail(orderId);
    if (!details)
      throw new OrderDomainError(
        'ORDER_NOT_FOUND',
        'Order was not found.',
        404,
      );
    return details;
  }
}
