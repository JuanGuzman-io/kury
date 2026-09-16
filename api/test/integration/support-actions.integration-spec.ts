/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import type { INestApplication } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import { TypeormSupportActionRepository } from '../../src/infrastructure/database/typeorm/repositories/typeorm-support-action.repository';
import type { SupportActionRecord } from '../../src/domain/support/entities/support-action';
import { createTestApp, insertReferences } from '../support/test-app';
import * as request from 'supertest';
import { getHttpServer } from '../support/test-app';

describe('support action persistence integration', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
  });

  afterAll(async () => app.close());

  it('persists an effect and resolves it by its canonical idempotency key', async () => {
    const repository = app.get(TypeormSupportActionRepository);
    const record: SupportActionRecord = {
      idempotencyKey: `integration_key_${Date.now()}`,
      orderId: 'ord_integration',
      userId: 'usr_integration',
      decision: {
        decision_id: 'decision_integration',
        status: 'ALLOWED',
        action: 'REFUND',
        amount_cents: 400,
        reason: 'Reembolso aprobado por la política.',
        policy_version: 'test.v1',
      },
    };
    const saved = await repository.saveEffect(record);
    const found = await repository.findByIdempotencyKey(record.idempotencyKey);
    expect(saved.effect_id).toBeDefined();
    expect(found?.decision).toMatchObject(record.decision);
  });

  it('persists one pending approval request for an approval-gated action', async () => {
    const repository = app.get(TypeormSupportActionRepository);
    const key = `approval_key_${Date.now()}`;
    const decision = {
      decision_id: 'decision_approval_integration',
      status: 'REQUIRES_APPROVAL' as const,
      action: 'REFUND' as const,
      amount_cents: 900,
      reason: 'Requiere aprobación humana.',
      policy_version: 'test.v1',
    };
    const saved = await repository.saveApproval({
      idempotencyKey: key,
      orderId: 'ord_approval_integration',
      userId: 'usr_integration',
      decision,
      status: 'PENDING',
      amountCents: 900,
    });
    const found = await repository.findByIdempotencyKey(key);
    expect(saved.approval_request_id).toBeDefined();
    expect(found?.decision).toMatchObject(decision);
    const approvals = await dataSource.query(
      'SELECT status FROM support_approval_requests WHERE idempotency_key = $1',
      [key],
    );
    expect(approvals).toEqual([{ status: 'PENDING' }]);
  });
});

describe('support cancellation integration', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  const suffix = `cancel_integration_${Date.now()}`;
  const userId = `usr_${suffix}`;
  const orderId = `ord_${suffix}`;

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
    const { restaurantId } = await insertReferences(dataSource, suffix);
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
          items: [{ sku: 'meal', name: 'Meal', quantity: 1, unit_price: 10 }],
          total_amount: 10,
          promised_at: '2099-01-01T00:00:00Z',
          weather: 'CLEAR',
        },
      })
      .expect(201);
  });

  afterAll(async () => app.close());

  it('projects one cancellation event and does not duplicate its effect on retry', async () => {
    const body = { order_id: orderId, action: 'CANCEL_ORDER' };
    const first = await request(getHttpServer(app))
      .post('/api/v1/support/actions/execute')
      .set('X-Kuri-Role', 'OPS')
      .set('X-Kuri-User-Id', userId)
      .send(body)
      .expect(200);
    const second = await request(getHttpServer(app))
      .post('/api/v1/support/actions/execute')
      .set('X-Kuri-Role', 'OPS')
      .set('X-Kuri-User-Id', userId)
      .send(body)
      .expect(200);
    expect(second.body.decision_id).toBe(first.body.decision_id);
    await expect(
      dataSource.query(
        'SELECT COUNT(*)::int AS count FROM order_events WHERE order_id = $1 AND status = $2',
        [orderId, 'CANCELLED'],
      ),
    ).resolves.toEqual([{ count: 1 }]);
  });
});
