# Data Model: Conversational Support Assistant

## Conversation

| Field | Type / rule | Purpose |
|---|---|---|
| `conversation_id` | unique string/UUID | Public continuation key |
| `user_id` | required string | Owner and authorization boundary |
| `order_id` | nullable string | Optional conversation scope |
| `created_at` | timestamp | Creation history |
| `updated_at` | timestamp | Last successful turn |
| `version` | positive integer | Optimistic/concurrency guard |

One conversation belongs to exactly one user. A continuation must match both `conversation_id` and
trusted user context; body identity cannot change ownership.

## Message

| Field | Type / rule | Purpose |
|---|---|---|
| `message_id` | unique string/UUID | Message identity |
| `conversation_id` | required reference | Parent conversation |
| `sequence` | positive integer unique per conversation | Deterministic context order |
| `role` | `USER` or `ASSISTANT` | User-visible message role |
| `content` | bounded non-empty text | Spanish conversation content |
| `created_at` | timestamp | Message chronology |

Provider tool arguments/results and hidden instructions are orchestration data, not user-visible
messages and are not persisted as unrestricted metadata in US4.

## Assistant intent

```text
ORDER_STATUS | CANCEL_ORDER | LATE_ORDER_COMPLAINT | MISSING_ITEMS | OUT_OF_SCOPE
```

Intent is an untrusted routing result. It has no authority to read or mutate the domain.

## Tool definition and result

```text
ToolDefinition {
  name: get_order_status | request_order_cancellation |
        evaluate_delay_compensation | report_missing_items,
  inputSchema: explicit bounded schema,
  outputSchema: explicit structured schema,
  mutatesDomain: false in US4
}
```

`get_order_status` returns safe status, `promised_at`, `delayed`, and safe references only. Future
action stubs return `NOT_IMPLEMENTED_US5` or a prepared request without execution.

## Chat request and response

```text
ChatRequest {
  conversation_id?: string,
  user_id?: string,       // informational only; never authoritative
  order_id?: string,
  message: string         // bounded non-empty text
}

ChatResponse {
  conversation_id: string,
  message: string,
  intent?: AssistantIntent
}
```

The trusted simulated user context is supplied outside the body (`X-Kuri-User-Id` in local HTTP).

## Relationships and constraints

```text
User 1 ─── * Conversation 1 ─── * Message
Conversation 0..1 ─── 1 Order
Conversation 1 ─── 1..1 Chat turn transaction
```

Database constraints must enforce unique `(conversation_id, sequence)` and conversation ownership;
the schema evolves only through a versioned migration. No order, refund, coupon, approval or R1-R7
state is written by US4.
