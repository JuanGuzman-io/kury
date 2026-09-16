import type { INestApplication } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import * as request from 'supertest';
import {
  createTestApp,
  getHttpServer,
  insertReferences,
} from '../support/test-app';

describe('order event concurrency', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  beforeAll(async () => ({ app, dataSource } = await createTestApp()));
  afterAll(async () => app.close());

  it('serializes simultaneous retries with one event ledger row', async () => {
    const suffix = `concurrency_${Date.now()}`;
    const { restaurantId } = await insertReferences(dataSource, suffix);
    const event = {
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
    const responses = await Promise.all(
      Array.from({ length: 4 }, () =>
        request(getHttpServer(app))
          .post('/api/v1/order-events')
          .set('X-Kuri-Role', 'SYSTEM')
          .send(event),
      ),
    );
    expect(
      responses.filter((response) => response.status === 201),
    ).toHaveLength(1);
    expect(
      responses.filter((response) => response.status === 200),
    ).toHaveLength(3);
    const count = await dataSource.query<{ count: number }[]>(
      'SELECT count(*)::int AS count FROM order_events WHERE event_id = $1',
      [event.event_id],
    );
    expect(count[0]?.count).toBe(1);
  });
});
