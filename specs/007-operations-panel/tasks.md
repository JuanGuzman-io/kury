---

description: "Actionable implementation tasks for the Kuri Operations Panel"
---

# Tasks: Operations Panel

**Input**: Design documents from `/specs/007-operations-panel/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Critical user journeys, accessibility states and privacy boundaries are covered. No
isolated unit tasks are included for trivial presentational wrappers or framework delegation.

## Phase 1: Setup (Shared Frontend Infrastructure)

**Purpose**: Establish the web application foundation and visual language.

- [x] T001 [P] Add TanStack Query and required browser testing dependencies to `web/package.json`
- [ ] T002 [P] Configure shared TypeScript path aliases and strict client boundaries in `web/tsconfig.json`
- [x] T003 [P] Replace starter global styles with dispatch-ledger design tokens, typography, focus styles and reduced-motion rules in `web/app/globals.css`
- [x] T004 [P] Configure Spanish metadata, font loading and accessible document defaults in `web/app/layout.tsx`
- [x] T005 Create the application shell, navigation and responsive skip link in `web/components/layout/operations-shell.tsx`
- [ ] T006 Create reusable accessible primitives for buttons, badges, panels, dialog and status feedback in `web/components/ui/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create the typed API, query and state foundations shared by all panel journeys.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T007 [P] Define frontend-safe response types and type guards for orders, risk, timeline, traces and approvals in `web/lib/api/types.ts`
- [x] T008 [P] Implement bounded API client with base URL, simulated role header, timeout and safe transport errors in `web/lib/api/client.ts`
- [x] T009 [P] Implement Spanish mapping for validation, forbidden, not-found, conflict, unavailable and generic API errors in `web/lib/api/errors.ts`
- [x] T010 Configure QueryClient provider with bounded stale behavior and no automatic mutation retries in `web/lib/query/query-provider.tsx`
- [x] T011 Implement URL search-parameter parsing and serialization for city, status, page and refresh context in `web/lib/query/operations-search-params.ts`
- [x] T012 [P] Add Spanish formatters for dates, cents, city, status, risk and weather without eligibility/business calculations in `web/lib/formatters/operations-formatters.ts`
- [ ] T013 [P] Add deterministic UI fixtures for loading, empty, error, forbidden, risk, trace and approval states in `web/tests/fixtures/operations-fixtures.ts`
- [ ] T014 Add a testable browser entry and API mock boundary for critical panel flows in `web/tests/support/operations-test-harness.ts`

**Checkpoint**: The web client can make typed, safe, Spanish-facing requests and render every
required operation state without embedding domain rules.

---

## Phase 3: User Story 1 - Prioritize Active Orders (Priority: P1) 🎯 MVP

**Goal**: Give Operations a risk-ordered active order queue with fast scanning and explicit states.

**Independent Test**: Open `/orders` with fixtures containing active and terminal orders, verify only
active orders appear in backend order, inspect risk reasons, change page and refresh while retaining
filters.

### Tests for User Story 1

- [ ] T015 [P] [US1] Add interaction tests for active-only rendering, risk hierarchy, reason disclosure and empty/error states in `web/tests/orders/orders-page.test.tsx`
- [ ] T016 [P] [US1] Add browser flow test for city/status filtering, numbered pagination, manual refresh and 320 px no-overflow behavior in `web/tests/e2e/orders-flow.spec.ts`

### Implementation for User Story 1

- [x] T017 [P] [US1] Implement active order query hook for risk-ordered data and manual invalidation in `web/lib/query/use-active-orders.ts`
- [x] T018 [P] [US1] Implement city/status filter controls with URL synchronization and accessible labels in `web/components/orders/order-filters.tsx`
- [x] T019 [P] [US1] Implement risk level, score and reason presentation with text/icon non-color cues in `web/components/orders/risk-summary.tsx`
- [x] T020 [US1] Implement responsive order row/table transformation for desktop comparison and 320 px stacked briefs in `web/components/orders/order-list.tsx`
- [ ] T021 [US1] Implement numbered pagination, manual refresh feedback and preserved filter context in `web/components/orders/order-pagination.tsx`
- [x] T022 [US1] Compose Orders page with loading, empty, error, forbidden and success states in `web/components/orders/orders-view.tsx`
- [x] T023 [US1] Replace the starter home screen with an operations entry route preserving the shell in `web/app/page.tsx`

**Checkpoint**: `/orders` is independently usable for prioritizing active orders without detail or
approval dependencies.

---

## Phase 4: User Story 2 - Narrow and Inspect an Order (Priority: P1)

**Goal**: Provide a single order view containing operational truth and occurrence-ordered history.

**Independent Test**: Open `/orders/:orderId`, verify all safe operational fields, risk, timeline
ordering and explicit loading/not-found/error states at desktop and 320 px widths.

### Tests for User Story 2

- [ ] T024 [P] [US2] Add interaction tests for order summary, safe fields, timeline ordering and missing-order state in `web/tests/order-detail/order-detail-page.test.tsx`
- [ ] T025 [P] [US2] Add browser flow test for opening an order from the queue, returning to preserved filters and keyboard navigation in `web/tests/e2e/order-detail-flow.spec.ts`

### Implementation for User Story 2

- [x] T026 [P] [US2] Implement order detail and timeline query hooks with typed not-found handling in `web/lib/query/use-order-detail.ts`
- [x] T027 [P] [US2] Implement operational summary with safe courier/restaurant fields and Spanish formatters in `web/components/order-detail/order-summary.tsx`
- [x] T028 [US2] Implement occurrence-ordered event timeline with received-time diagnostic labels in `web/components/order-detail/order-timeline.tsx`
- [x] T029 [US2] Implement order detail loading, empty, not-found, error and success states in `web/app/orders/[orderId]/page.tsx`
- [ ] T030 [US2] Add accessible back navigation that restores Orders URL filters and selected context in `web/components/order-detail/order-detail-header.tsx`

**Checkpoint**: An operator can move from the prioritized queue to a complete, safe operational
detail and back without losing context.

---

## Phase 5: User Story 3 - Review Support History (Priority: P2)

**Goal**: Make conversations, tools, decisions and effects inspectable without exposing raw or
prohibited data.

**Independent Test**: Open an order with trace records, expand a tool record, verify safe details
and confirm collapsed/bounded behavior, PII absence and empty history states.

### Tests for User Story 3

- [ ] T031 [P] [US3] Add interaction tests for conversations, progressive trace disclosure, empty history and redacted content in `web/tests/order-detail/support-history.test.tsx`
- [ ] T032 [P] [US3] Add browser privacy/accessibility flow test for trace expansion, keyboard operation and no courier PII in `web/tests/e2e/support-history-flow.spec.ts`

### Implementation for User Story 3

- [x] T033 [P] [US3] Implement paginated order-trace query with safe error mapping in `web/lib/query/use-order-traces.ts`
- [x] T034 [P] [US3] Implement Spanish trace type/role/status labels and bounded detail formatter in `web/lib/formatters/trace-formatters.ts`
- [x] T035 [US3] Implement collapsible support history sections for conversations and trace events in `web/components/order-detail/order-support-panel.tsx`
- [x] T036 [US3] Implement accessible trace detail disclosure with keyboard focus and safe JSON-like key/value presentation in `web/components/order-detail/order-support-panel.tsx`
- [x] T037 [US3] Integrate support history into order detail with loading, empty, error and permission states in `web/app/orders/[orderId]/page.tsx`

**Checkpoint**: Operators can reconstruct support activity for an order without reading raw
assistant text as authority or seeing prohibited data.

---

## Phase 6: User Story 4 - Resolve Pending Approvals (Priority: P1)

**Goal**: Provide a deliberate, accessible approval queue with authoritative outcomes.

**Independent Test**: Open `/approvals`, review a pending request, confirm Approve and Reject,
verify pending state prevents duplicates, and verify obsolete/conflict/error feedback.

### Tests for User Story 4

- [ ] T038 [P] [US4] Add interaction tests for queue states, read-only permission behavior, confirmation and mutation outcomes in `web/tests/approvals/approvals-page.test.tsx`
- [ ] T039 [P] [US4] Add browser flow test for approve/reject confirmation, duplicate prevention and conflict/obsolete feedback in `web/tests/e2e/approvals-flow.spec.ts`

### Implementation for User Story 4

- [x] T040 [P] [US4] Implement pending approval query and post-resolution invalidation without optimistic success in `web/lib/query/use-approvals.ts`
- [ ] T041 [P] [US4] Implement approval status/action/amount/reason presentation with readable monetary formatting in `web/components/approvals/approval-row.tsx`
- [x] T042 [US4] Implement accessible approval confirmation dialog with consequence copy, pending state, Escape and focus restoration in `web/components/approvals/approval-confirmation-dialog.tsx`
- [ ] T043 [US4] Implement approve/reject mutation controls with disabled duplicate submission and Spanish result feedback in `web/components/approvals/approval-actions.tsx`
- [ ] T044 [US4] Implement read-only approval mode for non-OPS users with visible explanation while preserving backend authorization in `web/components/approvals/approval-read-only-notice.tsx`
- [x] T045 [US4] Compose Approvals page with numbered pagination and loading, empty, error, forbidden and success states in `web/app/approvals/page.tsx`

**Checkpoint**: Authorized operators can resolve approvals deliberately; unauthorized users cannot
mistake a disabled UI for permission and no action is shown as successful before the server result.

---

## Phase 7: Polish & Cross-Cutting Validation

**Purpose**: Validate the complete panel against constitution, contracts, privacy and responsive
quality gates.

- [ ] T046 [P] Add focused accessibility assertions for labels, focus visibility, dialog semantics and non-color status cues in `web/tests/accessibility/operations-accessibility.test.tsx`
- [ ] T047 [P] Add browser viewport matrix for 320 px and desktop layouts with horizontal-overflow assertions in `web/tests/e2e/responsive-panel.spec.ts`
- [ ] T048 [P] Add rendered-content privacy assertions for courier phone/document and unredacted trace data in `web/tests/privacy/panel-privacy.test.tsx`
- [ ] T049 [P] Add request contract fixtures for order, risk, trace and approval response shapes in `web/tests/contracts/operations-api.contract.test.ts`
- [ ] T050 Review visible loading, empty, success, error, forbidden, pending, obsolete and conflict states against `specs/007-operations-panel/quickstart.md`
- [ ] T051 Run `pnpm --filter web lint`, `pnpm --filter web build`, `pnpm build` and all critical browser tests; record evidence in `specs/007-operations-panel/quickstart.md`
- [ ] T052 Verify OpenAPI/shared-contract alignment, no frontend business-rule duplication, no secrets in browser bundles and no frontend scope expansion in `specs/007-operations-panel/plan.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; T001–T006 can run in parallel except shell composition T005/T006.
- **Foundational (Phase 2)**: Depends on Setup and blocks all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundation; MVP and entry point for later journeys.
- **User Story 2 (Phase 4)**: Depends on the Orders route/query contracts; can begin after Foundation but integrates with US1 navigation.
- **User Story 3 (Phase 5)**: Depends on order detail composition from US2 and existing US6 trace endpoints.
- **User Story 4 (Phase 6)**: Depends only on Foundation and US6 approval endpoints; can proceed in parallel with US2/US3 after Foundation.
- **Polish (Phase 7)**: Depends on all desired stories.

### User Story Dependencies

- **US1**: Foundation only; recommended MVP.
- **US2**: Foundation plus shared order contracts; integrates with US1 for navigation context.
- **US3**: US2 order detail shell plus US6 trace endpoint.
- **US4**: Foundation plus US6 approval endpoints; independent from order detail implementation.

### Parallel Opportunities

- T001–T004 and T007–T009 can run in parallel.
- T015/T016, T024/T025, T031/T032 and T038/T039 are independent test streams after their query boundaries exist.
- T017–T019 can run in parallel; T020–T023 compose the story after primitives exist.
- US4 query, row presentation and read-only notice can proceed in parallel with US2 detail work.
- T046–T049 can run in parallel after all critical views exist.

## Parallel Example: User Story 1

```text
T015: interaction coverage for active orders and risk
T016: browser flow for filters, pagination, refresh and 320 px
T017: active-order query hook
T018: filter controls
T019: risk presentation
```

## Implementation Strategy

### MVP First

1. Complete Setup and Foundation.
2. Complete US1: risk-prioritized active orders with filters, pagination and explicit states.
3. Validate `/orders` at 320 px and desktop with keyboard-only interaction.
4. Stop for a demonstrable operations queue before adding detail and approvals.

### Incremental Delivery

1. Add US2 order detail and timeline.
2. Add US3 support history and trace inspection.
3. Add US4 approval inbox and guarded mutations.
4. Complete privacy, accessibility, responsive and contract validation.

## Notes

- Every task includes an exact repository path and follows the required checkbox/ID format.
- Formatting and display helpers may transform values for Spanish presentation but must not decide
  risk, compensation, cancellation, ownership or approval eligibility.
- Browser tests are prioritized for complete critical journeys; small visual wrappers do not need
  standalone unit tests.
