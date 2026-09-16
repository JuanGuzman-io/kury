export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'OBSOLETE';
export type AuditTraceType = 'MESSAGE' | 'LLM_CALL' | 'TOOL_EXECUTION' | 'DECISION' | 'APPROVAL' | 'EFFECT' | 'ERROR';
export interface ApprovalRequestContract {
  approval_request_id: string;
  idempotency_key: string;
  order_id: string;
  conversation_id?: string;
  action_type: string;
  amount_cents: number;
  reason: string;
  policy_version: string;
  status: ApprovalStatus;
  created_at: string;
  resolved_at?: string;
  resolved_by?: string;
}
export interface AuditTraceContract {
  trace_id: string;
  type: AuditTraceType;
  conversation_id?: string;
  order_id?: string;
  occurred_at: string;
  payload: Record<string, unknown>;
}
export interface PaginatedApprovalsContract {
  data: ApprovalRequestContract[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}
export interface AuditTracePageContract {
  data: AuditTraceContract[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}
