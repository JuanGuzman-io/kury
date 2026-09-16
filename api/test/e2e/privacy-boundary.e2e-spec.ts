import type { INestApplication } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import * as request from 'supertest';
import {
  createTestApp,
  getHttpServer,
  insertReferences,
} from '../support/test-app';

describe('critical order query privacy boundary', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => ({ app, dataSource } = await createTestApp()));
  afterAll(async () => app.close());

  it('never serializes courier personal data', async () => {
    const suffix = `privacy_${Date.now()}`;
    const { restaurantId, courierId } = await insertReferences(
      dataSource,
      suffix,
    );
    const orderId = `ord_${suffix}`;
    await request(getHttpServer(app))
      .post('/api/v1/order-events')
      .set('X-Kuri-Role', 'SYSTEM')
      .send({
        event_id: `evt_${suffix}_created`,
        order_id: orderId,
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
      })
      .expect(201);
    await request(getHttpServer(app))
      .post('/api/v1/order-events')
      .set('X-Kuri-Role', 'SYSTEM')
      .send({
        event_id: `evt_${suffix}_accepted`,
        order_id: orderId,
        type: 'ORDER_STATUS_CHANGED',
        occurred_at: '2026-09-15T12:05:00Z',
        received_at: '2026-09-15T12:05:01Z',
        payload: { status: 'ACCEPTED', actor: 'RESTAURANT' },
      })
      .expect(201);
    await request(getHttpServer(app))
      .post('/api/v1/order-events')
      .set('X-Kuri-Role', 'SYSTEM')
      .send({
        event_id: `evt_${suffix}_assigned`,
        order_id: orderId,
        type: 'ORDER_STATUS_CHANGED',
        occurred_at: '2026-09-15T12:10:00Z',
        received_at: '2026-09-15T12:10:01Z',
        payload: {
          status: 'COURIER_ASSIGNED',
          actor: 'SYSTEM',
          courier_id: courierId,
        },
      })
      .expect(201);
    const response = await request(getHttpServer(app))
      .get(`/api/v1/orders/${orderId}`)
      .set('X-Kuri-Role', 'OPS')
      .expect(200);
    expect(JSON.stringify(response.body)).not.toContain('Courier private');
    expect(JSON.stringify(response.body)).not.toContain('+570000000');
    expect(response.body).toHaveProperty('courier_id', courierId);
  });
});
