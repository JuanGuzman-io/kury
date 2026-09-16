import type { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuditTraceService } from '../../src/application/audit/services/audit-trace.service';
import { createTestApp } from '../support/test-app';

describe('audit trace persistence', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let traces: AuditTraceService;

  beforeAll(async () => {
    const context = await createTestApp();
    app = context.app;
    dataSource = context.dataSource;
    traces = app.get(AuditTraceService);
  });

  afterAll(async () => app.close());

  it('appends chronological, redacted records and paginates deterministically', async () => {
    const conversationId = `conv_trace_${Date.now()}`;
    const orderId = `ord_trace_${Date.now()}`;
    await traces.record({
      type: 'MESSAGE',
      conversationId,
      orderId,
      payload: {
        role: 'USER',
        content: '¿Dónde está mi pedido?',
        courier: { phone: '+570000000', document_id: 'doc-private' },
      },
    });
    await traces.record({
      type: 'DECISION',
      conversationId,
      orderId,
      payload: { action: 'get_order_status', status: 'ALLOWED' },
    });

    const page = await traces.list('order', orderId, 1, 1);
    expect(page.pagination).toMatchObject({ page: 1, limit: 1, total: 2 });
    expect(page.data).toHaveLength(1);
    expect(JSON.stringify(page)).not.toMatch(/\+570000000|doc-private/i);

    const all = await traces.list('conversation', conversationId, 1, 20);
    expect(all.data.map((trace) => trace.type)).toEqual([
      'MESSAGE',
      'DECISION',
    ]);
    expect(dataSource.isInitialized).toBe(true);
  });
});
