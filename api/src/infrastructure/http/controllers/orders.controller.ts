import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { GetOrderDetailsUseCase } from '../../../application/orders/use-cases/get-order-details.use-case';
import { OrderDomainError } from '../../../domain/orders/errors/order-domain.error';
import {
  RequireKuriRoles,
  SimulatedRoleGuard,
} from '../guards/simulated-role.guard';

@Controller('api/v1/orders')
@UseGuards(SimulatedRoleGuard)
export class OrdersController {
  constructor(private readonly getOrderDetails: GetOrderDetailsUseCase) {}

  @Get(':orderId')
  @RequireKuriRoles('SYSTEM', 'OPS')
  async getById(
    @Param('orderId') orderId: string,
  ): Promise<Record<string, unknown>> {
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(orderId)) {
      throw new OrderDomainError(
        'VALIDATION_ERROR',
        'orderId has an invalid format.',
        400,
      );
    }
    return this.getOrderDetails.execute(orderId);
  }
}
