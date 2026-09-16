/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import type { INestApplication } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import * as request from 'supertest';
import {
  createTestApp,
  getHttpServer,
  insertReferences,
} from '../support/test-app';
import {
  SupportActionEffectEntity,
  SupportApprovalRequestEntity,
} from '../../src/infrastructure/database/typeorm/entities/support-action.entities';

describe('approval workflow', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  const suffix = `approval_${Date.now()}`;
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
        occurred_at: '2026-09-16T10:00:00Z',
        received_at: '2026-09-16T10:00:01Z',
        payload: {
          user_id: userId,
          city: 'BOG',
          restaurant_id: restaurantId,
          actor: 'USER',
          items: [{ sku: 'meal', name: 'Meal', quantity: 1, unit_price: 40 }],
          total_amount: 40,
          promised_at: '2026-09-16T10:30:00Z',
          weather: 'RAIN',
        },
      })
      .expect(201);
  });

  afterAll(async () => app.close());

  it('creates, lists and rejects a pending request as OPS', async () => {
    const created = await request(getHttpServer(app))
      .post('/api/v1/support/actions/execute')
      .set('X-Kuri-Role', 'OPS')
      .set('X-Kuri-User-Id', userId)
      .send({
        order_id: orderId,
        action: 'ISSUE_COUPON',
        alternative: 'WAIT_WITH_30_PERCENT_COUPON',
      })
      .expect(200);
    expect(created.body.status).toBe('REQUIRES_APPROVAL');
    const approvalId = created.body.approval_request_id as string;

    const queue = await request(getHttpServer(app))
      .get('/api/v1/approvals?status=PENDING&limit=100')
      .set('X-Kuri-Role', 'OPS')
      .expect(200);
    expect(queue.body.data).toEqual(expect.any(Array));
    expect(queue.body.pagination).toEqual(
      expect.objectContaining({ page: 1, limit: 100 }),
    );
    await request(getHttpServer(app))
      .get('/api/v1/approvals?limit=101')
      .set('X-Kuri-Role', 'OPS')
      .expect(400);
    await request(getHttpServer(app))
      .get('/api/v1/approvals')
      .set('X-Kuri-Role', 'SYSTEM')
      .expect(403);

    await request(getHttpServer(app))
      .post(`/api/v1/approvals/${approvalId}/reject`)
      .set('X-Kuri-Role', 'OPS')
      .set('X-Kuri-User-Id', 'ops_1')
      .expect(200)
      .expect((response) => {
        expect(response.body.status).toBe('REJECTED');
      });
    const approval = await dataSource.manager.findOneBy(
      SupportApprovalRequestEntity,
      { approvalRequestId: approvalId },
    );
    expect(approval?.status).toBe('REJECTED');

    const approvalToExecute = await request(getHttpServer(app))
      .post('/api/v1/support/actions/execute')
      .set('X-Kuri-Role', 'OPS')
      .set('X-Kuri-User-Id', userId)
      .send({
        order_id: orderId,
        action: 'ISSUE_COUPON',
        alternative: 'FULL_REFUND',
      })
      .expect(200);
    expect(approvalToExecute.body.status).toBe('REQUIRES_APPROVAL');
    const executableId = approvalToExecute.body.approval_request_id as string;

    await request(getHttpServer(app))
      .post(`/api/v1/approvals/${executableId}/approve`)
      .set('X-Kuri-Role', 'OPS')
      .set('X-Kuri-User-Id', 'ops_1')
      .expect(200)
      .expect((response) => {
        expect(response.body.status).toBe('ALLOWED');
        expect(response.body.effect_id).toBeTruthy();
      });

    const approvedRequest = await dataSource.manager.findOneBy(
      SupportApprovalRequestEntity,
      { approvalRequestId: executableId },
    );
    expect(approvedRequest?.status).toBe('APPROVED');
    await expect(
      dataSource.manager.countBy(SupportActionEffectEntity, {
        idempotencyKey: approvedRequest!.idempotencyKey,
      }),
    ).resolves.toBe(1);

    await request(getHttpServer(app))
      .post(`/api/v1/approvals/${executableId}/approve`)
      .set('X-Kuri-Role', 'OPS')
      .set('X-Kuri-User-Id', 'ops_1')
      .expect(409);

    const stale = await dataSource.manager.save(SupportApprovalRequestEntity, {
      idempotencyKey: `stale_${suffix}`,
      orderId,
      userId,
      action: 'REFUND',
      policyVersion: 'test.v1',
      amountCents: '900',
      reason: 'Requiere aprobación humana.',
      status: 'PENDING',
      decision: {
        action: 'REFUND',
        status: 'REQUIRES_APPROVAL',
        reason: 'Requiere aprobación humana.',
        amount_cents: 900,
        policy_version: 'test.v1',
      },
      contextFingerprint: 'CREATED:2026-09-16T10:00:00.000Z:4000',
    });
    await request(getHttpServer(app))
      .post('/api/v1/order-events')
      .set('X-Kuri-Role', 'SYSTEM')
      .send({
        event_id: `evt_${suffix}_accepted`,
        order_id: orderId,
        type: 'ORDER_STATUS_CHANGED',
        occurred_at: '2026-09-16T10:01:00Z',
        received_at: '2026-09-16T10:01:01Z',
        payload: { status: 'ACCEPTED', actor: 'RESTAURANT' },
      })
      .expect(201);
    await request(getHttpServer(app))
      .post(`/api/v1/approvals/${stale.approvalRequestId}/approve`)
      .set('X-Kuri-Role', 'OPS')
      .set('X-Kuri-User-Id', 'ops_1')
      .expect(200)
      .expect((response) => expect(response.body.status).toBe('REJECTED'));
    await expect(
      dataSource.manager.findOneBy(SupportApprovalRequestEntity, {
        approvalRequestId: stale.approvalRequestId,
      }),
    ).resolves.toEqual(expect.objectContaining({ status: 'OBSOLETE' }));
    await expect(
      dataSource.manager.countBy(SupportActionEffectEntity, {
        idempotencyKey: stale.idempotencyKey,
      }),
    ).resolves.toBe(0);
  });
});
