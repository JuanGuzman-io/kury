---

description: "Actionable implementation tasks for order risk assessment"
---

# Tasks: Order Risk Assessment

**Input**: Design documents from `/specs/003-risk-assessment/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Included because the specification requires critical rule, contract, integration and E2E evidence. Tests are limited to meaningful business decisions and critical user flows.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare the existing monorepo surfaces for the risk feature without changing `web/`.

- [X] T001 [P] Verify the existing API path aliases and source inclusion are sufficient for the risk feature in `api/tsconfig.json`
- [X] T002 [P] Add public risk enums and response type placeholders to `packages/contracts/src/order-risk.ts`
- [X] T003 [P] Add the risk endpoint response schemas to `specs/003-risk-assessment/contracts/openapi.yaml`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish shared boundaries and validated configuration before implementing user stories.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T004 Define the framework-independent risk context, assessment and rule configuration ports in `api/src/domain/risk/value-objects/risk-rule-config.ts`
- [X] T005 [P] Define the application query port for risk-enriched order contexts in `api/src/application/orders/ports/order-query-repository.port.ts`
- [X] T006 Add validated default risk configuration, city timezone mapping and active-status constants in `api/src/domain/risk/value-objects/risk-rule-config.ts`
- [X] T007 Wire the risk dependencies through the existing Nest module without importing framework types into `api/src/infrastructure/http/http.module.ts`
- [X] T008 Update shared contract exports and API package references for risk types in `packages/contracts/src/index.ts` and `api/package.json`

**Checkpoint**: Shared risk types, ports and configuration are available; no persistence schema change is required.

---

## Phase 3: User Story 1 - Entender el riesgo de un pedido activo (Priority: P1) 🎯 MVP

**Goal**: Return deterministic level, score and Spanish explanations for every active order detail.

**Independent Test**: Assess fixed contexts repeatedly and query an active order detail, verifying risk fields, explanations, terminal behavior, privacy and immutability.

### Tests for User Story 1

- [X] T009 [US1] Add unit tests for weather, peak-hour timezone conversion and strict boundaries in `api/src/domain/risk/services/risk-assessment.service.spec.ts`
- [X] T010 [US1] Add unit tests for preparation tiers, status duration, remaining time, delayed scoring and LOW/MEDIUM/HIGH classification in `api/src/domain/risk/services/risk-assessment.service.spec.ts`
- [X] T011 [US1] Add unit tests for missing restaurant data, invalid context, Spanish reason ordering, PII exclusion and input immutability in `api/src/domain/risk/services/risk-assessment.service.spec.ts`

### Implementation for User Story 1

- [X] T012 [US1] Implement immutable risk assessment output and level classification in `api/src/domain/risk/entities/risk-assessment.ts`
- [X] T013 [US1] Implement the deterministic rule engine with explicit clock, cumulative weights and stable Spanish reasons in `api/src/domain/risk/services/risk-assessment.service.ts`
- [X] T014 [US1] Add the safe risk response DTO and Swagger decorators for level, score and reasons in `api/src/infrastructure/http/dto/risk.response.dto.ts`
- [X] T015 [US1] Build a risk context and enrich the US2 detail response in `api/src/infrastructure/database/typeorm/repositories/typeorm-order-query.repository.ts`
- [X] T016 [US1] Inject the risk assessment dependency and use the read-time clock boundary in `api/src/infrastructure/database/typeorm/repositories/typeorm-order-query.repository.ts`
- [X] T017 [US1] Add risk to the shared order detail contract in `packages/contracts/src/order-risk.ts` and `packages/contracts/src/index.ts`
- [X] T018 [US1] Document the risk-enriched detail response and error behavior in `specs/003-risk-assessment/contracts/openapi.yaml`
- [X] T019 [US1] Add a critical detail contract test for risk fields, Spanish reasons and forbidden private fields in `api/test/contract/order-risk.contract-spec.ts`
- [X] T020 [US1] Add an end-to-end detail flow test covering active, terminal, missing-role and invalid-context outcomes in `api/test/e2e/order-risk.e2e-spec.ts`

**Checkpoint**: User Story 1 is independently testable through the pure engine and the order detail endpoint.

---

## Phase 4: User Story 2 - Detectar el deterioro del riesgo con el tiempo (Priority: P1)

**Goal**: Recalculate risk on each read and use updated projected context after accepted events without mutating history.

**Independent Test**: Evaluate one order at controlled instants before and after its promise threshold, then after a status event, verifying changed assessment and unchanged event/projection records.

### Tests for User Story 2

- [X] T021 [US2] Add integration tests for read-time deterioration, delayed boundary and status-context refresh against PostgreSQL in `api/test/integration/order-risk.integration-spec.ts`
- [X] T022 [US2] Add a regression test proving risk reads do not mutate order events, projection version or timestamps in `api/test/integration/order-risk.integration-spec.ts`

### Implementation for User Story 2

- [X] T023 [US2] Extend the order risk query port with detail and active-list context requirements in `api/src/application/orders/ports/order-query-repository.port.ts`
- [X] T024 [US2] Implement repository loading of status timing, accepted timestamp, restaurant average and safe order fields in `api/src/infrastructure/database/typeorm/repositories/typeorm-order-query.repository.ts`
- [X] T025 [US2] Compose the risk context from US1 projected data and event history without changing reducers in `api/src/infrastructure/database/typeorm/repositories/typeorm-order-query.repository.ts`
- [X] T026 [US2] Ensure detail evaluation uses an explicit server evaluation instant and preserves US2 delayed/projection semantics in `api/src/infrastructure/database/typeorm/repositories/typeorm-order-query.repository.ts`
- [X] T027 [US2] Wire the read-time risk service and active-risk use case in `api/src/infrastructure/http/http.module.ts`

**Checkpoint**: Risk changes with time and accepted events while durable order history remains unchanged.

---

## Phase 5: User Story 3 - Priorizar pedidos activos por riesgo (Priority: P1)

**Goal**: Provide a paginated operational queue containing only active orders, sorted deterministically by risk priority.

**Independent Test**: Query a seeded set containing LOW, MEDIUM, HIGH and terminal orders, verify filters, pagination, summary fields, ordering, reasons and permission denial.

### Tests for User Story 3

- [X] T028 [P] [US3] Add contract tests for `GET /api/v1/orders/at-risk`, pagination, active-status filtering, query validation and safe error responses in `api/test/contract/order-risk.contract-spec.ts`
- [X] T029 [P] [US3] Add integration tests for risk ordering, deterministic tie-breakers, combined filters and empty pages in `api/test/integration/order-risk.integration-spec.ts`
- [X] T030 [P] [US3] Add an end-to-end critical operations flow for prioritized listing, detail handoff, terminal exclusion and unauthorized access in `api/test/e2e/order-risk.e2e-spec.ts`

### Implementation for User Story 3

- [X] T031 [US3] Add the paginated active-risk query and safe summary result types to `api/src/application/orders/ports/order-query-repository.port.ts`
- [X] T032 [US3] Implement active-only filtered context retrieval and deterministic tie-break data in `api/src/infrastructure/database/typeorm/repositories/typeorm-order-query.repository.ts`
- [X] T033 [US3] Implement risk-enriched active list composition, pagination metadata and risk ordering in `api/src/application/orders/use-cases/list-at-risk-orders.use-case.ts`
- [X] T034 [US3] Add `GET /api/v1/orders/at-risk` with US2 query validation, OPS/SYSTEM authorization and Swagger metadata in `api/src/infrastructure/http/controllers/orders.controller.ts`
- [X] T035 [US3] Add the risk-enriched summary/list response DTOs and pagination decorators in `api/src/infrastructure/http/dto/order-list.response.dto.ts` and `api/src/infrastructure/http/dto/risk.response.dto.ts`
- [X] T036 [US3] Add shared paginated active-risk contracts in `packages/contracts/src/order-risk.ts`
- [X] T037 [US3] Align the checked-in OpenAPI active-risk path, filters, pagination and schemas with Nest Swagger DTOs in `specs/003-risk-assessment/contracts/openapi.yaml`

**Checkpoint**: User Story 3 is independently testable as a bounded, prioritized operations queue.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validate the complete feature and document operational handoff without expanding scope.

- [ ] T038 [P] Add focused structured logging that records risk evaluation duration and trace ID without logging order PII in `api/src/infrastructure/http/filters/trace-id.middleware.ts`
- [X] T039 [P] Verify the risk route and deterministic engine behavior are exposed through the existing local Swagger setup in `api/src/infrastructure/http/swagger.ts`
- [ ] T040 Run lint, build and focused risk unit/contract/integration/E2E suites and record actual evidence in `specs/003-risk-assessment/quickstart.md`
- [ ] T041 Run the 1,500-order warmed performance scenario and document measured p95, query plan and any justified migration in `api/test/performance/order-risk.performance-spec.ts`
- [X] T042 Review the risk response for PII, prompt/model metadata, integer-cent preservation and simulated-role authorization in `api/src/infrastructure/http/dto/risk.response.dto.ts`
- [ ] T043 Validate the complete quickstart and Swagger/OpenAPI alignment from the repository root in `specs/003-risk-assessment/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; T001–T003 can run in parallel.
- **Foundational (Phase 2)**: Depends on Setup; T004–T006 can run in parallel, then T007–T008 wire them.
- **User Stories (Phases 3–5)**: Depend on Phase 2. US2 depends on US1's risk engine and detail context; US3 depends on the engine and US2 summary contract.
- **Polish (Phase 6)**: Depends on all desired story checkpoints.

### User Story Dependencies

- **US1 (P1)**: Depends on Foundational; delivers the MVP risk engine and detail enrichment.
- **US2 (P1)**: Depends on US1's engine; verifies time/event recalculation and non-mutation.
- **US3 (P1)**: Depends on US1 and US2 read contracts; delivers the prioritized list.

### Parallel Opportunities

- T028–T030 are parallel test streams after their respective ports are stable; T009–T011 and T021–T022 should be sequenced because each group shares a file.
- T032 can proceed in parallel with T034–T036 once the public contract shape is agreed.
- T038–T039 are independent polish tasks.

## Parallel Example: User Story 1

```text
T009: Unit boundaries for weather, peak hour and strict comparisons
T010: Unit composition for preparation, duration, remaining time and levels
T011: Unit failure/privacy/immutability coverage
```

## Parallel Example: User Story 3

```text
T028: Contract and validation tests
T029: Integration ordering/filter tests
T030: E2E prioritized operations flow
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Setup and Foundational phases.
2. Implement and validate the pure deterministic engine.
3. Enrich order detail with read-time risk.
4. Stop and validate US1 independently before adding list prioritization.

### Incremental Delivery

1. Deliver US1: engine plus detail risk.
2. Deliver US2: time/event recalculation with durable non-mutation evidence.
3. Deliver US3: paginated active-risk queue and operational handoff.
4. Run cross-cutting security, performance, Swagger and quickstart validation.

## Notes

- Every task uses the required checkbox/ID format and includes an exact repository path.
- `[P]` marks work that can be parallelized without depending on incomplete tasks; same-file test tasks should be scheduled carefully in one checkout.
- No frontend task is included because US3 explicitly excludes `web/`.
- No migration task is included because risk is read-time; add one only if measured query evidence justifies it and keep it versioned.
