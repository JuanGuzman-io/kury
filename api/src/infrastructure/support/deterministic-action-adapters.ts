import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { ActionEffectPort } from '../../application/support/ports/support-action.ports';
import type { SupportAction } from '@kuri/contracts';

@Injectable()
export class DeterministicActionEffectAdapter implements ActionEffectPort {
  execute(
    action: SupportAction,
    orderId: string,
    amountCents?: number,
  ): Promise<{ effectId: string }> {
    void action;
    void orderId;
    void amountCents;
    return Promise.resolve({ effectId: `effect_${randomUUID()}` });
  }
}
