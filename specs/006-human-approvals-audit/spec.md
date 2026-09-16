# Feature Specification: Human Approvals and Assistant Traceability

**Feature Branch**: `006-human-approvals-audit`

**Created**: 2026-09-16

**Status**: Draft

**Input**: User description: "US 6 — Aprobaciones humanas y trazabilidad del asistente"

## Clarifications

### Session 2026-09-16

- Q: ¿Qué roles deben poder aprobar o rechazar solicitudes de compensación? → A: Solo `OPS`.
- Q: ¿La trazabilidad debe conservar el contenido completo de mensajes, argumentos y resultados, o debe aplicar redacción antes de persistirlos? → A: Contenido necesario acotado, con redacción de secretos y PII sensible.
- Q: ¿Qué debe ocurrir si el pedido cambia entre la creación de una aprobación y el momento en que el operador intenta aprobarla? → A: Marcarla como obsoleta y exigir una nueva aprobación.
- Q: ¿Debe un operador `OPS` poder consultar trazas de cualquier pedido o solo de pedidos asignados a su ciudad/equipo? → A: `OPS` puede consultar cualquier pedido operativo, con datos redactados.

## User Scenarios & Testing

### User Story 1 - Review and resolve sensitive approvals (Priority: P1)

As a member of Live Operations, I want to review compensation requests that require human
approval and approve or reject them, so that sensitive actions are controlled and never executed
only because an assistant requested them.

**Why this priority**: Compensation above the defined threshold has financial impact and must be
controlled before the operations panel can safely expose it.

**Independent Test**: Create a pending compensation request, retrieve it, approve it once and
verify one action execution; repeat approval and verify no second execution. Repeat with rejection
and verify that no action is executed.

**Acceptance Scenarios**:

1. **Given** a support decision requiring approval, **When** it is recorded, **Then** a pending
   request contains the order, action, amount, reason and originating conversation when available.
2. **Given** a pending request, **When** an authorized operator approves it, **Then** the system
   revalidates the current order context, executes the still-valid action, records the resolver and
   time, and marks the request approved.
3. **Given** a pending request whose order context changed, **When** an operator approves it,
   **Then** the request is marked obsolete, no effect is executed, and a new evaluation is required.
4. **Given** a pending request, **When** an authorized operator rejects it, **Then** it is marked
   rejected with resolver and time and no monetary action is executed.
5. **Given** an already resolved request, **When** an operator tries to resolve it again, **Then**
   the original resolution is preserved and no second effect occurs.

### User Story 2 - Monitor pending approvals (Priority: P1)

As an Operations member, I want to list pending approvals and filter them by status, so that I can
prioritize sensitive decisions and later consume them from the operations inbox.

**Why this priority**: Operators need a reliable queue of decisions requiring their intervention.

**Independent Test**: Create pending, approved and rejected requests, list by each status and verify
that results contain only matching requests with stable pagination and safe operational data.

**Acceptance Scenarios**:

1. **Given** approval requests in multiple states, **When** the operator lists pending requests,
   **Then** only `PENDING` requests are returned with order, action, amount, reason and timestamps.
2. **Given** an invalid status or pagination value, **When** the list is requested, **Then** the
   system returns a bounded, consistent validation error without querying unbounded data.
3. **Given** a request associated with a courier or restaurant, **When** it is listed or viewed,
   **Then** no phone, identity document or other private personal data is returned.

### User Story 3 - Reconstruct an assistant decision (Priority: P1)

As an Operations member, I want to inspect the complete trace of a support conversation and order,
so that I can understand what the user asked, what the assistant requested, what the domain decided,
and what action ultimately occurred.

**Why this priority**: Auditable decisions are required to investigate support outcomes, failures and
potential prompt-injection attempts.

**Independent Test**: Execute a conversation containing a user message, an LLM call, a tool call,
a domain decision and an assistant response; retrieve the trace by conversation and order and verify
that the sequence, arguments, results, decision and errors are reconstructable.

**Acceptance Scenarios**:

1. **Given** a conversation with messages and assistant activity, **When** its trace is requested,
   **Then** user and assistant messages, model calls, tool executions, decisions and errors appear
   in chronological order with their relationships.
2. **Given** a tool call with structured arguments and result, **When** it is recorded, **Then** its
   name, bounded arguments, result, outcome and duration are queryable without relying on free text.
3. **Given** an LLM call, **When** usage information is available, **Then** provider, model,
   latency, token counts and estimated cost are recorded; unavailable values are represented as
   unknown rather than invented.
4. **Given** a failure from the assistant provider or a tool, **When** the trace is retrieved,
   **Then** the failure is visible with a safe reason and no secret, prompt content beyond the
   configured retention boundary, or private personal data is exposed.

### User Story 4 - Inspect order-linked support history (Priority: P2)

As an Operations member, I want to see support conversations and sensitive-action history linked
to an order, so that the order detail provides the context needed to make the next decision.

**Why this priority**: Linking support activity to the operational order prevents operators from
switching between disconnected records.

**Independent Test**: Associate one or more conversations with an order, retrieve the order trace,
and verify that the conversations, tools, decisions and approval outcomes are linked without
revealing data from another user or order.

**Acceptance Scenarios**:

1. **Given** an order with multiple support interactions, **When** its support history is requested,
   **Then** associated conversations and action traces are returned in chronological order.
2. **Given** a trace for another user's order, **When** an unauthorized or mismatched user context
   requests it, **Then** no conversation content, tool arguments or decision details are disclosed.
3. **Given** an authorized `OPS` operator requests a trace for any operational order, **When** the
   trace is returned, **Then** the complete operational sequence is available within bounded limits
   and all sensitive personal data remains redacted.

## Edge Cases

- An approval may be approved or rejected only while it is `PENDING`; concurrent resolution attempts
  must result in at most one terminal resolution.
- The order may change status or ownership context between approval creation and approval resolution;
  the action must be re-evaluated and the request marked obsolete without execution when it differs.
- A pending approval may reference a conversation that no longer exists; the approval remains
  auditable with a nullable conversation reference and does not block safe resolution.
- A provider can return a timeout, rate limit, server error or malformed tool request; the failure
  must be recorded and must not create an unapproved effect.
- Token usage or estimated cost may be absent; the trace must preserve the call with explicit
  unknown metadata.
- Duplicate trace writes or retries must not create duplicate approval resolutions or duplicate
  action effects.
- Tool arguments and results may contain user-controlled text; stored and displayed values must be
  bounded, treated as untrusted data and free of courier and restaurant private information.
- Empty approval queues and conversations with no tool calls must return a useful empty state,
  not an error or fabricated activity.

## Requirements

### Functional Requirements

- **FR-001**: The system MUST create a `PENDING` approval request whenever a support action is
  evaluated as requiring human approval.
- **FR-002**: Each approval request MUST retain the order, action type, amount in integer cents,
  reason, policy version, originating conversation when available, creation time and current state.
- **FR-003**: The system MUST allow an authorized operator to list approval requests by status with
  bounded pagination and a deterministic ordering.
- **FR-004**: The system MUST allow an authorized operator to approve a pending request, revalidate
  the current order context, execute the action only when still valid, and record resolver identity
  and resolution time.
- **FR-005**: The system MUST mark a pending request obsolete and execute no effect when its order
  context differs from the context originally evaluated; a new evaluation is required.
- **FR-006**: The system MUST allow an authorized operator to reject a pending request without
  executing a monetary or order-changing effect.
- **FR-007**: The system MUST enforce a single terminal resolution per approval request, including
  under retries or concurrent approval/rejection attempts.
- **FR-008**: The system MUST prevent execution of a sensitive action while its approval request
  remains pending.
- **FR-009**: The system MUST record user and assistant messages separately from operational trace
  records, preserving role, content and timestamp for each message.
- **FR-010**: The system MUST record each LLM call with provider, model, status, duration and
  available token and estimated-cost metadata.
- **FR-011**: The system MUST record each tool execution with conversation/message relationship,
  tool name, bounded arguments, structured result, status, duration and timestamp.
- **FR-012**: The system MUST record deterministic domain decisions independently of assistant text,
  including action, status, amount, policy version and reason.
- **FR-013**: The system MUST record approval decisions, effect outcomes and safe failures so a
  conversation or order trace can be reconstructed chronologically.
- **FR-014**: The system MUST provide trace queries by conversation and by order, with stable
  ordering and bounded responses.
- **FR-015**: The system MUST enforce simulated role authorization for approval and trace operations;
  only `OPS` may approve or reject requests, and an authorized `OPS` operator may inspect any
  operational order trace. `SYSTEM` may perform non-human system work but must not resolve
  approvals. Role context may be simulated but must not be omitted.
- **FR-016**: The system MUST exclude courier phone numbers, identity documents and restaurant
  private data from approval, trace, tool and error responses.
- **FR-017**: The system MUST bound persisted message, argument and result content and redact
  secrets and sensitive personal data before storage or display.
- **FR-018**: The system MUST treat message content, tool arguments and provider output as untrusted
  data and MUST NOT allow trace content to authorize or execute an action.
- **FR-019**: The system MUST return safe, consistent errors for missing records, forbidden access,
  invalid transitions, provider failures and malformed trace data.
- **FR-020**: The system MUST preserve exact monetary values in integer cents and MUST NOT infer
  unavailable token usage, cost or provider metadata.
- **FR-021**: The system MUST keep approval and trace records across application restarts and make
  schema evolution through versioned migrations only.
- **FR-022**: The system MUST provide Spanish, human-readable reasons and resolution feedback while
  keeping code identifiers and internal contracts in English.

## Key Entities

- **Approval Request**: A pending or resolved human decision for a sensitive support action, linked
  to an order and optionally to a conversation, with amount, reason, policy version and resolution.
- **Conversation Message**: A user or assistant message belonging to a support conversation.
- **LLM Call Trace**: A record of one provider interaction, including model and available usage and
  timing metadata.
- **Tool Execution Trace**: A record of a requested business tool, its bounded input/output,
  status, duration and relationships.
- **Decision Trace**: A structured record of the deterministic policy decision that explains an
  allowed, rejected, approval-required or choice-required result.
- **Action Effect**: The single recorded outcome of an approved support action, linked to its
  idempotency identity and approval when applicable.

## Success Criteria

### Measurable Outcomes

- **SC-001**: 100% of compensation actions above USD 8 have a pending approval record before any
  effect can execute.
- **SC-002**: 100% of repeated resolution requests for the same approval produce at most one
  terminal approval state and at most one action effect.
- **SC-003**: An operator can find and open a pending approval, understand its reason and resolve it
  in under 60 seconds in usability testing using the available operational information.
- **SC-004**: At least 99% of completed assistant support flows expose a reconstructable sequence of
  message, model call, tool execution, decision and assistant response when the corresponding event
  occurred.
- **SC-005**: 100% of approval and trace responses pass automated checks that courier phone,
  identity-document and restaurant-private fields are absent.
- **SC-006**: 95% of approval-list and trace queries return a usable result within 500 ms for the
  local dataset and configured pagination limits.
- **SC-007**: 100% of provider and tool failures in critical support flows leave an auditable safe
  failure record and no unapproved monetary effect.

## Assumptions

- The simulated `OPS` and `SYSTEM` role context from earlier features remains the authorization
  boundary for this local deliverable; only `OPS` resolves approvals and may inspect operational
  traces across cities, subject to redaction.
- US4 conversations and messages, and US5 policy decisions and action effects, are the source
  records to which US6 adds trace and approval capabilities.
- Approval requests created without a conversation remain valid because actions may originate from
  an operational API request as well as chat.
- A resolved approval is immutable for audit purposes; corrections are represented by a new action
  or trace record rather than editing history.
- Trace payloads are bounded and retained for the local demonstration; secrets and sensitive PII
  are redacted before persistence. Long-term compliance retention and deletion policies are outside
  this feature.
- The frontend inbox and order-detail presentation are out of scope; this feature exposes the
  backend capabilities that US7 will consume.
- Streaming, external queues, real identity authentication and cloud deployment remain out of
  scope.
