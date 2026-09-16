import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateConversations1750000000000 implements MigrationInterface {
  name = 'CreateConversations1750000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
    await queryRunner.query(`CREATE TABLE conversations (
      conversation_id varchar(64) PRIMARY KEY,
      user_id varchar(64) NOT NULL,
      order_id varchar(64),
      version integer NOT NULL DEFAULT 1,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`);
    await queryRunner.query(`CREATE TABLE messages (
      message_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id varchar(64) NOT NULL REFERENCES conversations(conversation_id) ON DELETE CASCADE,
      sequence integer NOT NULL CHECK (sequence > 0),
      role varchar(16) NOT NULL CHECK (role IN ('USER', 'ASSISTANT')),
      content text NOT NULL CHECK (length(content) BETWEEN 1 AND 4000),
      created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT messages_conversation_sequence_unique UNIQUE (conversation_id, sequence)
    )`);
    await queryRunner.query(
      'CREATE INDEX conversations_user_updated_idx ON conversations(user_id, updated_at)',
    );
    await queryRunner.query(
      'CREATE INDEX messages_conversation_sequence_idx ON messages(conversation_id, sequence)',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS messages');
    await queryRunner.query('DROP TABLE IF EXISTS conversations');
  }
}
