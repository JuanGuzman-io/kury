import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'conversations' })
@Index(['userId', 'updatedAt'])
export class ConversationEntity {
  @PrimaryColumn({ name: 'conversation_id', type: 'varchar', length: 64 })
  conversationId!: string;
  @Column({ name: 'user_id', type: 'varchar', length: 64 }) userId!: string;
  @Column({ name: 'order_id', type: 'varchar', length: 64, nullable: true })
  orderId!: string | null;
  @Column({ type: 'integer', default: 1 }) version!: number;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

@Entity({ name: 'messages' })
@Index(['conversationId', 'sequence'], { unique: true })
export class MessageEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'message_id' }) messageId!: string;
  @Column({ name: 'conversation_id', type: 'varchar', length: 64 })
  conversationId!: string;
  @Column({ type: 'integer' }) sequence!: number;
  @Column({ type: 'varchar', length: 16 }) role!: 'USER' | 'ASSISTANT';
  @Column({ type: 'text' }) content!: string;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

export const conversationEntities = [ConversationEntity, MessageEntity];
