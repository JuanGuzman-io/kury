import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'audit_trace_records' })
@Index(['conversationId', 'occurredAt'])
@Index(['orderId', 'occurredAt'])
export class AuditTraceEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'trace_id' }) traceId!: string;
  @Column({ type: 'varchar', length: 32 }) type!: string;
  @Column({
    name: 'conversation_id',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  conversationId!: string | null;
  @Column({ name: 'order_id', type: 'varchar', length: 64, nullable: true })
  orderId!: string | null;
  @Column({ type: 'jsonb' }) payload!: Record<string, unknown>;
  @CreateDateColumn({ name: 'occurred_at', type: 'timestamptz' })
  occurredAt!: Date;
}

export const approvalAuditEntities = [AuditTraceEntity];
