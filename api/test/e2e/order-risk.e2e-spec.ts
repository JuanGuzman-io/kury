import type { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import type { AtRiskOrderResponse } from '@kuri/contracts';
import { createTestApp, getHttpServer } from '../support/test-app';
import { insertOrderFixture } from '../support/order-query-fixtures';

describe('critical order risk flow', () => {
  let app: INestApplication;
  let orderId: string;

  beforeAll(async () => {
    ({ app } = await createTestApp());
    orderId = await insertOrderFixture(
      app.get(DataSource),
      `risk_e2e_${Date.now()}`,
      {
        status: 'PICKED_UP',
        promisedAt: new Date('2099-01-01T00:00:00Z'),
      },
    );
  });
  afterAll(async () => app.close());

  it('hands off from prioritized list to detail with risk explanation', async () => {
    const list = await request(getHttpServer(app))
      .get('/api/v1/orders/at-risk?page=1&limit=20')
      .set('X-Kuri-Role', 'OPS')
      .expect(200);
    const body = list.body as AtRiskOrderResponse;
    expect(body.data).toEqual(expect.any(Array));
    const detail = await request(getHttpServer(app))
      .get(`/api/v1/orders/${orderId}`)
      .set('X-Kuri-Role', 'OPS')
      .expect(200);
    expect(detail.body).toHaveProperty('risk.level');
    expect(JSON.stringify(detail.body)).not.toMatch(
      /phone|document_id|full_name/i,
    );
  });
});
