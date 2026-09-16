import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'support_action_effects' })
@Index(['idempotencyKey'], { unique: true })
export class SupportActionEffectEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'effect_id' }) effectId!: string;
  @Column({ name: 'idempotency_key', type: 'varchar', length: 160 })
  idempotencyKey!: string;
  @Column({ name: 'order_id', type: 'varchar', length: 64 }) orderId!: string;
  @Column({ name: 'user_id', type: 'varchar', length: 64 }) userId!: string;
  @Column({ type: 'varchar', length: 32 }) action!: string;
  @Column({ name: 'decision_status', type: 'varchar', length: 32 })
  decisionStatus!: string;
  @Column({ name: 'policy_version', type: 'varchar', length: 64 })
  policyVersion!: string;
  @Column({ name: 'amount_cents', type: 'bigint', nullable: true })
  amountCents!: string | null;
  @Column({
    name: 'provider_reference',
    type: 'varchar',
    length: 128,
    nullable: true,
  })
  providerReference!: string | null;
  @Column({ type: 'jsonb' }) result!: Record<string, unknown>;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

@Entity({ name: 'support_approval_requests' })
@Index(['idempotencyKey'], { unique: true })
export class SupportApprovalRequestEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'approval_request_id' })
  approvalRequestId!: string;
  @Column({ name: 'idempotency_key', type: 'varchar', length: 160 })
  idempotencyKey!: string;
  @Column({ name: 'order_id', type: 'varchar', length: 64 }) orderId!: string;
  @Column({ name: 'user_id', type: 'varchar', length: 64 }) userId!: string;
  @Column({ type: 'varchar', length: 32 }) action!: string;
  @Column({ name: 'policy_version', type: 'varchar', length: 64 })
  policyVersion!: string;
  @Column({ name: 'amount_cents', type: 'bigint' }) amountCents!: string;
  @Column({ type: 'text' }) reason!: string;
  @Column({ type: 'varchar', length: 16, default: 'PENDING' }) status!: string;
  @Column({ type: 'jsonb' }) decision!: Record<string, unknown>;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
export const supportActionEntities = [
  SupportActionEffectEntity,
  SupportApprovalRequestEntity,
];
