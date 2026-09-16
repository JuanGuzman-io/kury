import type { AuditTraceKind } from '../../../domain/audit/value-objects/audit-types';

export const AUDIT_TRACE_REPOSITORY = Symbol('AUDIT_TRACE_REPOSITORY');

export interface AuditTraceRecord {
  traceId: string;
  type: AuditTraceKind;
  conversationId: string | null;
  orderId: string | null;
  occurredAt: Date;
  payload: Record<string, unknown>;
}

export interface AuditTraceRepository {
  append(input: {
    type: AuditTraceKind;
    conversationId: string | null;
    orderId: string | null;
    payload: Record<string, unknown>;
  }): Promise<void>;
  list(
    scope: 'conversation' | 'order',
    id: string,
    offset: number,
    limit: number,
  ): Promise<{ rows: AuditTraceRecord[]; total: number }>;
}
