# Data Model: Operations Panel

The panel has no client-owned business entities. It renders server-owned resources through typed
read models and ephemeral UI state.

## Operational order view

| Field | Source | Display rule |
|---|---|---|
| `order_id` | Order detail/list | Always visible; wrap safely on narrow screens |
| `city` | Order detail/list | BOG, MEX or LIM label |
| `current_status` | Order projection | Spanish label plus text status marker |
| `promised_at` | Order projection | Localized date/time with delayed indicator |
| `total_amount_cents` | Order projection | Format from integer cents; never calculate eligibility |
| `weather` | Order projection | Text/icon label |
| `risk` | Risk response | Level, score and reasons from backend |
| `restaurant` | Safe order DTO | Name/operational identity only |
| `courier` | Safe order DTO | Operational fields only; phone/document never rendered |

## Timeline item

`event_id`, event type, status, actor, `occurred_at`, `received_at`, and safe display payload. The
client orders by `occurred_at` only when the backend contract does not already guarantee order; it
must visibly distinguish occurrence time from receipt time.

## Trace item

`trace_id`, type (`MESSAGE`, `LLM_CALL`, `TOOL_EXECUTION`, `DECISION`, `APPROVAL`, `EFFECT`,
`ERROR`), optional conversation/order identifiers, occurrence time and bounded redacted payload.
Payload details are collapsed by default.

## Approval item

`approval_request_id`, order, action, amount in cents, reason, policy version, status, creation time
and optional resolution metadata. The client never infers whether an action is eligible; it renders
the response and invokes the resolution endpoint only after confirmation.

## UI state

Each query surface has `loading`, `success`, `empty`, `error`, and `forbidden` states. Mutations add
`confirming`, `submitting`, `resolved`, `conflict` and `obsolete` states. Filters and page are
serializable URL state; dialog focus and expanded trace items are local ephemeral state.
