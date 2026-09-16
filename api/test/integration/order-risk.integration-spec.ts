import type { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import type { DataSource } from 'typeorm';
import { createTestApp, getHttpServer } from '../support/test-app';
import { insertOrderFixture } from '../support/order-query-fixtures';

describe('order risk integration', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let orderId: string;

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
    orderId = await insertOrderFixture(dataSource, `risk_${Date.now()}`, {
      status: 'ACCEPTED',
      promisedAt: new Date('2099-01-01T00:00:00Z'),
    });
  });
  afterAll(async () => app.close());

  it('returns deterministic risk fields without mutating the projection', async () => {
    const before = await dataSource.query<{ projection_version: number }[]>(
      'SELECT projection_version FROM orders WHERE order_id = $1',
      [orderId],
    );
    const response = await request(getHttpServer(app))
      .get(`/api/v1/orders/${orderId}`)
      .set('X-Kuri-Role', 'OPS')
      .expect(200);
    expect(response.body).toHaveProperty('risk.level');
    expect(response.body).toHaveProperty('risk.score');
    expect(response.body).toHaveProperty('risk.reasons');
    const after = await dataSource.query<{ projection_version: number }[]>(
      'SELECT projection_version FROM orders WHERE order_id = $1',
      [orderId],
    );
    expect(after).toEqual(before);
  });
});
