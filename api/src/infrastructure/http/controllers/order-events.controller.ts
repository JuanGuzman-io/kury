import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { IngestOrderEventUseCase } from '../../../application/orders/use-cases/ingest-order-event.use-case';
import { OrderDomainError } from '../../../domain/orders/errors/order-domain.error';
import {
  SimulatedRoleGuard,
  RequireKuriRoles,
} from '../guards/simulated-role.guard';
import { parseOrderEventInput } from '../dto/order-event.dto';

@Controller('api/v1/order-events')
@UseGuards(SimulatedRoleGuard)
export class OrderEventsController {
  constructor(private readonly ingest: IngestOrderEventUseCase) {}

  @Post()
  @RequireKuriRoles('SYSTEM')
  @HttpCode(201)
  async create(
    @Body() body: unknown,
    @Res({ passthrough: true }) response: Response,
  ): Promise<Record<string, unknown>> {
    const result = await this.ingest.execute(parseOrderEventInput(body));
    if (result.outcome === 'REJECTED_CONFLICT') {
      throw new OrderDomainError(
        result.reasonCode === 'TERMINAL_TRANSITION'
          ? 'TERMINAL_TRANSITION'
          : 'EVENT_ID_CONFLICT',
        'The event conflicts with trusted order history.',
        409,
      );
    }
    if (result.outcome === 'DUPLICATE') response.status(HttpStatus.OK);
    return {
      outcome: result.outcome,
      event_id: result.eventId,
      order_id: result.orderId,
      current_status: result.currentStatus,
      reason_code: result.reasonCode,
    };
  }
}
