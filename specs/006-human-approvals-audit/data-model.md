# Data Model: Human Approvals and Assistant Traceability

## ApprovalRequest

Represents a sensitive support decision awaiting or completing human resolution.

| Field | Type | Rules |
|---|---|---|
| approval_request_id | UUID/string | Required, unique, immutable |
| idempotency_key | string | Required, unique per logical action |
| order_id | string | Required, indexed |
| conversation_id | string/null | Optional; link to originating chat |
| action_type | enum | `CANCEL_ORDER`, `ISSUE_COUPON`, `REFUND` |
| amount_cents | integer | Non-negative; never floating point |
| reason | string | Spanish, bounded, policy-derived |
| policy_version | string | Required for reproducibility |
| context_fingerprint | string | Required; identifies evaluated order context |
| status | enum | `PENDING`, `APPROVED`, `REJECTED`, `OBSOLETE` |
| decision | JSON/object | Sanitized policy decision and selected alternative |
| created_at | timestamp | Required |
| resolved_at | timestamp/null | Set once on terminal state |
| resolved_by | string/null | OPS identity for terminal resolution |

Constraints: only `PENDING` can transition; `(idempotency_key)` is unique; `resolved_at` and
`resolved_by` are set together for terminal states.

## ActionEffect

Represents the single durable result of an approved/allowed action.

| Field | Type | Rules |
|---|---|---|
| effect_id | UUID/string | Required, unique |
| idempotency_key | string | Required, unique |
| approval_request_id | UUID/string/null | Link when approval was required |
| order_id | string | Required |
| action | enum | Support action type |
| amount_cents | integer/null | Non-negative integer |
| provider_reference | string/null | Local deterministic or external reference |
| status | enum | `EXECUTED`, `FAILED` |
| result | JSON/object | Sanitized structured result |
| created_at | timestamp | Required |

## TraceRecord

One append-only operational trace event. A single table or typed tables may be used, but the
contract must preserve these discriminated records:

- `MESSAGE`: conversation, message id, role, bounded redacted content, timestamp.
- `LLM_CALL`: conversation, provider, model, status, duration, token counts, estimated cost,
  safe error code, timestamp.
- `TOOL_EXECUTION`: conversation/message, tool name, redacted bounded arguments/result, status,
  duration, timestamp.
- `DECISION`: conversation/order, action, decision status, amount, reason, policy version,
  context fingerprint, timestamp.
- `APPROVAL`: approval id, state transition, resolver, safe reason, timestamp.
- `EFFECT`: effect id, action, status, safe provider reference and timestamp.
- `ERROR`: conversation/order correlation, category, safe message and timestamp.

Every trace record has an immutable id, chronological sequence, optional conversation and order
references, and no raw secrets or prohibited personal data.

## Relationships

```text
Conversation 1 ── * TraceRecord
Conversation 1 ── * ApprovalRequest (optional origin)
Order        1 ── * Conversation (operational association)
Order        1 ── * ApprovalRequest
ApprovalRequest 1 ── 0..1 ActionEffect
Conversation/Order 1 ── * Decision, ToolExecution, LlmCall, Error
```

## State transitions

```text
PENDING ── approve + valid context ──> APPROVED ──> one ActionEffect
PENDING ── reject ───────────────────> REJECTED
PENDING ── approve + changed context > OBSOLETE (no effect)
```

All transitions are guarded by current state and idempotency key. Repeated terminal operations
return the recorded result without creating another effect.
