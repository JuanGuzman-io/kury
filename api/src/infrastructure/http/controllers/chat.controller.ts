import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { SendChatMessageUseCase } from '../../../application/chat/use-cases/send-chat-message.use-case';
import { ChatRequestDto, ChatResponseDto } from '../dto/chat.dto';
import {
  RequireKuriRoles,
  SimulatedRoleGuard,
} from '../guards/simulated-role.guard';

@Controller('api/v1/chat')
@UseGuards(SimulatedRoleGuard)
@RequireKuriRoles('SYSTEM', 'OPS')
@ApiTags('Chat')
@Throttle({ default: { limit: 30, ttl: 60_000 } })
export class ChatController {
  constructor(private readonly sendMessage: SendChatMessageUseCase) {}

  @Post()
  @ApiOperation({ summary: 'Send a support chat message' })
  @ApiHeader({
    name: 'X-Kuri-Role',
    required: true,
    description: 'Simulated authorization role: OPS or SYSTEM.',
  })
  @ApiHeader({
    name: 'X-Kuri-User-Id',
    required: true,
    description:
      'Trusted simulated user identity. Body user_id is informational only.',
  })
  @ApiBody({ type: ChatRequestDto })
  @ApiOkResponse({ type: ChatResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Missing or invalid trusted user context.',
  })
  @ApiResponse({ status: 429, description: 'Chat rate limit exceeded.' })
  async send(
    @Headers('x-kuri-user-id') userId: string | undefined,
    @Body() body: ChatRequestDto,
  ): Promise<ChatResponseDto> {
    if (!userId)
      throw new BadRequestException('Trusted user context is required.');
    return this.sendMessage.execute({
      conversationId: body.conversation_id,
      userId,
      bodyUserId: body.user_id,
      orderId: body.order_id,
      message: body.message,
    });
  }
}
