import { Injectable } from '@nestjs/common';
import type {
  SupportActionResult,
  SupportDecisionContract,
} from '@kuri/contracts';

@Injectable()
export class SupportActionResponseService {
  sanitize(
    result: SupportDecisionContract | SupportActionResult,
  ): SupportActionResult {
    const safe: SupportActionResult = {
      decision_id: result.decision_id,
      status: result.status,
      action: result.action,
      reason: result.reason,
      policy_version: result.policy_version,
    };
    if (result.amount_cents !== undefined)
      safe.amount_cents = result.amount_cents;
    if (result.approval_request_id !== undefined)
      safe.approval_request_id = result.approval_request_id;
    if ('effect_id' in result && result.effect_id !== undefined)
      safe.effect_id = result.effect_id;
    if (result.alternatives !== undefined)
      safe.alternatives = result.alternatives.map((alternative) => ({
        action: alternative.action,
        alternative: alternative.alternative,
        amount_cents: alternative.amount_cents,
      }));
    return safe;
  }
}
