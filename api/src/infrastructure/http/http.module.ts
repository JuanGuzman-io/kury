import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { IngestOrderEventUseCase } from '../../application/orders/use-cases/ingest-order-event.use-case';
import { GetOrderDetailsUseCase } from '../../application/orders/use-cases/get-order-details.use-case';
import { LoadOrderDatasetUseCase } from '../../application/orders/use-cases/load-order-dataset.use-case';
import { LoadReferenceDataUseCase } from '../../application/orders/use-cases/load-reference-data.use-case';
import { TypeormOrderEventRepository } from '../database/typeorm/repositories/typeorm-order-event.repository';
import { TypeormOrderRepository } from '../database/typeorm/repositories/typeorm-order.repository';
import { TypeormReferenceDataRepository } from '../database/typeorm/repositories/typeorm-reference-data.repository';
import { TypeormOrderQueryRepository } from '../database/typeorm/repositories/typeorm-order-query.repository';
import { TypeormOrderTransaction } from '../database/typeorm/typeorm-order-transaction';
import { HealthController } from './controllers/health.controller';
import { OrderEventsController } from './controllers/order-events.controller';
import { OrdersController } from './controllers/orders.controller';
import { HttpErrorFilter } from './filters/http-error.filter';
import { SimulatedRoleGuard } from './guards/simulated-role.guard';
import { ORDER_QUERY_REPOSITORY } from '../../application/orders/ports/order-query-repository.port';
import { ListOrdersUseCase } from '../../application/orders/use-cases/list-orders.use-case';

@Module({
  controllers: [HealthController, OrderEventsController, OrdersController],
  providers: [
    IngestOrderEventUseCase,
    GetOrderDetailsUseCase,
    ListOrdersUseCase,
    LoadReferenceDataUseCase,
    LoadOrderDatasetUseCase,
    TypeormOrderTransaction,
    TypeormOrderRepository,
    TypeormOrderEventRepository,
    TypeormReferenceDataRepository,
    TypeormOrderQueryRepository,
    {
      provide: ORDER_QUERY_REPOSITORY,
      useExisting: TypeormOrderQueryRepository,
    },
    SimulatedRoleGuard,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: HttpErrorFilter },
  ],
})
export class HttpModule {}
