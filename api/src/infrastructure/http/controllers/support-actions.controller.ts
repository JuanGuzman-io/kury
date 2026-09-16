import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { SupportActionOrchestratorService } from '../../../application/support/services/support-action-orchestrator.service';
import { SupportActionRequestDto } from '../dto/support-action.dto';
import {
  RequireKuriRoles,
  SimulatedRoleGuard,
} from '../guards/simulated-role.guard';

@Controller('api/v1/support/actions')
@UseGuards(SimulatedRoleGuard)
@RequireKuriRoles('OPS', 'SYSTEM')
@ApiTags('Support actions')
export class SupportActionsController {
  constructor(private readonly actions: SupportActionOrchestratorService) {}
  @Post('evaluate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Evaluate a support action using R1-R7' })
  @ApiHeader({ name: 'X-Kuri-User-Id', required: true })
  @ApiBody({ type: SupportActionRequestDto })
  @ApiOkResponse({ description: 'Structured deterministic support decision.' })
  async evaluate(
    @Headers('x-kuri-user-id') userId: string | undefined,
    @Body() body: SupportActionRequestDto,
  ) {
    if (!userId)
      throw new BadRequestException('Trusted user context is required.');
    return this.actions.evaluate(userId, body);
  }
  @Post('execute')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Execute an allowed support action or create approval',
  })
  @ApiHeader({ name: 'X-Kuri-User-Id', required: true })
  @ApiBody({ type: SupportActionRequestDto })
  @ApiOkResponse({ description: 'Stable idempotent action result.' })
  async execute(
    @Headers('x-kuri-user-id') userId: string | undefined,
    @Body() body: SupportActionRequestDto,
  ) {
    if (!userId)
      throw new BadRequestException('Trusted user context is required.');
    return this.actions.execute(userId, body);
  }
}
