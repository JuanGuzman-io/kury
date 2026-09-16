import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditTraceService } from '../../../application/audit/services/audit-trace.service';
import { AuditTraceQueryDto } from '../dto/audit-trace.dto';
import {
  RequireKuriRoles,
  SimulatedRoleGuard,
} from '../guards/simulated-role.guard';

@Controller('api/v1/traces')
@UseGuards(SimulatedRoleGuard)
@RequireKuriRoles('OPS')
@ApiTags('Audit traces')
export class AuditTraceController {
  constructor(private readonly traces: AuditTraceService) {}

  @Get('conversations/:conversationId')
  @ApiOperation({ summary: 'List a redacted conversation trace' })
  conversation(
    @Param('conversationId') id: string,
    @Query() query: AuditTraceQueryDto,
  ) {
    return this.traces.list('conversation', id, query.page, query.limit);
  }

  @Get('orders/:orderId')
  @ApiOperation({ summary: 'List a redacted order trace' })
  order(@Param('orderId') id: string, @Query() query: AuditTraceQueryDto) {
    return this.traces.list('order', id, query.page, query.limit);
  }
}
