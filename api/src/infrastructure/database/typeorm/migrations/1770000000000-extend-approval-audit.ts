import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ExtendApprovalAudit1770000000000 implements MigrationInterface {
  name = 'ExtendApprovalAudit1770000000000';
  async up(q: QueryRunner): Promise<void> {
    await q.query(
      'ALTER TABLE support_approval_requests ADD COLUMN IF NOT EXISTS conversation_id varchar(64)',
    );
    await q.query(
      'ALTER TABLE support_approval_requests ADD COLUMN IF NOT EXISTS context_fingerprint varchar(128)',
    );
    await q.query(
      'ALTER TABLE support_approval_requests ADD COLUMN IF NOT EXISTS resolved_at timestamptz',
    );
    await q.query(
      'ALTER TABLE support_approval_requests ADD COLUMN IF NOT EXISTS resolved_by varchar(64)',
    );
    await q.query(
      'CREATE TABLE audit_trace_records (trace_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), type varchar(32) NOT NULL, conversation_id varchar(64), order_id varchar(64), payload jsonb NOT NULL, occurred_at timestamptz NOT NULL DEFAULT now())',
    );
    await q.query(
      'CREATE INDEX audit_trace_conversation_idx ON audit_trace_records(conversation_id, occurred_at)',
    );
    await q.query(
      'CREATE INDEX audit_trace_order_idx ON audit_trace_records(order_id, occurred_at)',
    );
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query('DROP TABLE IF EXISTS audit_trace_records');
    await q.query(
      'ALTER TABLE support_approval_requests DROP COLUMN IF EXISTS resolved_by',
    );
    await q.query(
      'ALTER TABLE support_approval_requests DROP COLUMN IF EXISTS resolved_at',
    );
    await q.query(
      'ALTER TABLE support_approval_requests DROP COLUMN IF EXISTS context_fingerprint',
    );
    await q.query(
      'ALTER TABLE support_approval_requests DROP COLUMN IF EXISTS conversation_id',
    );
  }
}
