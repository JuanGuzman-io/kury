export type SupportAction = "CANCEL_ORDER" | "ISSUE_COUPON" | "REFUND";
export type SupportDecisionStatus =
  "ALLOWED" | "REQUIRES_APPROVAL" | "REJECTED" | "NEEDS_CHOICE";
export type CompensationAlternative =
  "FULL_REFUND" | "WAIT_WITH_30_PERCENT_COUPON";

export interface SupportAlternative {
  action: SupportAction;
  alternative: CompensationAlternative;
  amount_cents: number;
}
export interface SupportDecisionContract {
  decision_id: string;
  status: SupportDecisionStatus;
  action: SupportAction;
  amount_cents?: number;
  reason: string;
  policy_version: string;
  approval_request_id?: string;
  alternatives?: SupportAlternative[];
}
export interface SupportActionRequest {
  order_id: string;
  action: SupportAction;
  alternative?: CompensationAlternative;
  missing_item_lines?: number[];
  idempotency_correlation?: string;
}
export interface SupportActionResult extends SupportDecisionContract {
  effect_id?: string;
}
