import type { INestApplication } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import * as request from 'supertest';
import {
  createTestApp,
  getHttpServer,
  insertReferences,
} from '../support/test-app';

describe('POST /api/v1/order-events contract', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  beforeAll(async () => ({ app, dataSource } = await createTestApp()));
  afterAll(async () => app.close());

  it('enforces role, strict shape, and explicit validation errors', async () => {
    const suffix = `contract_${Date.now()}`;
    const { restaurantId } = await insertReferences(dataSource, suffix);
    const valid = {
      event_id: `evt_${suffix}`,
      order_id: `ord_${suffix}`,
      type: 'ORDER_CREATED',
      occurred_at: '2026-09-15T12:00:00Z',
      received_at: '2026-09-15T12:00:01Z',
      payload: {
        user_id: `usr_${suffix}`,
        city: 'BOG',
        restaurant_id: restaurantId,
        actor: 'USER',
        items: [{ sku: 'meal', name: 'Meal', quantity: 1, unit_price: 10 }],
        total_amount: 10,
        promised_at: '2026-09-15T12:30:00Z',
        weather: 'CLEAR',
      },
    };
    await request(getHttpServer(app))
      .post('/api/v1/order-events')
      .send(valid)
      .expect(403);
    await request(getHttpServer(app))
      .post('/api/v1/order-events')
      .set('X-Kuri-Role', 'SYSTEM')
      .send({ ...valid, unexpected: true })
      .expect(400)
      .expect((response) =>
        expect(response.body).toHaveProperty('code', 'VALIDATION_ERROR'),
      );
    await request(getHttpServer(app))
      .post('/api/v1/order-events')
      .set('X-Kuri-Role', 'SYSTEM')
      .send(valid)
      .expect(201);
  });
});
