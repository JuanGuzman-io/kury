import type { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import type { OrderListResponse } from '@kuri/contracts';
import { createTestApp, getHttpServer } from '../support/test-app';
import { insertOrderFixture } from '../support/order-query-fixtures';

describe('GET /api/v1/orders/{orderId} contract', () => {
  let app: INestApplication;
  let dataSource: Awaited<ReturnType<typeof createTestApp>>['dataSource'];
  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
    await insertOrderFixture(dataSource, `contract_${Date.now()}`);
  });
  afterAll(async () => app.close());

  it('enforces an authorized and valid lookup', async () => {
    await request(getHttpServer(app))
      .get('/api/v1/orders/not-found')
      .expect(403);
    await request(getHttpServer(app))
      .get('/api/v1/orders/not-found')
      .set('X-Kuri-Role', 'OPS')
      .expect(404)
      .expect((response) =>
        expect(response.body).toHaveProperty('code', 'ORDER_NOT_FOUND'),
      );
    await request(getHttpServer(app))
      .get('/api/v1/orders/bad%20id')
      .set('X-Kuri-Role', 'OPS')
      .expect(400);
  });

  it('returns a summarized paginated list with validated filters', async () => {
    const response = await request(getHttpServer(app))
      .get(
        '/api/v1/orders?city=BOG&status=ACCEPTED&delayed=false&page=1&limit=20',
      )
      .set('X-Kuri-Role', 'OPS')
      .expect(200);

    const body = response.body as unknown as OrderListResponse;
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('pagination');
    expect(body.pagination).toMatchObject({ page: 1, limit: 20 });
    expect(body.data[0]).not.toHaveProperty('timeline');
    expect(JSON.stringify(body)).not.toContain('document_id');
  });

  it('rejects invalid pagination and query enums', async () => {
    await request(getHttpServer(app))
      .get('/api/v1/orders?limit=101')
      .set('X-Kuri-Role', 'OPS')
      .expect(400);
    await request(getHttpServer(app))
      .get('/api/v1/orders?city=XXX')
      .set('X-Kuri-Role', 'OPS')
      .expect(400);
  });
});
