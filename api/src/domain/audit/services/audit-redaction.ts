export const MAX_AUDIT_PAYLOAD_CHARS = 16_384;

const SENSITIVE_KEY =
  /(phone|document_id|documentId|secret|token|api[_-]?key)/i;

export function redactAndBoundAuditPayload(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const redacted = JSON.parse(
    JSON.stringify(payload, (key, value: unknown) =>
      typeof value === 'string' && SENSITIVE_KEY.test(key)
        ? '[REDACTED]'
        : value,
    ),
  ) as Record<string, unknown>;
  const serialized = JSON.stringify(redacted);
  return serialized.length <= MAX_AUDIT_PAYLOAD_CHARS
    ? redacted
    : {
        truncated: true,
        preview: serialized.slice(0, MAX_AUDIT_PAYLOAD_CHARS),
      };
}
