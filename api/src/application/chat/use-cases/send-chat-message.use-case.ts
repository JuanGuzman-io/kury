import { Injectable } from '@nestjs/common';
import {
  ChatOrchestratorService,
  type ChatCommand,
  type ChatResult,
} from '../services/chat-orchestrator.service';

@Injectable()
export class SendChatMessageUseCase {
  constructor(private readonly chat: ChatOrchestratorService) {}
  execute(command: ChatCommand): Promise<ChatResult> {
    return this.chat.execute(command);
  }
}
