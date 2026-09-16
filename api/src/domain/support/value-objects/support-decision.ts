import type {
  CompensationAlternative,
  SupportAction,
  SupportDecisionContract,
  SupportDecisionStatus,
} from '@kuri/contracts';

export const SUPPORT_POLICY_VERSION = '2026-09-16.v1';
export interface SupportDecisionInput {
  status: SupportDecisionStatus;
  action: SupportAction;
  reason: string;
  amountCents?: number;
  alternatives?: Array<{
    action: SupportAction;
    alternative: CompensationAlternative;
    amountCents: number;
  }>;
}
export function decision(input: SupportDecisionInput): SupportDecisionContract {
  return {
    decision_id: `decision_${input.action}_${input.status}_${input.amountCents ?? 0}`,
    status: input.status,
    action: input.action,
    reason: input.reason,
    policy_version: SUPPORT_POLICY_VERSION,
    ...(input.amountCents === undefined
      ? {}
      : { amount_cents: input.amountCents }),
    ...(input.alternatives
      ? {
          alternatives: input.alternatives.map((a) => ({
            ...a,
            amount_cents: a.amountCents,
          })),
        }
      : {}),
  };
}
