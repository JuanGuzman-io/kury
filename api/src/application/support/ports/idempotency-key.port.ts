export const IDEMPOTENCY_KEY_SERVICE = Symbol('IDEMPOTENCY_KEY_SERVICE');
export interface IdempotencyKeyService {
  create(
    action: string,
    orderId: string,
    alternative: string | undefined,
    policyVersion: string,
  ): string;
}
