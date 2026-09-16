import { evaluateCancellation } from '../../src/domain/support/policies/cancellation.policy';
import { evaluateDelayCompensation } from '../../src/domain/support/policies/delay-compensation.policy';
import { evaluateMissingItems } from '../../src/domain/support/policies/missing-items.policy';
import type { SupportOrderContext } from '../../src/domain/support/entities/support-order-context';

const describePerformance =
  process.env.RUN_PERFORMANCE === '1' ? describe : describe.skip;

describePerformance('support policy performance', () => {
  it('keeps deterministic policy p95 below 5ms for one operational context', () => {
    const order: SupportOrderContext = {
      orderId: 'ord_perf',
      userId: 'usr_perf',
      currentStatus: 'ACCEPTED',
      statusOccurredAt: new Date('2026-09-16T12:00:00Z'),
      promisedAt: new Date('2026-09-16T12:30:00Z'),
      totalAmountCents: 3000,
      items: [
        { lineNumber: 1, unitPriceCents: 2000, quantity: 1 },
        { lineNumber: 2, unitPriceCents: 1000, quantity: 1 },
      ],
    };
    const measurements: number[] = [];
    for (let index = 0; index < 1_000; index += 1) {
      const started = performance.now();
      evaluateCancellation(order, new Date('2026-09-16T12:04:00Z'));
      evaluateDelayCompensation(order, new Date('2026-09-16T13:16:00Z'));
      evaluateMissingItems(order, [1]);
      measurements.push(performance.now() - started);
    }
    measurements.sort((left, right) => left - right);
    const p95 =
      measurements[Math.ceil(measurements.length * 0.95) - 1] ?? Infinity;
    expect(p95).toBeLessThan(5);
  });
});
