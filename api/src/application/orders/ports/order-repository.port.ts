import type { OrderProjection } from '../../../domain/orders/entities/order';

export interface OrderRepositoryPort {
  replaceProjection(projection: OrderProjection): Promise<void>;
}
