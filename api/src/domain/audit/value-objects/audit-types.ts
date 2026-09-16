export type ApprovalLifecycleStatus =
  'PENDING' | 'APPROVED' | 'REJECTED' | 'OBSOLETE';

export type AuditTraceKind =
  | 'MESSAGE'
  | 'LLM_CALL'
  | 'TOOL_EXECUTION'
  | 'DECISION'
  | 'APPROVAL'
  | 'EFFECT'
  | 'ERROR';

export type ApprovalResolution = 'APPROVE' | 'REJECT';
