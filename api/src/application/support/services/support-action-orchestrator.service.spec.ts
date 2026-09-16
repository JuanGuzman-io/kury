/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
import type { SupportOrderContext } from '../../../domain/support/entities/support-order-context';
import { SupportActionResponseService } from './support-action-response.service';
import { SupportActionOrchestratorService } from './support-action-orchestrator.service';

describe('SupportActionOrchestratorService', () => {
  const now = new Date();
  const context: SupportOrderContext = {
    orderId: 'ord_test',
    userId: 'usr_test',
    currentStatus: 'ACCEPTED',
    statusOccurredAt: new Date(now.getTime() - 60_000),
    promisedAt: new Date(now.getTime() - 46 * 60_000),
    totalAmountCents: 4000,
    items: [{ lineNumber: 1, unitPriceCents: 4000, quantity: 1 }],
  };

  function setup(order: SupportOrderContext | null = context) {
    const contextService = { findOwned: jest.fn().mockResolvedValue(order) };
    const repository = {
      findByIdempotencyKey: jest.fn().mockResolvedValue(null),
      saveEffect: jest.fn().mockResolvedValue({ status: 'ALLOWED' }),
      saveApproval: jest
        .fn()
        .mockResolvedValue({ status: 'REQUIRES_APPROVAL' }),
    };
    const keys = { create: jest.fn().mockReturnValue('key') };
    const effects = {
      execute: jest.fn().mockResolvedValue({ effectId: 'effect' }),
    };
    const ingest = {
      execute: jest.fn().mockResolvedValue({ outcome: 'APPLIED' }),
    };
    const service = new SupportActionOrchestratorService(
      contextService as never,
      repository as never,
      keys as never,
      effects as never,
      ingest as never,
      new SupportActionResponseService(),
    );
    return { service, repository, effects, ingest };
  }

  it('fails closed for an unknown or unowned order', async () => {
    const { service } = setup(null);
    await expect(
      service.execute('usr_test', { order_id: 'ord_test', action: 'REFUND' }),
    ).resolves.toMatchObject({ status: 'REJECTED' });
  });

  it('returns needs-choice without executing an unselected delay alternative', async () => {
    const { service, effects, repository } = setup();
    await expect(
      service.execute('usr_test', {
        order_id: 'ord_test',
        action: 'ISSUE_COUPON',
      }),
    ).resolves.toMatchObject({ status: 'NEEDS_CHOICE' });
    expect(effects.execute).not.toHaveBeenCalled();
    expect(repository.saveEffect).not.toHaveBeenCalled();
  });

  it('creates an approval and does not execute a compensation over USD 8', async () => {
    const { service, effects, repository } = setup();
    await expect(
      service.execute('usr_test', {
        order_id: 'ord_test',
        action: 'ISSUE_COUPON',
        alternative: 'WAIT_WITH_30_PERCENT_COUPON',
      }),
    ).resolves.toMatchObject({ status: 'REQUIRES_APPROVAL' });
    expect(effects.execute).not.toHaveBeenCalled();
    expect(repository.saveApproval).toHaveBeenCalledTimes(1);
  });
});
