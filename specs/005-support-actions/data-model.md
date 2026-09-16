# Data Model: Support Rules and Actions

## Existing inputs

`Order` and `OrderEvent` remain the source of truth for state, timestamps, total in USD cents and
line items. The policy reads the trusted projection and never accepts prices or ownership from user
input.

## SupportDecision

Transient structured result returned by every policy:

| Field | Type | Rules |
|---|---|---|
| `status` | `ALLOWED \| REQUIRES_APPROVAL \| REJECTED \| NEEDS_CHOICE` | Exactly one outcome |
| `action` | `CANCEL_ORDER \| ISSUE_COUPON \| REFUND` | Canonical action |
| `amount_cents` | integer, optional | USD cents; never negative |
| `alternatives` | list, optional | Required for delay >45 minutes before choice |
| `reason` | Spanish string | Safe and understandable; no PII |
| `policy_version` | string | Included in idempotency derivation |
| `decision_id` | opaque string | Stable for retries |

`REQUIRES_APPROVAL` also includes `approval_request_id`; `NEEDS_CHOICE` includes both eligible
alternatives and does not execute or create a financial effect.

## Persisted entities

### SupportActionEffect

Records at-most-once automatic effects.

- `effect_id` UUID primary key
- `idempotency_key` varchar(160), unique
- `order_id` and `user_id` varchar(64), indexed
- `action` enum-like varchar
- `decision_status` and `policy_version`
- `amount_cents` bigint nullable, USD cents
- `provider_reference` nullable safe reference
- `result` JSONB containing sanitized structured outcome
- `created_at` timestamptz

### SupportApprovalRequest

Durable handoff for US6.

- `approval_request_id` UUID primary key
- `idempotency_key` varchar(160), unique
- `order_id`, `user_id`, `action` and `policy_version`
- `amount_cents` bigint, positive USD cents
- `reason` text, sanitized
- `status` `PENDING` initially; later lifecycle owned by US6
- `decision` JSONB, sanitized
- `created_at`, `updated_at` timestamptz

### MissingItemsReport

Request context used to validate item references and compute a refund. It may be persisted with the
action result or represented in the sanitized decision; user-supplied prices are never stored as
authoritative values.

- `order_id`, `user_id`
- `line_references` list of unique stable line numbers
- `eligible_amount_cents` and `capped_amount_cents`
- `idempotency_key`

## Invariants

- An order action is evaluated only for its owning trusted user.
- `CANCELLED`, `DELIVERED` and post-pickup cancellation attempts cannot create a cancellation
  effect.
- A unique idempotency key maps to at most one effect and at most one approval request.
- Approval-required actions have no effect row representing issued money.
- An allowed cancellation creates a valid event and projection transition.
- Amounts are integer USD cents and obey percentage and absolute caps.
- Public results, logs and assistant payloads exclude courier phone/document and restaurant private
  contact data.

## State transitions

```text
policy input
  ├─ REJECTED       -> no effect
  ├─ NEEDS_CHOICE   -> no effect; await explicit alternative
  ├─ REQUIRES_APPROVAL -> one PENDING approval request; no financial effect
  └─ ALLOWED        -> one effect, or one CANCELLED event for cancellation
```
