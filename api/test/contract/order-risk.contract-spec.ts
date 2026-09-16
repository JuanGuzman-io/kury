import type { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp, getHttpServer } from '../support/test-app';

describe('GET /api/v1/orders/at-risk contract', () => {
  let app: INestApplication;

  beforeAll(async () => ({ app } = await createTestApp()));
  afterAll(async () => app.close());

  it('enforces role and bounded query parameters', async () => {
    await request(getHttpServer(app)).get('/api/v1/orders/at-risk').expect(403);
    await request(getHttpServer(app))
      .get('/api/v1/orders/at-risk?limit=101')
      .set('X-Kuri-Role', 'OPS')
      .expect(400)
      .expect((response) =>
        expect(response.body).toHaveProperty('code', 'VALIDATION_ERROR'),
      );
  });
});
