import { evaluateCancellation } from './cancellation.policy';
import { evaluateDelayCompensation } from './delay-compensation.policy';
import { evaluateMissingItems } from './missing-items.policy';
import type { SupportOrderContext } from '../entities/support-order-context';

const base: SupportOrderContext = {
  orderId: 'ord_test',
  userId: 'usr_test',
  currentStatus: 'ACCEPTED',
  statusOccurredAt: new Date('2026-09-16T12:00:00Z'),
  promisedAt: new Date('2026-09-16T12:00:00Z'),
  totalAmountCents: 2000,
  items: [
    { lineNumber: 1, unitPriceCents: 1000, quantity: 1 },
    { lineNumber: 2, unitPriceCents: 400, quantity: 1 },
  ],
};
const at = (minutes: number) =>
  new Date(base.statusOccurredAt.getTime() + minutes * 60_000);

describe('support policies', () => {
  it('applies cancellation boundaries', () => {
    expect(
      evaluateCancellation({ ...base, currentStatus: 'CREATED' }, at(10))
        .status,
    ).toBe('ALLOWED');
    expect(evaluateCancellation(base, at(4)).status).toBe('ALLOWED');
    expect(evaluateCancellation(base, at(5)).status).toBe('REJECTED');
    expect(
      evaluateCancellation({ ...base, currentStatus: 'PICKED_UP' }, at(1))
        .status,
    ).toBe('REJECTED');
  });

  it('calculates delay caps and explicit alternatives', () => {
    expect(
      evaluateDelayCompensation({ ...base, totalAmountCents: 2000 }, at(30)),
    ).toMatchObject({ status: 'ALLOWED', amount_cents: 300 });
    expect(
      evaluateDelayCompensation({ ...base, totalAmountCents: 10000 }, at(30)),
    ).toMatchObject({ amount_cents: 500 });
    expect(
      evaluateDelayCompensation({ ...base, totalAmountCents: 2000 }, at(46))
        .status,
    ).toBe('NEEDS_CHOICE');
    expect(
      evaluateDelayCompensation(
        { ...base, totalAmountCents: 4000 },
        at(46),
        'WAIT_WITH_30_PERCENT_COUPON',
      ),
    ).toMatchObject({ status: 'REQUIRES_APPROVAL', amount_cents: 1000 });
  });

  it('caps missing-item refunds and applies approval threshold', () => {
    expect(evaluateMissingItems(base, [2])).toMatchObject({
      status: 'ALLOWED',
      amount_cents: 400,
    });
    expect(
      evaluateMissingItems({ ...base, totalAmountCents: 1000 }, [1, 2]),
    ).toMatchObject({ status: 'ALLOWED', amount_cents: 500 });
    expect(
      evaluateMissingItems(
        {
          ...base,
          totalAmountCents: 3000,
          items: [{ lineNumber: 1, unitPriceCents: 2000, quantity: 1 }],
        },
        [1],
      ),
    ).toMatchObject({ status: 'REQUIRES_APPROVAL', amount_cents: 1500 });
    expect(evaluateMissingItems(base, [2, 2, 99])).toMatchObject({
      amount_cents: 400,
    });
  });
});
