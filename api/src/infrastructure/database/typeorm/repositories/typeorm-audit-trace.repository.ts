import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { AuditTraceKind } from '../../../../domain/audit/value-objects/audit-types';
import type {
  AuditTraceRecord,
  AuditTraceRepository,
} from '../../../../application/audit/ports/audit-trace-repository.port';
import { AuditTraceEntity } from '../entities/approval-audit.entities';

@Injectable()
export class TypeormAuditTraceRepository implements AuditTraceRepository {
  constructor(private readonly dataSource: DataSource) {}

  async append(input: {
    type: AuditTraceKind;
    conversationId: string | null;
    orderId: string | null;
    payload: Record<string, unknown>;
  }): Promise<void> {
    await this.dataSource.getRepository(AuditTraceEntity).save(input);
  }

  async list(
    scope: 'conversation' | 'order',
    id: string,
    offset: number,
    limit: number,
  ): Promise<{ rows: AuditTraceRecord[]; total: number }> {
    const query = this.dataSource
      .getRepository(AuditTraceEntity)
      .createQueryBuilder('trace')
      .orderBy('trace.occurred_at', 'ASC')
      .addOrderBy('trace.trace_id', 'ASC')
      .andWhere(
        scope === 'conversation'
          ? 'trace.conversation_id = :id'
          : 'trace.order_id = :id',
        { id },
      )
      .skip(offset)
      .take(limit);
    const [entities, total] = await query.getManyAndCount();
    return {
      rows: entities.map((entity) => ({
        traceId: entity.traceId,
        type: entity.type as AuditTraceKind,
        conversationId: entity.conversationId,
        orderId: entity.orderId,
        occurredAt: entity.occurredAt,
        payload: entity.payload,
      })),
      total,
    };
  }
}
