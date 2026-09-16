import type { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp, getHttpServer } from '../support/test-app';

describe('GET /api/v1/orders/{orderId} contract', () => {
  let app: INestApplication;
  beforeAll(async () => ({ app } = await createTestApp()));
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
});
