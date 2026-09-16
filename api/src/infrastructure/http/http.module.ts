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
import { ListAtRiskOrdersUseCase } from '../../application/orders/use-cases/list-at-risk-orders.use-case';
import { RiskAssessmentService } from '../../domain/risk/services/risk-assessment.service';
import { ChatController } from './controllers/chat.controller';
import { ChatOrchestratorService } from '../../application/chat/services/chat-orchestrator.service';
import { OrderStatusTool } from '../../application/chat/services/order-status.tool';
import { FutureActionTools } from '../../application/chat/services/future-action.tools';
import { SendChatMessageUseCase } from '../../application/chat/use-cases/send-chat-message.use-case';
import { CONVERSATION_REPOSITORY } from '../../application/chat/ports/conversation-repository.port';
import { LLM_PROVIDER } from '../../application/chat/ports/llm-provider.port';
import { TypeormConversationRepository } from '../database/typeorm/repositories/typeorm-conversation.repository';
import { DeterministicLlmProvider } from '../ai/deterministic-llm.provider';
import { SupportActionsController } from './controllers/support-actions.controller';
import {
  SUPPORT_ACTION_ORCHESTRATOR,
  SupportActionOrchestratorService,
} from '../../application/support/services/support-action-orchestrator.service';
import { SupportOrderContextService } from '../../application/support/services/support-order-context.service';
import { CanonicalIdempotencyKeyService } from '../../application/support/services/idempotency-key.service';
import { IDEMPOTENCY_KEY_SERVICE } from '../../application/support/ports/idempotency-key.port';
import {
  ACTION_EFFECT_PORT,
  SUPPORT_ACTION_REPOSITORY,
} from '../../application/support/ports/support-action.ports';
import { TypeormSupportActionRepository } from '../database/typeorm/repositories/typeorm-support-action.repository';
import { DeterministicActionEffectAdapter } from '../support/deterministic-action-adapters';

@Module({
  controllers: [
    HealthController,
    OrderEventsController,
    OrdersController,
    ChatController,
    SupportActionsController,
  ],
  providers: [
    IngestOrderEventUseCase,
    GetOrderDetailsUseCase,
    ListOrdersUseCase,
    ListAtRiskOrdersUseCase,
    RiskAssessmentService,
    ChatOrchestratorService,
    SendChatMessageUseCase,
    OrderStatusTool,
    FutureActionTools,
    SupportActionOrchestratorService,
    {
      provide: SUPPORT_ACTION_ORCHESTRATOR,
      useExisting: SupportActionOrchestratorService,
    },
    SupportOrderContextService,
    CanonicalIdempotencyKeyService,
    TypeormSupportActionRepository,
    DeterministicActionEffectAdapter,
    {
      provide: IDEMPOTENCY_KEY_SERVICE,
      useExisting: CanonicalIdempotencyKeyService,
    },
    {
      provide: SUPPORT_ACTION_REPOSITORY,
      useExisting: TypeormSupportActionRepository,
    },
    {
      provide: ACTION_EFFECT_PORT,
      useExisting: DeterministicActionEffectAdapter,
    },
    TypeormConversationRepository,
    DeterministicLlmProvider,
    {
      provide: CONVERSATION_REPOSITORY,
      useExisting: TypeormConversationRepository,
    },
    { provide: LLM_PROVIDER, useExisting: DeterministicLlmProvider },
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
