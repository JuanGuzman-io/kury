---

description: "Actionable implementation tasks for human approvals and assistant traceability"
---

# Tasks: Human Approvals and Assistant Traceability

**Input**: Design documents from `/specs/006-human-approvals-audit/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Included for approval state transitions, revalidation, idempotency, redaction,
authorization and critical trace/approval user journeys. Trivial DTOs and module wiring receive
boundary validation only.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish shared contracts and configuration for approvals and trace records.

- [x] T001 [P] Add approval request, resolution, trace record and observability contracts in `packages/contracts/src/approvals-audit.ts`
- [x] T002 [P] Export approvals and trace contracts from `packages/contracts/src/index.ts`
- [x] T003 [P] Add bounded trace and approval configuration placeholders without secrets to `.env.example`
- [x] T004 [P] Add approval and trace endpoint schemas, status enums and safe errors to `specs/006-human-approvals-audit/contracts/openapi.yaml`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish framework-independent models, redaction, transaction and persistence boundaries.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T005 [P] Define approval lifecycle, resolution and trace discriminated types in `api/src/domain/audit/value-objects/audit-types.ts`
- [x] T006 [P] Define immutable approval context fingerprinting rules in `api/src/domain/audit/services/approval-context-fingerprint.ts`
- [x] T007 [P] Define redaction and bounded-payload policy without framework dependencies in `api/src/domain/audit/services/audit-redaction.ts`
- [ ] T008 [P] Define approval, action-effect and trace domain entities in `api/src/domain/audit/entities/`
- [ ] T009 [P] Define approval repository, trace repository and shared transaction ports in `api/src/application/audit/ports/`
- [ ] T010 [P] Define shared authorization and pagination query contracts in `api/src/application/audit/ports/audit-query.ports.ts`
- [x] T011 Create versioned approval, effect and trace tables with indexes and unique idempotency constraints in `api/src/infrastructure/database/typeorm/migrations/1770000000000-extend-approval-audit.ts`
- [x] T012 Register approval, effect and trace entities in `api/src/infrastructure/database/typeorm/entities/` and `api/src/infrastructure/database/typeorm/typeorm-options.ts`
- [ ] T013 Implement TypeORM repositories for guarded approval transitions and append-only traces in `api/src/infrastructure/database/typeorm/repositories/`
- [ ] T014 Implement the shared transaction adapter used by approval resolution and US5 event ingestion in `api/src/infrastructure/database/typeorm/typeorm-support-transaction.ts`
- [ ] T015 Adapt `IngestOrderEventUseCase` to participate in an existing transaction context while preserving its current standalone behavior in `api/src/application/orders/use-cases/ingest-order-event.use-case.ts`
- [ ] T016 Register repositories, transaction port, redaction service and audit providers in `api/src/infrastructure/http/http.module.ts`
- [x] T017 [P] Add approval and trace query DTOs with bounded fields in `api/src/infrastructure/http/dto/`

**Checkpoint**: Domain policies can produce safe approval decisions and the infrastructure can persist
them and trace records without coupling domain code to NestJS or TypeORM.

---

## Phase 3: User Story 1 - Resolve sensitive approvals (Priority: P1) 🎯 MVP

**Goal**: Let OPS operators approve or reject sensitive actions exactly once, after revalidation.

**Independent Test**: Create a pending request, approve it once and verify one effect; repeat
approval and verify no duplicate. Repeat with rejection and with a changed order context.

### Tests for User Story 1

- [ ] T018 [P] [US1] Add unit tests for `PENDING` to `APPROVED`, `REJECTED` and `OBSOLETE` transitions in `api/src/domain/audit/services/approval-policy.spec.ts`
- [ ] T019 [P] [US1] Add unit tests for concurrent terminal transition and repeated approval idempotency in `api/src/application/audit/services/approval-resolution.service.spec.ts`
- [ ] T020 [P] [US1] Add integration tests for atomic approval, action effect and order event behavior in `api/test/integration/approval-resolution.integration-spec.ts`
- [x] T021 [P] [US1] Add E2E tests for OPS-only approve/reject, stale context and repeated resolution in `api/test/e2e/approvals.e2e-spec.ts`

### Implementation for User Story 1

- [ ] T022 [P] [US1] Implement approval state transition policy and stale-context decision in `api/src/domain/audit/services/approval-policy.ts`
- [x] T023 [US1] Implement approval creation from US5 `REQUIRES_APPROVAL` decisions with context fingerprint in `api/src/application/audit/services/create-approval.service.ts`
- [ ] T024 [US1] Implement guarded approval resolution with revalidation and shared transaction boundary in `api/src/application/audit/services/approval-resolution.service.ts`
- [x] T025 [US1] Implement rejection resolution with no action effect in `api/src/application/audit/services/approval-resolution.service.ts`
- [x] T026 [US1] Link approved effects to their approval and preserve idempotent result identity in `api/src/application/support/services/support-action-orchestrator.service.ts`
- [x] T027 [US1] Add OPS-only approve and reject controllers with consistent safe errors in `api/src/infrastructure/http/controllers/approvals.controller.ts`
- [x] T028 [US1] Add approval request validation and Spanish resolution messages in `api/src/application/audit/services/approval.service.ts` and `api/src/infrastructure/http/dto/approval.dto.ts`

**Checkpoint**: A pending sensitive action can be reviewed, safely approved or rejected, and never
executes twice or executes against stale order context.

---

## Phase 4: User Story 2 - Monitor pending approvals (Priority: P1)

**Goal**: Provide a bounded operational approval queue with safe, deterministic results.

**Independent Test**: Create approvals in each state, list by status and pagination, and verify
only authorized OPS users receive redacted records.

### Tests for User Story 2

- [ ] T029 [P] [US2] Add contract tests for approval list and resolution responses in `api/test/contract/approvals.contract-spec.ts`
- [ ] T030 [P] [US2] Add integration tests for status filters, pagination and deterministic ordering in `api/test/integration/approval-query.integration-spec.ts`
- [ ] T031 [P] [US2] Add E2E tests for empty, invalid, forbidden and populated approval queue states in `api/test/e2e/approvals.e2e-spec.ts`

### Implementation for User Story 2

- [x] T032 [US2] Implement bounded approval listing by state with deterministic ordering in `api/src/application/audit/services/list-approvals.service.ts`
- [x] T033 [US2] Implement approval query repository projections that exclude courier and restaurant private data in `api/src/infrastructure/database/typeorm/repositories/typeorm-approval.repository.ts`
- [x] T034 [US2] Expose `GET /api/v1/approvals` with validation, pagination and OPS authorization in `api/src/infrastructure/http/controllers/approvals.controller.ts`
- [x] T035 [US2] Add bounded approval query validation and safe failure boundary in `api/src/infrastructure/http/dto/approval.dto.ts`

**Checkpoint**: OPS can reliably find pending work without unbounded queries or sensitive data.

---

## Phase 5: User Story 3 - Reconstruct assistant decisions (Priority: P1)

**Goal**: Persist and query a chronological, redacted trace of messages, LLM calls, tools,
decisions, approvals, effects and failures.

**Independent Test**: Run a support conversation containing a tool call and decision, retrieve its
trace by conversation and order, and verify every causal step is independently represented.

### Tests for User Story 3

- [x] T036 [P] [US3] Add unit tests for redaction, payload bounds and prohibited PII fields in `api/src/domain/audit/services/audit-redaction.spec.ts`
- [x] T037 [P] [US3] Add integration tests for append-only trace persistence and chronological ordering in `api/test/integration/audit-trace.integration-spec.ts`
- [ ] T038 [P] [US3] Add E2E tests for conversation and order trace reconstruction, provider failure and PII absence in `api/test/e2e/audit-trace.e2e-spec.ts`
- [ ] T039 [P] [US3] Add contract tests for trace response discriminators and bounded pagination in `api/test/contract/audit-trace.contract-spec.ts`

### Implementation for User Story 3

- [x] T040 [P] [US3] Implement append-only trace recording for messages, LLM calls, tools, decisions, approvals, effects and errors in `api/src/application/audit/services/audit-trace.service.ts`
- [x] T041 [US3] Instrument `ChatOrchestratorService` with provider/model, duration and safe failure trace records in `api/src/application/chat/services/chat-orchestrator.service.ts`
- [x] T042 [US3] Instrument tool invocation boundaries with bounded arguments/results and duration in `api/src/application/chat/services/`
- [ ] T043 [US3] Record deterministic US5 decisions and approval links independently of assistant text in `api/src/application/support/services/support-action-orchestrator.service.ts`
- [x] T044 [US3] Implement trace queries by conversation and order with stable pagination in `api/src/application/audit/services/audit-trace.service.ts`
- [x] T045 [US3] Expose redacted conversation and order trace endpoints with OPS authorization in `api/src/infrastructure/http/controllers/audit-trace.controller.ts`
- [ ] T046 [US3] Add safe trace error mapping and structured logging that never includes raw prompts or secrets in `api/src/infrastructure/http/filters/http-error.filter.ts` and `api/src/application/audit/services/audit-trace.service.ts`

**Checkpoint**: An OPS operator can reconstruct a support decision without inferring business rules
from free text and without seeing prohibited data.

---

## Phase 6: User Story 4 - Inspect order-linked support history (Priority: P2)

**Goal**: Make all redacted support history for an operational order queryable for US7.

**Independent Test**: Associate multiple conversations and actions with an order, query its history,
and verify chronological links, authorization and useful empty states.

### Tests for User Story 4

- [ ] T047 [P] [US4] Add integration tests for order-to-conversation/action trace relationships in `api/test/integration/order-audit.integration-spec.ts`
- [ ] T048 [P] [US4] Add E2E tests for cross-city OPS access, empty order history and forbidden roles in `api/test/e2e/order-audit.e2e-spec.ts`

### Implementation for User Story 4

- [x] T049 [US4] Implement order-linked trace aggregation without duplicating message or decision records in `api/src/application/audit/services/get-audit-trace.service.ts`
- [ ] T050 [US4] Add order detail support-history projection contract for the future operations panel in `packages/contracts/src/approvals-audit.ts`
- [x] T051 [US4] Expose order support history through the trace controller with bounded pagination and redacted data in `api/src/infrastructure/http/controllers/audit-trace.controller.ts`

**Checkpoint**: US7 has a stable backend surface for order-linked conversations, actions and audit.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Verify local reproducibility, contracts, performance, security and documentation.

- [x] T052 [P] Add approval/trace Swagger descriptions and examples in `api/src/infrastructure/http/controllers/`
- [ ] T053 [P] Add performance coverage for approval list and trace query p95 under bounded pagination in `api/test/performance/approvals-audit.performance-spec.ts`
- [ ] T054 [P] Add migration/restart and concurrent resolution validation to `api/test/integration/approvals-restart.integration-spec.ts`
- [x] T055 Run migration, unit, contract, integration, E2E, performance, lint and build validation and record evidence in `specs/006-human-approvals-audit/quickstart.md`
- [ ] T056 Verify OpenAPI alignment, redaction, OPS authorization, no frontend scope expansion and constitutional compliance in `specs/006-human-approvals-audit/plan.md`
- [ ] T057 Review and document the shared transaction boundary with US5, including failure and rollback behavior, in `specs/006-human-approvals-audit/research.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001–T004 are independent and can run in parallel.
- **Foundational (Phase 2)**: T005–T017 depend on the existing US4/US5 contracts and block all stories.
- **US1 (Phase 3)**: Depends on Foundation; MVP approval resolution.
- **US2 (Phase 4)**: Depends on approval persistence from US1 but can start query work after T013.
- **US3 (Phase 5)**: Depends on Foundation and existing conversation/chat boundaries; can proceed in parallel with US1/US2 after T013.
- **US4 (Phase 6)**: Depends on trace query capability from US3.
- **Polish (Phase 7)**: Depends on all desired stories.

### User Story Dependencies

- **US1 (P1)**: Foundation only; MVP.
- **US2 (P1)**: Foundation plus approval entity/repository; independent of trace implementation.
- **US3 (P1)**: Foundation plus existing US4 chat and US5 action boundaries.
- **US4 (P2)**: Depends on US3 trace aggregation and query services.

### Parallel Opportunities

- T001–T004 and T005–T010 can run in parallel.
- T018–T021, T029–T031 and T036–T039 are independent test streams once their contracts exist.
- US1 policy/resolution work and US3 trace-record work can proceed in parallel after Foundation.
- US2 query work can proceed in parallel with US3 instrumentation.
- T052–T054 are independent polish validation tasks.

## Parallel Example: User Story 1

```text
T018: approval lifecycle unit tests
T019: concurrency/idempotency unit tests
T020: atomic approval integration test
T021: approval endpoint E2E test
```

## Implementation Strategy

### MVP First

1. Complete Setup and Foundation.
2. Complete US1: create, approve, reject and obsolete approvals safely.
3. Validate US1 independently with unit, integration and E2E tests.
4. Stop for a demonstrable approval-control MVP before adding the full audit surface.

### Incremental Delivery

1. Add US2 approval queue.
2. Add US3 assistant trace and observability.
3. Add US4 order-linked support history for US7.
4. Complete performance, restart, OpenAPI and constitutional review.

## Notes

- Every task includes an exact repository path and uses the required checklist format.
- Code identifiers and commit messages remain English; documentation and operator-facing messages remain Spanish.
- The frontend is intentionally excluded from this feature.
- Do not mark T057 complete until event, effect and approval state share a tested transaction boundary.
