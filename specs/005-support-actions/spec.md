# Feature Specification: Support Rules and Actions

**Feature Branch**: `005-support-actions`

**Created**: 2026-09-16

**Status**: Draft

**Input**: User description: "US 5 — Reglas de soporte y ejecución de acciones"

## Clarifications

### Session 2026-09-16

- Q: ¿Qué moneda debe usar US5 para calcular y aplicar los topes de cupones y reembolsos en Bogotá, Ciudad de México y Lima? → A: Todos los pedidos, cupones y reembolsos se calculan en USD, usando centavos enteros.
- Q: Cuando una cancelación es permitida automáticamente, ¿US5 debe cambiar inmediatamente el estado del pedido a `CANCELLED` mediante un evento persistido? → A: Debe persistir un evento de cancelación y proyectar el pedido a `CANCELLED`.
- Q: Cuando una compensación supera USD 8 y requiere aprobación, ¿US5 debe crear y persistir inmediatamente una solicitud `PENDING`, aunque la bandeja y resolución humana pertenezcan a US6? → A: Debe crear y persistir una solicitud `PENDING`; US6 gestionará su resolución.
- Q: ¿La clave de idempotencia debe generarse automáticamente a partir del tipo de acción, pedido y alternativa, sin aceptar una clave controlada por el usuario? → A: Debe generarse exclusivamente en backend con acción, `order_id`, alternativa y versión de regla; cualquier identificador externo solo sirve como correlación.
- Q: Cuando un pedido tiene más de 45 minutos de retraso, ¿el asistente debe exigir que el usuario elija explícitamente entre reembolso total y cupón del 30%, sin seleccionar una opción por defecto? → A: Debe exigir una elección explícita; si falta, debe mostrar ambas alternativas y solicitar selección.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cancel an order safely (Priority: P1)

As a Kuri Delivery user, I want to request cancellation so that the system permits it only
when the order is still within the applicable cancellation window.

**Why this priority**: Cancellation is a high-impact action that can create financial and
operational consequences if it is allowed after preparation or pickup.

**Independent Test**: Evaluate cancellation requests at each relevant order state and exact time
boundary, then verify the decision, projected state and absence of duplicate cancellation effects.

**Acceptance Scenarios**:

1. **Given** an order in `CREATED`, **When** the user requests cancellation, **Then** the order is
   cancelled without a charge.
2. **Given** an order in `ACCEPTED` for less than five minutes, **When** cancellation is requested,
   **Then** cancellation is allowed without a charge.
3. **Given** an order in `ACCEPTED` for exactly five minutes or longer, **When** cancellation is
   requested, **Then** it is rejected with a Spanish explanation and the order remains unchanged.
4. **Given** an order in `PICKED_UP` or any later terminal state, **When** cancellation is requested,
   **Then** it is rejected and no refund or cancellation is executed.

### User Story 2 - Evaluate late-order compensation (Priority: P1)

As a Kuri Delivery user, I want a late order to produce a consistent compensation option so that
I understand what support can offer without exceeding policy limits.

**Why this priority**: Late deliveries are a primary support driver and compensation is financially
sensitive.

**Independent Test**: Evaluate orders at just over 20 and 45 minutes of delay across different
totals, verify exact cent amounts and verify approval gating above USD 8.

**Acceptance Scenarios**:

1. **Given** an order delayed more than 20 minutes and no more than 45 minutes, **When** compensation
   is evaluated, **Then** the system offers a 15% coupon capped at USD 5.
2. **Given** an order whose 15% coupon exceeds USD 5, **When** compensation is evaluated, **Then**
   the returned coupon amount is exactly USD 5.
3. **Given** an order delayed more than 45 minutes, **When** compensation is evaluated, **Then**
   the user is shown full refund and a 30% coupon capped at USD 10 and must explicitly choose one;
   neither alternative is selected by default.
4. **Given** a coupon or refund amount greater than USD 8, **When** the action is requested, **Then**
   the decision is `REQUIRES_APPROVAL` and no financial action is executed.

### User Story 3 - Report missing items (Priority: P1)

As a Kuri Delivery user, I want to report missing items so that the value of those items can be
refunded within the allowed limit.

**Why this priority**: Incomplete orders require precise item-level calculations and are a direct
support use case.

**Independent Test**: Submit missing-item reports with valid, unknown, duplicated and over-limit
items and verify the resulting refund decision in exact cents.

**Acceptance Scenarios**:

1. **Given** a report identifying existing missing items, **When** it is evaluated, **Then** the
   refund equals the value of those items.
2. **Given** missing items whose value exceeds 50% of the order total, **When** the report is
   evaluated, **Then** the refund is capped at 50% of the order total.
3. **Given** a calculated missing-item refund greater than USD 8, **When** it is requested, **Then**
   the decision requires human approval and is not executed automatically.
4. **Given** an item not present in the order or reported more than once, **When** it is evaluated,
   **Then** the invalid portion is rejected without inflating the refund.

### User Story 4 - Execute an approved or eligible action once (Priority: P1)

As an operations system, I want support actions to be idempotent and structured so that retries
cannot create duplicate cancellations, refunds or coupons.

**Why this priority**: Retries are expected in conversational and distributed flows; duplicate
financial effects are unacceptable.

**Independent Test**: Submit the same logical action repeatedly and verify one resulting effect,
one stable decision and a structured result suitable for the assistant.

**Acceptance Scenarios**:

1. **Given** an eligible cancellation with a logical action key, **When** the same request is retried,
   **Then** the order is cancelled at most once and the repeated response is stable.
2. **Given** an eligible coupon or refund with a logical action key, **When** the request is retried,
   **Then** the benefit is issued or recorded at most once.
3. **Given** an action requiring approval, **When** it is submitted repeatedly, **Then** no financial
   effect is created and the same pending decision is returned.
4. **Given** an action for an order owned by another user or with private data in its context,
   **When** it is requested, **Then** it is rejected without exposing courier or restaurant personal
   information.

## Edge Cases

- Exact boundaries at 5 minutes, 20 minutes, 45 minutes and USD 8.
- Orders in `CREATED`, `ACCEPTED`, `COURIER_ASSIGNED`, `PICKED_UP`, `DELIVERED` and `CANCELLED`.
- Missing or inconsistent order timestamps, totals, item prices or item quantities.
- Zero-value orders, empty missing-item lists, duplicated item references and unknown item references.
- A delay calculation at the exact promised time and before any delay threshold.
- A full refund option that exceeds the approval threshold.
- Concurrent or repeated requests using the same and different logical action keys.
- An approval-required decision retried after a future approval result is available.
- Invalid action names, forged user identity, mismatched order ownership and prompt-injection text.
- Provider, persistence or downstream execution failure before and after an action is recorded.
- Attempts to include courier phone, identity document or private restaurant contact data in a
  decision, response or log.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST evaluate cancellation using the current order state and the time the
  order entered that state; it MUST allow `CREATED` and `ACCEPTED` requests only when `ACCEPTED`
  duration is strictly less than five minutes.
- **FR-002**: The system MUST reject cancellation from `PICKED_UP`, `DELIVERED` and `CANCELLED`,
  and MUST leave the order unchanged when cancellation is rejected.
- **FR-003**: The system MUST calculate a late-order coupon of 15% for delays strictly greater than
  20 minutes and up to 45 minutes, capped at USD 5.
- **FR-004**: The system MUST calculate and present the two compensation alternatives for delays
  strictly greater than 45 minutes: full refund or a 30% coupon capped at USD 10. It MUST require
  an explicit user choice and MUST NOT select an alternative by default.
- **FR-005**: The system MUST use integer USD cents for every monetary calculation, comparison,
  limit and persisted financial effect; it MUST never use floating-point money or perform an
  unspecified currency conversion.
- **FR-006**: The system MUST return `REQUIRES_APPROVAL`, persist one `PENDING` approval request
  and execute no financial effect whenever a refund or coupon exceeds USD 8.
- **FR-007**: The system MUST calculate a missing-item refund from the value of valid reported
  items and cap it at 50% of the order total.
- **FR-008**: The system MUST reject unknown, duplicated or otherwise invalid item references
  without increasing the refund amount.
- **FR-009**: The system MUST compose the missing-item 50% cap with the USD 8 approval threshold;
  a capped amount above USD 8 still requires approval.
- **FR-010**: The system MUST expose a consistent structured decision with an action, status,
  amount or alternatives when applicable, reason and approval requirement.
- **FR-011**: The system MUST distinguish `ALLOWED`, `REQUIRES_APPROVAL` and `REJECTED` decisions;
  only an allowed decision may execute automatically.
- **FR-012**: The system MUST execute cancellation, coupon and refund effects only after the
  applicable policy decision allows them; an allowed cancellation MUST persist a cancellation event
  and project the order to `CANCELLED`. The system MUST never let assistant text override a
  rejection or approval requirement.
- **FR-013**: The system MUST generate a canonical logical idempotency key exclusively on the
  backend from action type, order, selected alternative and policy version; any client-provided
  identifier MUST be correlation-only. Repeated requests with the canonical key MUST NOT create
  duplicate effects or approval requests. A pending approval request MUST be idempotent by the same
  key.
- **FR-014**: The system MUST preserve a stable structured result for idempotent retries, including
  the original decision and resulting effect when available.
- **FR-015**: The system MUST verify the trusted user context and order ownership before evaluating
  or executing a user action; body-provided identity MUST NOT authorize access.
- **FR-016**: The system MUST prevent courier phone numbers, identity documents and private
  restaurant contact data from appearing in action results, assistant responses or logs.
- **FR-017**: The system MUST reject invalid action names, malformed arguments, unsupported states
  and unavailable order data with controlled Spanish responses and no partial effect.
- **FR-018**: The system MUST keep cancellation, compensation and missing-item policy decisions
  independent from the language model; the assistant may request an action but MUST NOT decide its
  eligibility or amount.
- **FR-019**: The system MUST provide deterministic tests for every R1-R7 boundary, monetary cap,
  approval branch, rejection branch and idempotency outcome without requiring LLM, HTTP or a live
  database.
- **FR-020**: Critical support-action user flows MUST have end-to-end evidence for eligible
  cancellation, rejected cancellation, compensation approval gating, missing-item refund and retry
  idempotency.
- **FR-021**: User-visible action decisions, reasons, rejection messages and approval handoffs MUST
  be in Spanish; identifiers and internal code MUST remain in English.

### Key Entities

- **SupportDecision**: A deterministic policy outcome containing status, action, reason, amount or
  alternatives, approval requirement and a stable decision reference.
- **CancellationRequest**: A request to cancel an order, including requester, order, state timing,
  logical idempotency key and resulting decision.
- **CompensationRequest**: A delay-related request containing delay evidence, selected alternative,
  amount, cap and approval status.
- **MissingItemsReport**: A user report of missing order items with validated item references,
  calculated eligible value, 50% cap and approval status.
- **SupportActionEffect**: A recorded cancellation, coupon or refund result linked to its logical
  backend-generated logical action key and decision, guaranteeing at-most-once financial effect.
- **ApprovalRequest**: A persisted human-review handoff containing the proposed action, amount,
  reason, requester, logical action key and lifecycle state (`PENDING` initially); approval
  resolution remains outside this feature.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of evaluated requests at the 5, 20, 45 and USD 8 boundaries produce the documented
  decision without ambiguity.
- **SC-002**: 100% of repeated requests with the same logical action key produce at most one
  cancellation, coupon or refund effect.
- **SC-003**: 100% of compensation amounts respect their applicable USD 5, USD 10, 50% and USD 8
  limits before any effect is executed.
- **SC-004**: 100% of rejected or approval-required actions produce no automatic financial effect.
- **SC-005**: At least 95% of critical support-action test scenarios complete with a Spanish reason
  that an operations user can understand without consulting internal policy code.
- **SC-006**: No automated test or reviewed action response exposes courier phone, identity document
  or private restaurant contact data.
- **SC-007**: At least 95% of eligible support-action requests return a stable structured outcome
  within one second in the local deterministic test environment.
- **SC-008**: Critical user-flow tests cover eligible cancellation, cancellation rejection, both
  delay alternatives, missing-item caps, approval gating and idempotent retries.

## Assumptions

- Delay is measured from the promised delivery time using the same authoritative clock supplied to
  the policy evaluation; a delay is positive only after that instant.
- The 20-minute rule applies through the 45-minute boundary; the greater-than-45-minute rule
  supersedes it.
- Full refund is represented as the eligible order total and is subject to approval when it exceeds
  USD 8; this feature prepares the approval decision but does not implement human resolution.
- A delay greater than 45 minutes never selects a compensation alternative implicitly; the action
  remains awaiting an explicit user choice until one is provided.
- All orders in this feature are denominated in USD; no currency conversion or exchange-rate policy
  is part of US5.
- An item report may identify items by stable line/item reference. The system trusts only values
  already present on the order, never prices supplied by the user.
- Successful automatic effects and approval requests are recorded durably before returning a success
  result; an allowed cancellation is represented in the order event history before its success
  result is returned. Downstream provider integrations are represented by replaceable action
  boundaries.
- R7 applies to every support result, log and assistant-facing payload, including rejected actions.
- The frontend and the approval inbox are outside this feature; the API and assistant tools consume
  the structured decisions.

## Out of Scope

- Human approval inbox, approval/rejection UI and complete approval resolution lifecycle.
- Full audit trail and token/cost observability planned for later features.
- Frontend or chat UI changes.
- Real identity authentication, payment-provider integration, currency conversion policy and ML.
