import { Injectable } from '@nestjs/common';
import type { AuditTracePageContract, AuditTraceType } from '@kuri/contracts';
import { Inject } from '@nestjs/common';
import { redactAndBoundAuditPayload } from '../../../domain/audit/services/audit-redaction';
import {
  AUDIT_TRACE_REPOSITORY,
  type AuditTraceRepository,
} from '../ports/audit-trace-repository.port';

@Injectable()
export class AuditTraceService {
  constructor(
    @Inject(AUDIT_TRACE_REPOSITORY)
    private readonly repository: AuditTraceRepository,
  ) {}

  async record(input: {
    type: AuditTraceType;
    conversationId?: string;
    orderId?: string;
    payload: Record<string, unknown>;
  }): Promise<void> {
    await this.repository.append({
      type: input.type,
      conversationId: input.conversationId ?? null,
      orderId: input.orderId ?? null,
      payload: redactAndBoundAuditPayload(input.payload),
    });
  }

  async list(
    scope: 'conversation' | 'order',
    id: string,
    page = 1,
    limit = 20,
  ): Promise<AuditTracePageContract> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const { rows, total } = await this.repository.list(
      scope,
      id,
      (safePage - 1) * safeLimit,
      safeLimit,
    );
    return {
      data: rows.map((row) => ({
        trace_id: row.traceId,
        type: row.type,
        ...(row.conversationId ? { conversation_id: row.conversationId } : {}),
        ...(row.orderId ? { order_id: row.orderId } : {}),
        occurred_at: row.occurredAt.toISOString(),
        payload: redactAndBoundAuditPayload(row.payload),
      })),
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }
}
