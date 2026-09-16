import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type {
  AtRiskOrderResponse,
  OrderDetailResponse,
  OrderListResponse,
} from '@kuri/contracts';
import { GetOrderDetailsUseCase } from '../../../application/orders/use-cases/get-order-details.use-case';
import { ListOrdersUseCase } from '../../../application/orders/use-cases/list-orders.use-case';
import { ListAtRiskOrdersUseCase } from '../../../application/orders/use-cases/list-at-risk-orders.use-case';
import { OrderDomainError } from '../../../domain/orders/errors/order-domain.error';
import {
  RequireKuriRoles,
  SimulatedRoleGuard,
} from '../guards/simulated-role.guard';
import { OrderListQueryDto } from '../dto/order-list.query.dto';
import { OrderDetailsResponseDto } from '../dto/order-details.response.dto';
import {
  AtRiskResponseDto,
  OrderListResponseDto,
} from '../dto/order-list.response.dto';

@Controller('api/v1/orders')
@UseGuards(SimulatedRoleGuard)
@ApiTags('Orders')
export class OrdersController {
  constructor(
    private readonly getOrderDetails: GetOrderDetailsUseCase,
    private readonly listOrders: ListOrdersUseCase,
    private readonly listAtRiskOrders: ListAtRiskOrdersUseCase,
  ) {}

  @Get()
  @RequireKuriRoles('SYSTEM', 'OPS')
  @ApiOperation({ summary: 'List operational orders' })
  @ApiOkResponse({ type: OrderListResponseDto })
  @ApiQuery({ name: 'city', required: false, enum: ['BOG', 'MEX', 'LIM'] })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: [
      'CREATED',
      'ACCEPTED',
      'COURIER_ASSIGNED',
      'PICKED_UP',
      'DELIVERED',
      'CANCELLED',
    ],
  })
  @ApiQuery({ name: 'delayed', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  async list(@Query() query: OrderListQueryDto): Promise<OrderListResponse> {
    return this.listOrders.execute(query);
  }

  @Get('at-risk')
  @RequireKuriRoles('SYSTEM', 'OPS')
  @ApiOperation({ summary: 'List active orders ordered by risk' })
  @ApiOkResponse({ type: AtRiskResponseDto })
  @ApiQuery({ name: 'city', required: false, enum: ['BOG', 'MEX', 'LIM'] })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['CREATED', 'ACCEPTED', 'COURIER_ASSIGNED', 'PICKED_UP'],
  })
  @ApiQuery({ name: 'delayed', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  async atRisk(
    @Query() query: OrderListQueryDto,
  ): Promise<AtRiskOrderResponse> {
    return this.listAtRiskOrders.execute(query);
  }

  @Get(':orderId')
  @RequireKuriRoles('SYSTEM', 'OPS')
  @ApiOperation({ summary: 'Get complete operational order detail' })
  @ApiParam({ name: 'orderId' })
  @ApiOkResponse({ type: OrderDetailsResponseDto })
  async getById(
    @Param('orderId') orderId: string,
  ): Promise<OrderDetailResponse> {
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
