import type { LlmMessage } from './llm-provider.port';

export interface ConversationRecord {
  conversationId: string;
  userId: string;
  orderId: string | null;
  messages: LlmMessage[];
}
export interface ConversationRepository {
  findOwned(
    conversationId: string,
    userId: string,
  ): Promise<ConversationRecord | null>;
  create(userId: string, orderId: string | null): Promise<ConversationRecord>;
  appendTurn(
    conversationId: string,
    userId: string,
    userMessage: string,
    assistantMessage: string,
  ): Promise<void>;
}
export const CONVERSATION_REPOSITORY = Symbol('CONVERSATION_REPOSITORY');
