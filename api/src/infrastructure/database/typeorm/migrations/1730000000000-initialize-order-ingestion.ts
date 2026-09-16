import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitializeOrderIngestion1730000000000 implements MigrationInterface {
  name = 'InitializeOrderIngestion1730000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE restaurants (
        restaurant_id varchar(64) PRIMARY KEY,
        name varchar(256) NOT NULL,
        city varchar(3) NOT NULL CHECK (city IN ('BOG', 'MEX', 'LIM')),
        latitude double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
        longitude double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
        avg_prep_minutes integer NOT NULL CHECK (avg_prep_minutes > 0),
        rating numeric(2,1) NOT NULL CHECK (rating BETWEEN 0 AND 5)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE couriers (
        courier_id varchar(64) PRIMARY KEY,
        full_name varchar(256) NOT NULL,
        phone varchar(32) NOT NULL,
        document_id varchar(64) NOT NULL UNIQUE,
        vehicle varchar(32) NOT NULL,
        city varchar(3) NOT NULL CHECK (city IN ('BOG', 'MEX', 'LIM')),
        rating numeric(2,1) NOT NULL CHECK (rating BETWEEN 0 AND 5)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE orders (
        order_id varchar(64) PRIMARY KEY,
        user_id varchar(64) NOT NULL,
        city varchar(3) NOT NULL CHECK (city IN ('BOG', 'MEX', 'LIM')),
        restaurant_id varchar(64) NOT NULL REFERENCES restaurants(restaurant_id),
        courier_id varchar(64) NULL REFERENCES couriers(courier_id),
        current_status varchar(32) NOT NULL CHECK (current_status IN ('CREATED', 'ACCEPTED', 'COURIER_ASSIGNED', 'PICKED_UP', 'DELIVERED', 'CANCELLED')),
        current_event_id varchar(64) NOT NULL,
        status_occurred_at timestamptz NOT NULL,
        promised_at timestamptz NOT NULL,
        weather varchar(16) NOT NULL CHECK (weather IN ('CLEAR', 'RAIN', 'STORM')),
        total_amount_cents bigint NOT NULL CHECK (total_amount_cents >= 0),
        projection_version integer NOT NULL DEFAULT 1 CHECK (projection_version > 0),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE order_items (
        order_id varchar(64) NOT NULL REFERENCES orders(order_id),
        line_number smallint NOT NULL CHECK (line_number > 0),
        sku varchar(128) NOT NULL,
        name varchar(256) NOT NULL,
        quantity integer NOT NULL CHECK (quantity > 0),
        unit_price_cents bigint NOT NULL CHECK (unit_price_cents >= 0),
        PRIMARY KEY (order_id, line_number)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE order_events (
        event_id varchar(64) PRIMARY KEY,
        order_id varchar(64) NOT NULL,
        event_type varchar(32) NOT NULL CHECK (event_type IN ('ORDER_CREATED', 'ORDER_STATUS_CHANGED')),
        status varchar(32) NULL CHECK (status IS NULL OR status IN ('CREATED', 'ACCEPTED', 'COURIER_ASSIGNED', 'PICKED_UP', 'DELIVERED', 'CANCELLED')),
        occurred_at timestamptz NOT NULL,
        received_at timestamptz NOT NULL,
        actor varchar(32) NOT NULL CHECK (actor IN ('USER', 'RESTAURANT', 'COURIER', 'SYSTEM', 'OPS')),
        courier_id varchar(64) NULL,
        cancel_reason varchar(128) NULL,
        payload jsonb NOT NULL,
        content_hash char(64) NOT NULL,
        processing_outcome varchar(32) NOT NULL CHECK (processing_outcome IN ('APPLIED', 'HISTORICAL', 'PENDING_SEQUENCE', 'REJECTED_CONFLICT')),
        rejection_code varchar(64) NULL,
        ingestion_sequence bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
        created_at timestamptz NOT NULL DEFAULT now(),
        processed_at timestamptz NULL,
        CHECK ((event_type = 'ORDER_CREATED' AND status IS NULL) OR (event_type = 'ORDER_STATUS_CHANGED' AND status IS NOT NULL))
      )
    `);
    await queryRunner.query(
      'CREATE INDEX order_events_timeline_idx ON order_events(order_id, occurred_at, ingestion_sequence)',
    );
    await queryRunner.query(
      'CREATE INDEX orders_status_idx ON orders(current_status)',
    );
    await queryRunner.query('CREATE INDEX orders_city_idx ON orders(city)');
    await queryRunner.query(`
      CREATE TABLE load_runs (
        load_run_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        source_fingerprint char(64) NOT NULL,
        seed bigint NULL,
        status varchar(16) NOT NULL CHECK (status IN ('RUNNING', 'COMPLETED', 'FAILED')),
        total_events integer NOT NULL DEFAULT 0 CHECK (total_events >= 0),
        applied_count integer NOT NULL DEFAULT 0 CHECK (applied_count >= 0),
        pending_count integer NOT NULL DEFAULT 0 CHECK (pending_count >= 0),
        historical_count integer NOT NULL DEFAULT 0 CHECK (historical_count >= 0),
        duplicate_count integer NOT NULL DEFAULT 0 CHECK (duplicate_count >= 0),
        rejected_count integer NOT NULL DEFAULT 0 CHECK (rejected_count >= 0),
        started_at timestamptz NOT NULL DEFAULT now(),
        completed_at timestamptz NULL,
        failure_summary text NULL
      )
    `);
    await queryRunner.query(`
      CREATE TABLE ingestion_attempts (
        attempt_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        load_run_id uuid NULL REFERENCES load_runs(load_run_id),
        event_id varchar(64) NOT NULL,
        order_id varchar(64) NULL,
        content_hash char(64) NULL,
        outcome varchar(32) NOT NULL,
        reason_code varchar(64) NULL,
        details jsonb NULL,
        attempted_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      'CREATE INDEX ingestion_attempts_event_idx ON ingestion_attempts(event_id)',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS ingestion_attempts');
    await queryRunner.query('DROP TABLE IF EXISTS load_runs');
    await queryRunner.query('DROP TABLE IF EXISTS order_events');
    await queryRunner.query('DROP TABLE IF EXISTS order_items');
    await queryRunner.query('DROP TABLE IF EXISTS orders');
    await queryRunner.query('DROP TABLE IF EXISTS couriers');
    await queryRunner.query('DROP TABLE IF EXISTS restaurants');
  }
}
