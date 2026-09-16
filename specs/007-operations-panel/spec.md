# Feature Specification: Operations Panel

**Feature Branch**: `007-operations-panel`

**Created**: 2026-09-16

**Status**: Draft

**Input**: User description: "US 7 — Panel de Operaciones"

## Clarifications

### Session 2026-09-16

- Q: ¿Cómo debe paginarse la lista de pedidos y la bandeja de aprobaciones? → A: Paginación numerada con controles “Anterior” y “Siguiente”.
- Q: ¿Cómo debe actualizarse la información mientras el operador permanece en el panel? → A: Actualización manual con botón visible y preservación de filtros.
- Q: ¿Debe requerirse confirmación antes de aprobar y antes de rechazar una solicitud? → A: Confirmación para aprobar y rechazar.
- Q: ¿Cómo debe mostrarse el panel cuando el usuario no tiene permisos OPS para resolver aprobaciones? → A: Modo lectura con acciones deshabilitadas y explicación visible.

## User Scenarios & Testing

### User Story 1 - Prioritize active orders (Priority: P1)

As a Live Operations team member, I want to see active orders ordered by operational risk, so I
can focus first on orders most likely to require intervention.

**Why this priority**: It is the panel's primary operational value.

**Independent Test**: With active, delivered and cancelled orders available, open Orders and verify
only active orders appear, highest risk appears first, and each risk has a readable explanation.

**Acceptance Scenarios**:

1. **Given** active, delivered and cancelled orders exist, **When** the operator opens Orders,
   **Then** only `CREATED`, `ACCEPTED`, `COURIER_ASSIGNED` and `PICKED_UP` orders appear.
2. **Given** orders with different risk levels, **When** the list loads, **Then** it follows
   `HIGH`, `MEDIUM`, `LOW` priority and the backend's deterministic tie-breaker.
3. **Given** an order has risk reasons, **When** the operator inspects it, **Then** its level,
   score and human-readable explanation are available.

### User Story 2 - Narrow and inspect an order (Priority: P1)

As an Operations team member, I want to filter orders and open one detailed view, so I can
understand its situation without consulting several screens.

**Why this priority**: It directly reduces the time required to make an operational decision.

**Independent Test**: Apply city and status filters, open a result, and verify its operational
data, timeline, risk and support history are visible together.

**Acceptance Scenarios**:

1. **Given** orders from BOG, MEX and LIM exist, **When** the operator selects a city, **Then**
   only that city remains and the filter is visibly active.
2. **Given** active orders in multiple statuses exist, **When** the operator selects a status,
   **Then** the list updates without a manual page reload.
3. **Given** an order is selected, **When** its detail opens, **Then** status, city, restaurant,
   safe courier information, promised time, total, weather and risk are shown.
4. **Given** events arrived out of order, **When** the timeline is displayed, **Then** events are
   ordered by occurrence time, not receipt time.

### User Story 3 - Review support history (Priority: P2)

As an Operations team member, I want to inspect conversations and tool calls linked to an order,
so I can understand what the assistant checked or proposed.

**Why this priority**: It prevents repeated or contradictory support actions.

**Independent Test**: Open an order with a support conversation, expand tool activity, and verify
safe status, result and decision details are shown without prohibited data.

**Acceptance Scenarios**:

1. **Given** conversations are associated with an order, **When** its detail opens, **Then** the
   conversations appear with readable timestamps and roles.
2. **Given** a conversation has tool executions, **When** one is expanded, **Then** tool name,
   status and safe result or decision are shown.
3. **Given** trace content is sensitive or large, **When** it is shown, **Then** it remains
   redacted and bounded and raw JSON is not shown by default.

### User Story 4 - Resolve pending approvals (Priority: P1)

As an authorized Operations team member, I want to review and resolve pending approvals, so
compensation actions remain controlled and their outcome is clear.

**Why this priority**: Sensitive actions require human control.

**Independent Test**: Open a pending approval, review its action, amount and reason, approve or
reject it, and verify the authoritative resulting state and feedback.

**Acceptance Scenarios**:

1. **Given** pending approvals exist, **When** the operator opens Approvals, **Then** order,
   action, amount, reason and creation time are shown.
2. **Given** a pending approval is selected, **When** the operator chooses Approve, **Then** its
   consequence is stated before confirmation and the resulting backend state is reflected.
3. **Given** a pending approval is selected, **When** the operator chooses Reject and confirms,
   **Then** it becomes rejected, no monetary action is represented as executed, and the queue
   updates.
4. **Given** a request is stale or already resolved, **When** the operator submits a resolution,
   **Then** the UI preserves the server state and explains the next available action.

## Edge Cases

- Loading, empty, failed and permission-denied states MUST be explicit for Orders, Order Detail
  and Approvals.
- Refresh MUST preserve active filters and the selected order when it remains valid.
- An order or approval removed between list and selection MUST show a recoverable not-found state.
- A stale approval MUST never be shown as successfully executed.
- Missing risk reasons, conversations or events MUST produce an informative empty state.
- Long identifiers and trace content MUST wrap or truncate without horizontal scrolling.
- The interface MUST work at 320 px without horizontal scrolling.
- Keyboard users MUST reach filters, rows, detail sections, dialogs and actions in logical order;
  dismissible dialogs return focus to their trigger.
- Risk and status MUST use text or icons in addition to color.
- Users without resolution permission MUST receive an explicit read-only explanation rather than
  an unexplained missing or inert action.

## Requirements

### Functional Requirements

- **FR-001**: The system MUST provide an Orders view containing only active orders and showing
  status, city, promised time, delay state and risk level/score.
- **FR-002**: Orders MUST support city filters for BOG, MEX and LIM and status filters for
  CREATED, ACCEPTED, COURIER_ASSIGNED and PICKED_UP.
- **FR-003**: Orders MUST use backend risk ordering and MUST NOT calculate or override risk locally.
- **FR-004**: Each visible risk assessment MUST expose a human-readable explanation.
- **FR-005**: Order detail MUST show status, city, restaurant, safe courier data, promised time,
  total amount, weather, risk and relevant timestamps.
- **FR-006**: The timeline MUST be ordered by occurrence time and distinguish occurrence from
  receipt time when both are available.
- **FR-007**: Detail MUST show conversations and associated tool executions, decisions and safe
  results with progressive disclosure.
- **FR-008**: Approvals MUST show pending requests with action, amount, reason, order and creation
  time.
- **FR-009**: Authorized operators MUST be able to approve or reject pending requests through the
  existing backend operations, with confirmation for consequential actions.
- **FR-010**: The interface MUST reflect the authoritative backend result and never present a
  failed request as successful.
- **FR-011**: Orders, Order Detail and Approvals MUST provide visible loading, empty, success,
  error and permission-denied feedback.
- **FR-012**: The interface MUST use semantic controls, accessible names, visible focus, readable
  contrast, non-color status cues and usable touch targets consistent with WCAG 2.2 AA.
- **FR-013**: The interface MUST remain usable at 320 px and larger viewports without horizontal
  scrolling.
- **FR-014**: The interface MUST never expose courier phone/document data, restaurant private
  data, secrets or unredacted trace payloads.
- **FR-015**: The interface MUST NOT implement cancellation, compensation, approval eligibility or
  risk rules locally.
- **FR-016**: Refreshes and filter changes MUST show pending feedback and preserve valid user
  context.
- **FR-017**: Orders and approvals MUST use bounded numbered pagination with accessible “Anterior”
  and “Siguiente” controls, preserving active filters when changing pages.
- **FR-018**: Orders and approvals MUST provide a visible manual refresh control, preserve active
  filters and selection when valid, and show a pending state while refreshed data is requested.
- **FR-019**: Approval resolution MUST require an accessible confirmation step for both Approve and
  Reject, state the consequence in Spanish, prevent duplicate submission while pending, and return
  focus to the triggering control when safely dismissed.
- **FR-020**: Users without OPS permission MUST be able to see approval information in read-only
  mode when the backend permits viewing, while resolution controls remain disabled with a visible
  Spanish explanation; the interface MUST never treat disabled controls as an authorization
  boundary.

### Key Entities

- **Operational order**: Active order with projected status, location, timing, weather, amount and
  backend risk assessment.
- **Order event**: Lifecycle event rendered in the chronological timeline.
- **Risk assessment**: Backend-provided level, score and human-readable reasons.
- **Support conversation**: Order-linked messages and safe assistant activity.
- **Approval request**: Human-control request with action, amount, reason, status and resolution.
- **UI operation state**: Loading, empty, success, error or permission-denied state of a journey.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Operators identify the highest-priority active order and its reason within 15 seconds
  in at least 90% of usability attempts.
- **SC-002**: Operators filter by city/status and open the intended detail within 30 seconds in at
  least 90% of attempts.
- **SC-003**: Operators resolve a valid pending approval in no more than three intentional actions
  after opening it, excluding confirmation.
- **SC-004**: At least 95% of critical panel interactions show an explicit loading, success,
  error, empty or permission-denied outcome.
- **SC-005**: All critical panel journeys work with keyboard only and at a 320 px viewport without
  horizontal scrolling.
- **SC-006**: Automated privacy checks find no courier phone, identity document, secret or
  unredacted private trace data in panel responses or rendered details.
- **SC-007**: 100% of approval attempts display the backend outcome and never represent rejected,
  obsolete or failed actions as executed.

## Assumptions

- Backend endpoints and shared contracts from US1–US6 are available locally.
- The existing simulated role context is used; real identity authentication is out of scope.
- Interface labels, feedback and empty/error messages are Spanish.
- Backend remains authoritative for risk, permissions, order state and support actions.
- New end-user chat composition is deferred to US8; US7 displays existing conversations/traces.
- Data uses bounded pagination and on-demand refresh; live streaming is out of scope.

## Out of Scope

- End-user chat composition or simulation.
- Real authentication, identity management or city-scoped authorization.
- Server-sent events, WebSockets or live courier maps.
- Courier reassignment, direct business-rule calculations and cloud deployment.
- Mobile-native applications.
