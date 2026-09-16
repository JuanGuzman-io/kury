import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderQueryIndexes1740000000000 implements MigrationInterface {
  name = 'AddOrderQueryIndexes1740000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE INDEX orders_created_order_idx ON orders(created_at DESC, order_id ASC)',
    );
    await queryRunner.query(
      'CREATE INDEX orders_city_status_idx ON orders(city, current_status)',
    );
    await queryRunner.query(
      'CREATE INDEX orders_promised_status_idx ON orders(promised_at, current_status)',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS orders_promised_status_idx');
    await queryRunner.query('DROP INDEX IF EXISTS orders_city_status_idx');
    await queryRunner.query('DROP INDEX IF EXISTS orders_created_order_idx');
  }
}
