import type { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import type { OrderDetailResponse, OrderListResponse } from '@kuri/contracts';
import { createTestApp, getHttpServer } from '../support/test-app';
import { insertOrderFixture } from '../support/order-query-fixtures';

describe('critical order query flow', () => {
  let app: INestApplication;
  let dataSource: Awaited<ReturnType<typeof createTestApp>>['dataSource'];
  let orderId: string;

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
    orderId = await insertOrderFixture(dataSource, `e2e_${Date.now()}`, {
      status: 'PICKED_UP',
      promisedAt: new Date('2020-01-01T00:00:00Z'),
      courier: false,
    });
  });

  afterAll(async () => app.close());

  it('reads detail safely and rejects unauthorized access', async () => {
    await request(getHttpServer(app))
      .get(`/api/v1/orders/${orderId}`)
      .expect(403);
    const response = await request(getHttpServer(app))
      .get(`/api/v1/orders/${orderId}`)
      .set('X-Kuri-Role', 'OPS')
      .expect(200);
    const detail = response.body as unknown as OrderDetailResponse;
    expect(detail).toMatchObject({
      order_id: orderId,
      current_status: 'PICKED_UP',
      courier_id: null,
      restaurant: { name: 'Restaurant test' },
    });
    expect(detail.timeline[0]?.occurred_at).toBe('2026-09-15T12:10:00.000Z');
    expect(JSON.stringify(detail)).not.toContain('phone');
    expect(JSON.stringify(detail)).not.toContain('document_id');
  });

  it('lists summarized pages with filters and pagination metadata', async () => {
    const response = await request(getHttpServer(app))
      .get('/api/v1/orders?status=PICKED_UP&delayed=true&page=1&limit=1')
      .set('X-Kuri-Role', 'OPS')
      .expect(200);
    const body = response.body as unknown as OrderListResponse;
    expect(body.pagination).toMatchObject({ page: 1, limit: 1 });
    expect(body.data[0]).toMatchObject({
      order_id: orderId,
      current_status: 'PICKED_UP',
      delayed: true,
    });
    expect(body.data[0]).not.toHaveProperty('timeline');
  });

  it('returns an empty valid page beyond the result set', async () => {
    const response = await request(getHttpServer(app))
      .get('/api/v1/orders?page=999&limit=20')
      .set('X-Kuri-Role', 'OPS')
      .expect(200);
    const body = response.body as unknown as OrderListResponse;
    expect(body.data).toEqual([]);
    expect(body.pagination).toMatchObject({ page: 999, limit: 20 });
  });

  it('publishes the local OpenAPI documentation', async () => {
    await request(getHttpServer(app)).get('/docs-json').expect(200);
  });
});
