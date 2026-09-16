import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import type { ConversationRecord } from '../../../../application/chat/ports/conversation-repository.port';
import {
  ConversationEntity,
  MessageEntity,
} from '../entities/conversation.entities';

@Injectable()
export class TypeormConversationRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findOwned(
    conversationId: string,
    userId: string,
  ): Promise<ConversationRecord | null> {
    const conversation = await this.dataSource
      .getRepository(ConversationEntity)
      .findOne({ where: { conversationId, userId } });
    if (!conversation) return null;
    const messages = await this.dataSource
      .getRepository(MessageEntity)
      .find({ where: { conversationId }, order: { sequence: 'ASC' } });
    return {
      conversationId,
      userId,
      orderId: conversation.orderId,
      messages: messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    };
  }

  async create(
    userId: string,
    orderId: string | null,
  ): Promise<ConversationRecord> {
    const conversationId = `conv_${randomUUID().replaceAll('-', '')}`;
    await this.dataSource
      .getRepository(ConversationEntity)
      .save({ conversationId, userId, orderId, version: 1 });
    return { conversationId, userId, orderId, messages: [] };
  }

  async appendTurn(
    conversationId: string,
    userId: string,
    userMessage: string,
    assistantMessage: string,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const conversation = await manager.findOne(ConversationEntity, {
        where: { conversationId, userId },
      });
      if (!conversation) throw new Error('CONVERSATION_NOT_FOUND');
      const last = await manager.findOne(MessageEntity, {
        where: { conversationId },
        order: { sequence: 'DESC' },
        lock: { mode: 'pessimistic_write' },
      });
      const next = (last?.sequence ?? 0) + 1;
      await manager.save(MessageEntity, [
        { conversationId, sequence: next, role: 'USER', content: userMessage },
        {
          conversationId,
          sequence: next + 1,
          role: 'ASSISTANT',
          content: assistantMessage,
        },
      ]);
      conversation.version += 1;
      await manager.save(ConversationEntity, conversation);
    });
  }
}
