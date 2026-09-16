/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import type { INestApplication } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import * as request from 'supertest';
import { SupportActionEffectEntity } from '../../src/infrastructure/database/typeorm/entities/support-action.entities';
import { OrderEntity } from '../../src/infrastructure/database/typeorm/entities/order-ingestion.entities';
import {
  createTestApp,
  getHttpServer,
  insertReferences,
} from '../support/test-app';

describe('critical support action flow', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let orderId: string;
  const suffix = `support_${Date.now()}`;
  const userId = `usr_query_${suffix}`;

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
    const { restaurantId } = await insertReferences(dataSource, suffix);
    orderId = `ord_${suffix}`;
    await request(getHttpServer(app))
      .post('/api/v1/order-events')
      .set('X-Kuri-Role', 'SYSTEM')
      .send({
        event_id: `evt_${suffix}`,
        order_id: orderId,
        type: 'ORDER_CREATED',
        occurred_at: '2026-09-16T12:00:00Z',
        received_at: '2026-09-16T12:00:01Z',
        payload: {
          user_id: userId,
          city: 'BOG',
          restaurant_id: restaurantId,
          actor: 'USER',
          items: [{ sku: 'meal', name: 'Meal', quantity: 1, unit_price: 12.5 }],
          total_amount: 12.5,
          promised_at: '2099-01-01T00:00:00Z',
          weather: 'CLEAR',
        },
      })
      .expect(201);
  });

  afterAll(async () => app.close());

  it('evaluates ownership, executes cancellation, and remains idempotent', async () => {
    await request(getHttpServer(app))
      .post('/api/v1/support/actions/evaluate')
      .set('X-Kuri-Role', 'OPS')
      .set('X-Kuri-User-Id', 'someone_else')
      .send({ order_id: orderId, action: 'CANCEL_ORDER' })
      .expect(200)
      .expect((response) => {
        expect(response.body.status).toBe('REJECTED');
      });

    const payload = { order_id: orderId, action: 'CANCEL_ORDER' };
    const first = await request(getHttpServer(app))
      .post('/api/v1/support/actions/execute')
      .set('X-Kuri-Role', 'OPS')
      .set('X-Kuri-User-Id', userId)
      .send(payload)
      .expect(200);
    const second = await request(getHttpServer(app))
      .post('/api/v1/support/actions/execute')
      .set('X-Kuri-Role', 'OPS')
      .set('X-Kuri-User-Id', userId)
      .send(payload)
      .expect(200);

    expect(first.body.status).toBe('ALLOWED');
    expect(second.body.status).toBe('ALLOWED');
    expect(second.body.decision_id).toBe(first.body.decision_id);

    const order = await dataSource.manager.findOneBy(OrderEntity, { orderId });
    expect(order?.currentStatus).toBe('CANCELLED');
    expect(
      await dataSource.manager.countBy(SupportActionEffectEntity, {
        orderId,
      }),
    ).toBe(1);
  });
});
