import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { IdempotencyKeyService } from '../ports/idempotency-key.port';

@Injectable()
export class CanonicalIdempotencyKeyService implements IdempotencyKeyService {
  create(
    action: string,
    orderId: string,
    alternative: string | undefined,
    policyVersion: string,
  ): string {
    return `support_${createHash('sha256')
      .update([action, orderId, alternative ?? '-', policyVersion].join(':'))
      .digest('hex')}`;
  }
}
