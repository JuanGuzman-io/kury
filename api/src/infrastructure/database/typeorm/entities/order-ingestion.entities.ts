import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'restaurants' })
export class RestaurantEntity {
  @PrimaryColumn({ name: 'restaurant_id', type: 'varchar', length: 64 })
  restaurantId!: string;
  @Column({ type: 'varchar', length: 256 }) name!: string;
  @Column({ type: 'varchar', length: 3 }) city!: string;
  @Column('double precision') latitude!: number;
  @Column('double precision') longitude!: number;
  @Column({ name: 'avg_prep_minutes', type: 'integer' })
  avgPrepMinutes!: number;
  @Column({ type: 'numeric', precision: 2, scale: 1 }) rating!: string;
}

@Entity({ name: 'couriers' })
export class CourierEntity {
  @PrimaryColumn({ name: 'courier_id', type: 'varchar', length: 64 })
  courierId!: string;
  @Column({ name: 'full_name', type: 'varchar', length: 256 })
  fullName!: string;
  @Column({ type: 'varchar', length: 32 }) phone!: string;
  @Column({ name: 'document_id', type: 'varchar', length: 64, unique: true })
  documentId!: string;
  @Column({ type: 'varchar', length: 32 }) vehicle!: string;
  @Column({ type: 'varchar', length: 3 }) city!: string;
  @Column({ type: 'numeric', precision: 2, scale: 1 }) rating!: string;
}

@Entity({ name: 'orders' })
@Index(['currentStatus'])
@Index(['city'])
export class OrderEntity {
  @PrimaryColumn({ name: 'order_id', type: 'varchar', length: 64 })
  orderId!: string;
  @Column({ name: 'user_id', type: 'varchar', length: 64 }) userId!: string;
  @Column({ type: 'varchar', length: 3 }) city!: string;
  @Column({ name: 'restaurant_id', type: 'varchar', length: 64 })
  restaurantId!: string;
  @Column({ name: 'courier_id', type: 'varchar', length: 64, nullable: true })
  courierId!: string | null;
  @Column({ name: 'current_status', type: 'varchar', length: 32 })
  currentStatus!: string;
  @Column({ name: 'current_event_id', type: 'varchar', length: 64 })
  currentEventId!: string;
  @Column({ name: 'status_occurred_at', type: 'timestamptz' })
  statusOccurredAt!: Date;
  @Column({ name: 'promised_at', type: 'timestamptz' }) promisedAt!: Date;
  @Column({ type: 'varchar', length: 16 }) weather!: string;
  @Column({ name: 'total_amount_cents', type: 'bigint' })
  totalAmountCents!: string;
  @Column({ name: 'projection_version', type: 'integer', default: 1 })
  projectionVersion!: number;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

@Entity({ name: 'order_items' })
export class OrderItemEntity {
  @PrimaryColumn({ name: 'order_id', type: 'varchar', length: 64 })
  orderId!: string;
  @PrimaryColumn({ name: 'line_number', type: 'smallint' }) lineNumber!: number;
  @Column({ type: 'varchar', length: 128 }) sku!: string;
  @Column({ type: 'varchar', length: 256 }) name!: string;
  @Column({ type: 'integer' }) quantity!: number;
  @Column({ name: 'unit_price_cents', type: 'bigint' }) unitPriceCents!: string;
}

@Entity({ name: 'order_events' })
@Index(['orderId', 'occurredAt', 'ingestionSequence'])
export class OrderEventEntity {
  @PrimaryColumn({ name: 'event_id', type: 'varchar', length: 64 })
  eventId!: string;
  @Index()
  @Column({ name: 'order_id', type: 'varchar', length: 64 })
  orderId!: string;
  @Column({ name: 'event_type', type: 'varchar', length: 32 })
  eventType!: string;
  @Column({ type: 'varchar', length: 32, nullable: true }) status!:
    string | null;
  @Column({ name: 'occurred_at', type: 'timestamptz' }) occurredAt!: Date;
  @Column({ name: 'received_at', type: 'timestamptz' }) receivedAt!: Date;
  @Column({ type: 'varchar', length: 32 }) actor!: string;
  @Column({ name: 'courier_id', type: 'varchar', length: 64, nullable: true })
  courierId!: string | null;
  @Column({
    name: 'cancel_reason',
    type: 'varchar',
    length: 128,
    nullable: true,
  })
  cancelReason!: string | null;
  @Column({ type: 'jsonb' }) payload!: Record<string, unknown>;
  @Column({ name: 'content_hash', type: 'char', length: 64 })
  contentHash!: string;
  @Column({
    name: 'processing_outcome',
    type: 'varchar',
    length: 32,
    default: 'PENDING_SEQUENCE',
  })
  processingOutcome!: string;
  @Column({
    name: 'rejection_code',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  rejectionCode!: string | null;
  @Column({
    name: 'ingestion_sequence',
    type: 'bigint',
    generated: 'increment',
  })
  ingestionSequence!: string;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
  @Column({ name: 'processed_at', type: 'timestamptz', nullable: true })
  processedAt!: Date | null;
}

@Entity({ name: 'load_runs' })
export class LoadRunEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'load_run_id' }) loadRunId!: string;
  @Column({ name: 'source_fingerprint', type: 'char', length: 64 })
  sourceFingerprint!: string;
  @Column({ type: 'bigint', nullable: true }) seed!: string | null;
  @Column({ type: 'varchar', length: 16 }) status!: string;
  @Column({ name: 'total_events', type: 'integer', default: 0 })
  totalEvents!: number;
  @Column({ name: 'applied_count', type: 'integer', default: 0 })
  appliedCount!: number;
  @Column({ name: 'pending_count', type: 'integer', default: 0 })
  pendingCount!: number;
  @Column({ name: 'historical_count', type: 'integer', default: 0 })
  historicalCount!: number;
  @Column({ name: 'duplicate_count', type: 'integer', default: 0 })
  duplicateCount!: number;
  @Column({ name: 'rejected_count', type: 'integer', default: 0 })
  rejectedCount!: number;
  @CreateDateColumn({ name: 'started_at', type: 'timestamptz' })
  startedAt!: Date;
  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt!: Date | null;
  @Column({ name: 'failure_summary', type: 'text', nullable: true })
  failureSummary!: string | null;
}

@Entity({ name: 'ingestion_attempts' })
export class IngestionAttemptEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'attempt_id' }) attemptId!: string;
  @Column({ name: 'load_run_id', type: 'uuid', nullable: true }) loadRunId!:
    string | null;
  @Index()
  @Column({ name: 'event_id', type: 'varchar', length: 64 })
  eventId!: string;
  @Column({ name: 'order_id', type: 'varchar', length: 64, nullable: true })
  orderId!: string | null;
  @Column({ name: 'content_hash', type: 'char', length: 64, nullable: true })
  contentHash!: string | null;
  @Column({ type: 'varchar', length: 32 }) outcome!: string;
  @Column({ name: 'reason_code', type: 'varchar', length: 64, nullable: true })
  reasonCode!: string | null;
  @Column({ type: 'jsonb', nullable: true }) details!: Record<
    string,
    unknown
  > | null;
  @CreateDateColumn({ name: 'attempted_at', type: 'timestamptz' })
  attemptedAt!: Date;
}

export const orderIngestionEntities = [
  RestaurantEntity,
  CourierEntity,
  OrderEntity,
  OrderItemEntity,
  OrderEventEntity,
  LoadRunEntity,
  IngestionAttemptEntity,
];
