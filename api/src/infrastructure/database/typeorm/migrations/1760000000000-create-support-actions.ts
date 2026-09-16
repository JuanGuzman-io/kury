import type { MigrationInterface, QueryRunner } from 'typeorm';
export class CreateSupportActions1760000000000 implements MigrationInterface {
  name = 'CreateSupportActions1760000000000';
  async up(q: QueryRunner): Promise<void> {
    await q.query(
      `CREATE TABLE support_action_effects (effect_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), idempotency_key varchar(160) NOT NULL UNIQUE, order_id varchar(64) NOT NULL, user_id varchar(64) NOT NULL, action varchar(32) NOT NULL, decision_status varchar(32) NOT NULL, policy_version varchar(64) NOT NULL, amount_cents bigint, provider_reference varchar(128), result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`,
    );
    await q.query(
      `CREATE TABLE support_approval_requests (approval_request_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), idempotency_key varchar(160) NOT NULL UNIQUE, order_id varchar(64) NOT NULL, user_id varchar(64) NOT NULL, action varchar(32) NOT NULL, policy_version varchar(64) NOT NULL, amount_cents bigint NOT NULL CHECK (amount_cents > 0), reason text NOT NULL CHECK (length(reason) BETWEEN 1 AND 4000), status varchar(16) NOT NULL DEFAULT 'PENDING', decision jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`,
    );
    await q.query(
      'CREATE INDEX support_effects_order_idx ON support_action_effects(order_id, created_at)',
    );
    await q.query(
      'CREATE INDEX support_approvals_status_idx ON support_approval_requests(status, created_at)',
    );
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query('DROP TABLE IF EXISTS support_approval_requests');
    await q.query('DROP TABLE IF EXISTS support_action_effects');
  }
}
