---

description: "Actionable implementation tasks for deterministic support rules and actions"
---

# Tasks: Support Rules and Actions

**Input**: Design documents from `/specs/005-support-actions/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Included only for R1–R7 decisions, monetary boundaries, approval/idempotency behavior and critical support-action flows.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add shared contracts and configuration required by all support actions.

- [x] T001 [P] Add support action, decision status, alternative and sanitized result contracts in `packages/contracts/src/support-actions.ts`
- [x] T002 [P] Export support action contracts from `packages/contracts/src/index.ts`
- [x] T003 [P] Add policy version and support-action configuration placeholders without secrets to `.env.example`
- [x] T004 [P] Add support action schemas and error responses to `specs/005-support-actions/contracts/openapi.yaml`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish framework-independent policy inputs, money arithmetic, persistence boundaries and safe execution ports.

**⚠️ CRITICAL**: No user story implementation can begin until this phase is complete.

- [x] T005 [P] Define `SupportDecision`, action status and approval state value objects in `api/src/domain/support/value-objects/support-decision.ts`
- [x] T006 [P] Define integer USD-cent arithmetic and percentage/cap operations in `api/src/domain/support/value-objects/money.ts`
- [x] T007 [P] Define immutable support order context, line-item context and explicit-clock contracts in `api/src/domain/support/entities/support-order-context.ts`
- [x] T008 [P] Define action effect, approval request and missing-item report domain entities in `api/src/domain/support/entities/support-action.ts`
- [x] T009 [P] Define action effect repository and execution ports in `api/src/application/support/ports/support-action.ports.ts`
- [x] T010 [P] Define the canonical backend idempotency-key service contract in `api/src/application/support/ports/idempotency-key.port.ts`
- [x] T011 Create versioned support action, effect and approval tables with unique idempotency constraints in `api/src/infrastructure/database/typeorm/migrations/1760000000000-create-support-actions.ts`
- [x] T012 Register support entities and migration in `api/src/infrastructure/database/typeorm/entities/support-action.entities.ts` and `api/src/infrastructure/database/typeorm/typeorm-options.ts`
- [x] T013 Implement TypeORM persistence for effects and pending approvals in `api/src/infrastructure/database/typeorm/repositories/typeorm-support-action.repository.ts`
- [x] T014 Implement canonical backend idempotency key generation from action, order, alternative and policy version in `api/src/application/support/services/idempotency-key.service.ts`
- [x] T015 Add owned-order context lookup using existing order query capabilities in `api/src/application/support/services/support-order-context.service.ts`
- [x] T016 Wire support repositories, context service, key service and ports through `api/src/infrastructure/http/http.module.ts`

**Checkpoint**: Policies can receive safe order data, exact money and persistence ports without depending on HTTP, ORM details or the assistant.

---

## Phase 3: User Story 1 - Cancel an order safely (Priority: P1) 🎯 MVP

**Goal**: Allow only valid cancellations and represent an allowed cancellation as a persisted `CANCELLED` event.

**Independent Test**: Evaluate `CREATED`, `ACCEPTED` below five minutes, exactly five minutes, post-pickup and terminal orders; verify decisions, event projection and no duplicate cancellation.

### Tests for User Story 1

- [x] T017 [P] [US1] Add unit tests for cancellation boundaries in `api/src/domain/support/policies/support-policies.spec.ts`
- [x] T018 [P] [US1] Add unit tests for pickup and terminal cancellation rejection in `api/src/domain/support/policies/support-policies.spec.ts`
- [ ] T019 [P] [US1] Add integration tests for one persisted cancellation event and canonical retry idempotency in `api/test/integration/support-cancellation.integration-spec.ts`
- [x] T020 [P] [US1] Add E2E tests for allowed and rejected cancellation through the support action endpoint in `api/test/e2e/support-actions.e2e-spec.ts`

### Implementation for User Story 1

- [x] T021 [P] [US1] Implement cancellation eligibility and Spanish rejection reasons in `api/src/domain/support/policies/cancellation.policy.ts`
- [x] T022 [US1] Implement cancellation decision orchestration and ownership validation in `api/src/application/support/services/support-action-orchestrator.service.ts`
- [x] T023 [US1] Implement allowed cancellation as an idempotent `ORDER_STATUS_CHANGED` event with `CANCELLED` projection in `api/src/application/support/services/support-action-orchestrator.service.ts`
- [x] T024 [US1] Add cancellation action request/response DTO validation in `api/src/infrastructure/http/dto/support-action.dto.ts`
- [x] T025 [US1] Expose cancellation evaluation and execution through `api/src/infrastructure/http/controllers/support-actions.controller.ts`
- [x] T026 [US1] Connect `request_order_cancellation` from US4 to the support action service without allowing prompt text to bypass policy in `api/src/application/chat/services/future-action.tools.ts`

**Checkpoint**: A user can independently request cancellation; only eligible requests change the order and retries are stable.

---

## Phase 4: User Story 2 - Evaluate late-order compensation (Priority: P1)

**Goal**: Calculate capped delay compensation and require approval above USD 8 without issuing money prematurely.

**Independent Test**: Evaluate delays at 20, 45 and approval boundaries across order totals; verify both alternatives for delays over 45 minutes and explicit choice behavior.

### Tests for User Story 2

- [x] T027 [P] [US2] Add unit tests for strict delay boundaries in `api/src/domain/support/policies/support-policies.spec.ts`
- [x] T028 [P] [US2] Add unit tests for percentage caps using integer cents in `api/src/domain/support/policies/support-policies.spec.ts`
- [x] T029 [P] [US2] Add unit tests for approval boundary and explicit choice in `api/src/domain/support/policies/support-policies.spec.ts`
- [x] T030 [P] [US2] Add E2E tests for delay evaluation, alternative selection and approval-required execution in `api/test/e2e/support-actions.e2e-spec.ts`

### Implementation for User Story 2

- [x] T031 [P] [US2] Implement deterministic delay and compensation calculations with policy constants in `api/src/domain/support/policies/delay-compensation.policy.ts`
- [x] T032 [US2] Implement approval-gate composition after compensation calculation in `api/src/application/support/services/support-action-orchestrator.service.ts`
- [x] T033 [US2] Persist one `PENDING` approval request for amounts above USD 8 using the canonical key in `api/src/application/support/services/support-action-orchestrator.service.ts`
- [x] T034 [US2] Implement coupon and refund effect ports with a deterministic local adapter in `api/src/infrastructure/support/deterministic-action-adapters.ts`
- [x] T035 [US2] Connect `evaluate_delay_compensation` from US4 to structured compensation decisions in `api/src/application/chat/services/future-action.tools.ts`
- [x] T036 [US2] Add Spanish alternative, approval and rejection reasons to structured policy decisions in `api/src/domain/support/policies/`

**Checkpoint**: Delay compensation is calculated exactly, capped, approval-gated and safe to retry without a financial double effect.

---

## Phase 5: User Story 3 - Report missing items (Priority: P1)

**Goal**: Refund valid missing items from trusted order values, cap at 50% and apply the approval threshold.

**Independent Test**: Report valid, unknown, duplicate and over-limit line items; verify exact refund cents, cap and approval status.

### Tests for User Story 3

- [x] T037 [P] [US3] Add unit tests for valid, unknown, duplicate and empty line references in `api/src/domain/support/policies/support-policies.spec.ts`
- [x] T038 [P] [US3] Add unit tests for the 50% order-total cap and USD 8 approval composition in `api/src/domain/support/policies/support-policies.spec.ts`
- [x] T039 [P] [US3] Add unit tests proving refunds use trusted order values in `api/src/domain/support/policies/support-policies.spec.ts`
- [x] T040 [P] [US3] Add E2E tests for item refund, cap and approval-required missing-item flows in `api/test/e2e/support-actions.e2e-spec.ts`

### Implementation for User Story 3

- [x] T041 [P] [US3] Implement trusted line-item validation, duplicate rejection and missing-item refund calculation in `api/src/domain/support/policies/missing-items.policy.ts`
- [x] T042 [US3] Compose the 50% cap and USD 8 approval gate in `api/src/domain/support/policies/missing-items.policy.ts`
- [x] T043 [US3] Connect `report_missing_items` from US4 to the structured missing-item decision in `api/src/application/chat/services/future-action.tools.ts`
- [x] T044 [US3] Add missing-item request validation in `api/src/infrastructure/http/dto/support-action.dto.ts`

**Checkpoint**: Missing-item reports calculate only from order data, respect caps and cannot disclose or inflate item values.

---

## Phase 6: User Story 4 - Execute actions once and hand off approvals (Priority: P1)

**Goal**: Make all allowed effects and approval requests idempotent, authorized, privacy-safe and ready for US6.

**Independent Test**: Repeat cancellation, coupon, refund and approval-required requests; verify at-most-once effects, stable results, ownership rejection and no PII.

### Tests for User Story 4

- [ ] T045 [P] [US4] Add repository integration tests for unique action keys, effect persistence and one pending approval in `api/test/integration/support-actions.integration-spec.ts`
- [x] T046 [P] [US4] Add unit tests for canonical keys across action, order, alternative and policy version in `api/src/application/support/services/idempotency-key.service.spec.ts`
- [ ] T047 [P] [US4] Add unit tests for allowed, approval-required, rejected and needs-choice execution branches in `api/src/application/support/services/support-action-orchestrator.service.spec.ts`
- [x] T048 [P] [US4] Add E2E tests for repeated actions, cross-user rejection and approval handoff in `api/test/e2e/support-actions.e2e-spec.ts`

### Implementation for User Story 4

- [x] T049 [US4] Implement common support-action orchestration for evaluate, execute, approval and idempotent retry paths in `api/src/application/support/services/support-action-orchestrator.service.ts`
- [ ] T050 [US4] Enforce transaction boundaries so an effect/event and its result are recorded atomically in `api/src/infrastructure/database/typeorm/repositories/typeorm-support-action.repository.ts`
- [ ] T051 [US4] Add safe structured result sanitization that excludes courier phone/document and restaurant private data in `api/src/application/support/services/support-action-response.service.ts`
- [ ] T052 [US4] Add support action error mapping, trace-safe logging and rate limiting without user content in `api/src/infrastructure/http/controllers/support-actions.controller.ts` and `api/src/application/support/services/support-action-orchestrator.service.ts`
- [x] T053 [US4] Replace US4 future-action stubs with policy-backed tools while preserving the allow-list and one-round tool boundary in `api/src/application/chat/services/future-action.tools.ts`
- [x] T054 [US4] Register support-action providers and controllers in `api/src/infrastructure/http/http.module.ts`

**Checkpoint**: All support actions are policy-authoritative, idempotent and safe for US6 approval resolution.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Validate the complete feature, documentation and operational contract.

- [ ] T055 [P] Add shared support-action request, decision and result types to `packages/contracts/src/support-actions.ts` and align OpenAPI examples in `specs/005-support-actions/contracts/openapi.yaml`
- [ ] T056 [P] Add Swagger descriptions for action evaluation, execution, approval statuses and safe failure responses in `api/src/infrastructure/http/swagger.ts`
- [ ] T057 [P] Add the measured deterministic policy p95 scenario and threshold assertion in `api/test/performance/support-actions.performance-spec.ts`
- [x] T058 Run migration, build, lint, unit, contract, integration and E2E suites and record actual evidence in `specs/005-support-actions/quickstart.md`
- [ ] T059 Validate restart/continuation, event projection, idempotent retries, approval persistence, PII boundaries and OpenAPI alignment from the repository root in `specs/005-support-actions/quickstart.md`
- [ ] T060 Review the complete diff for domain isolation, integer money, fail-closed behavior, Spanish user messaging, no frontend scope expansion and constitution compliance in `specs/005-support-actions/plan.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001–T004 can run in parallel.
- **Foundational (Phase 2)**: T005–T010 can run in parallel; T011–T016 depend on the contracts and domain shapes and block all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundation; delivers the MVP cancellation flow.
- **User Story 2 (Phase 4)**: Depends on Foundation and the common action result shape; can proceed in parallel with US1 after T005–T016.
- **User Story 3 (Phase 5)**: Depends on Foundation and trusted order context; can proceed in parallel with US1/US2 after T005–T016.
- **User Story 4 (Phase 6)**: Depends on the policies from US1–US3 and finalizes common execution/idempotency integration.
- **Polish (Phase 7)**: Depends on all desired stories.

### User Story Dependencies

- **US1 (P1)**: Foundation only; MVP.
- **US2 (P1)**: Foundation only for policy evaluation; integrates with common execution service after US1 foundation.
- **US3 (P1)**: Foundation only for policy evaluation; integrates with common execution service after US1 foundation.
- **US4 (P1)**: Depends on US1–US3 policy decisions to provide the complete action executor and approval handoff.

### Parallel Opportunities

- T001–T004 are independent setup changes.
- T005–T010 are independent domain/port definitions.
- Within US1, cancellation policy tests and HTTP contract work can proceed separately from persistence tests.
- Within US2 and US3, policy tests can run in parallel with DTO/contract work.
- T045–T048 are independent validation streams once the common result shape is stable.
- T055–T057 are independent polish tasks.

## Parallel Example: User Story 1

```text
T017/T018: cancellation policy boundary and rejection tests
T019: cancellation persistence/idempotency integration test
T020: cancellation endpoint E2E test
T021: cancellation policy implementation
```

## Parallel Example: User Story 2

```text
T027/T028/T029: delay, cap and approval boundary tests
T030: end-to-end compensation flow
T031: deterministic compensation policy
T036: Spanish structured response mapping
```

## Implementation Strategy

### MVP First

1. Complete Setup and Foundation.
2. Implement US1 cancellation policy, event execution and idempotency.
3. Run US1 unit, integration and E2E validation.
4. Stop for a demonstrable cancellation MVP before adding financial actions.

### Incremental Delivery

1. Add US2 delay compensation and approval persistence.
2. Add US3 missing-item refunds and combined caps.
3. Add US4 common action orchestration, retries and privacy hardening.
4. Run complete local validation and document evidence.

## Notes

- Every task has a sequential ID and explicit file path.
- `[P]` is used only where the task can proceed independently without sharing an incomplete file dependency.
- Unit tests target business decisions and critical failure branches; trivial framework wiring is validated through contract or E2E tests.
- Approval resolution and the approval inbox remain US6 scope.
