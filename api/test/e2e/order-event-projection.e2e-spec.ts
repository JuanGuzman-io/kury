import type { INestApplication } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import * as request from 'supertest';
import {
  createTestApp,
  getHttpServer,
  insertReferences,
} from '../support/test-app';

describe('critical order projection flow', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let restaurantId: string;
  let courierId: string;
  const suffix = `projection_${Date.now()}`;
  const orderId = `ord_${suffix}`;
  const created = {
    event_id: `evt_${suffix}_created`,
    order_id: orderId,
    type: 'ORDER_CREATED',
    occurred_at: '2026-09-15T12:00:00Z',
    received_at: '2026-09-15T12:00:01Z',
    payload: {
      user_id: `usr_${suffix}`,
      city: 'BOG',
      restaurant_id: '',
      actor: 'USER',
      items: [{ sku: 'meal', name: 'Meal', quantity: 1, unit_price: 12.5 }],
      total_amount: 12.5,
      promised_at: '2026-09-15T12:45:00Z',
      weather: 'RAIN',
    },
  };

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
    ({ restaurantId, courierId } = await insertReferences(dataSource, suffix));
    created.payload.restaurant_id = restaurantId;
  });
  afterAll(async () => app.close());

  it('accepts creation, makes retries idempotent, and reconstructs out-of-order state', async () => {
    await request(getHttpServer(app))
      .post('/api/v1/order-events')
      .send(created)
      .expect(403);
    await request(getHttpServer(app))
      .post('/api/v1/order-events')
      .set('X-Kuri-Role', 'SYSTEM')
      .send(created)
      .expect(201)
      .expect({
        outcome: 'APPLIED',
        event_id: created.event_id,
        order_id: orderId,
        current_status: 'CREATED',
        reason_code: null,
      });
    await request(getHttpServer(app))
      .post('/api/v1/order-events')
      .set('X-Kuri-Role', 'SYSTEM')
      .send(created)
      .expect(200);
    await request(getHttpServer(app))
      .post('/api/v1/order-events')
      .set('X-Kuri-Role', 'SYSTEM')
      .send({
        event_id: `evt_${suffix}_assigned`,
        order_id: orderId,
        type: 'ORDER_STATUS_CHANGED',
        occurred_at: '2026-09-15T12:15:00Z',
        received_at: '2026-09-15T12:20:00Z',
        payload: {
          status: 'COURIER_ASSIGNED',
          actor: 'SYSTEM',
          courier_id: courierId,
        },
      })
      .expect(201)
      .expect('Content-Type', /json/);
    await request(getHttpServer(app))
      .post('/api/v1/order-events')
      .set('X-Kuri-Role', 'SYSTEM')
      .send({
        event_id: `evt_${suffix}_accepted`,
        order_id: orderId,
        type: 'ORDER_STATUS_CHANGED',
        occurred_at: '2026-09-15T12:10:00Z',
        received_at: '2026-09-15T12:21:00Z',
        payload: { status: 'ACCEPTED', actor: 'RESTAURANT' },
      })
      .expect(201);
    const response = await request(getHttpServer(app))
      .get(`/api/v1/orders/${orderId}`)
      .set('X-Kuri-Role', 'OPS')
      .expect(200);
    expect(response.body).toHaveProperty('current_status', 'COURIER_ASSIGNED');
    const body = response.body as { timeline: unknown[] };
    expect(body.timeline).toHaveLength(3);
  });
});
