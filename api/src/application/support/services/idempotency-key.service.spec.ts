import { CanonicalIdempotencyKeyService } from './idempotency-key.service';

describe('CanonicalIdempotencyKeyService', () => {
  const service = new CanonicalIdempotencyKeyService();

  it('is stable for the same action identity', () => {
    expect(service.create('REFUND', 'ord_1', undefined, 'policy.v1')).toBe(
      service.create('REFUND', 'ord_1', undefined, 'policy.v1'),
    );
  });

  it('changes when action, order, alternative or policy changes', () => {
    const base = service.create('REFUND', 'ord_1', undefined, 'policy.v1');
    expect(
      service.create('ISSUE_COUPON', 'ord_1', undefined, 'policy.v1'),
    ).not.toBe(base);
    expect(service.create('REFUND', 'ord_2', undefined, 'policy.v1')).not.toBe(
      base,
    );
    expect(
      service.create('REFUND', 'ord_1', 'FULL_REFUND', 'policy.v1'),
    ).not.toBe(base);
    expect(service.create('REFUND', 'ord_1', undefined, 'policy.v2')).not.toBe(
      base,
    );
  });
});
