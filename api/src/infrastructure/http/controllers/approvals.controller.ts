import {
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApprovalService } from '../../../application/audit/services/approval.service';
import { ApprovalQueryDto } from '../dto/approval.dto';
import {
  RequireKuriRoles,
  SimulatedRoleGuard,
} from '../guards/simulated-role.guard';

@Controller('api/v1/approvals')
@UseGuards(SimulatedRoleGuard)
@RequireKuriRoles('OPS')
@ApiTags('Approvals')
export class ApprovalsController {
  constructor(private readonly approvals: ApprovalService) {}

  @Get()
  @ApiOperation({ summary: 'List redacted approval requests' })
  @ApiHeader({ name: 'X-Kuri-Role', required: true })
  @ApiOkResponse({ description: 'Paginated approval queue.' })
  list(@Query() query: ApprovalQueryDto) {
    return this.approvals.list(query.status, query.page, query.limit);
  }

  @Post(':approvalRequestId/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve and execute a pending support action' })
  approve(
    @Param('approvalRequestId') id: string,
    @Headers('x-kuri-user-id') resolver = 'ops',
  ) {
    return this.approvals.resolve(id, resolver, 'APPROVE');
  }

  @Post(':approvalRequestId/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a pending support action' })
  reject(
    @Param('approvalRequestId') id: string,
    @Headers('x-kuri-user-id') resolver = 'ops',
  ) {
    return this.approvals.resolve(id, resolver, 'REJECT');
  }
}
