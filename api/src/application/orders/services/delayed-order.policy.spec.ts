import { isOrderDelayed } from './delayed-order.policy';

describe('isOrderDelayed', () => {
  const now = new Date('2026-09-15T13:00:00Z');

  it('requires the evaluation instant to be after promised_at', () => {
    expect(isOrderDelayed(now, 'PICKED_UP', now)).toBe(false);
    expect(
      isOrderDelayed(new Date('2026-09-15T12:59:59Z'), 'PICKED_UP', now),
    ).toBe(true);
  });

  it('never marks delivered orders as delayed', () => {
    expect(
      isOrderDelayed(new Date('2026-09-15T12:00:00Z'), 'DELIVERED', now),
    ).toBe(false);
  });
});
