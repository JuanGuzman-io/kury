import {
  MAX_AUDIT_PAYLOAD_CHARS,
  redactAndBoundAuditPayload,
} from './audit-redaction';

describe('audit redaction policy', () => {
  it('redacts prohibited identity and secret fields recursively', () => {
    expect(
      redactAndBoundAuditPayload({
        courier: { phone: '+570000000', document_id: 'doc-1' },
        nested: { api_key: 'secret-value' },
        content: 'the user message remains auditable',
      }),
    ).toEqual({
      courier: { phone: '[REDACTED]', document_id: '[REDACTED]' },
      nested: { api_key: '[REDACTED]' },
      content: 'the user message remains auditable',
    });
  });

  it('bounds oversized payloads before persistence', () => {
    const result = redactAndBoundAuditPayload({ content: 'x'.repeat(20_000) });
    expect(result.truncated).toBe(true);
    expect(typeof result.preview).toBe('string');
    expect((result.preview as string).length).toBe(MAX_AUDIT_PAYLOAD_CHARS);
  });
});
