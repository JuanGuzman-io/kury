---

description: "Actionable implementation tasks for the conversational support assistant"
---

# Tasks: Conversational Support Assistant

**Input**: Design documents from `/specs/004-conversational-assistant/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Included for critical orchestration, ownership, privacy, fail-closed and end-to-end chat flows. Trivial DTOs and framework wiring do not receive isolated unit tests.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare shared contracts and API structure for the chat feature.

- [x] T001 [P] Add chat request, response, intent and tool result types in `packages/contracts/src/chat.ts`
- [x] T002 [P] Export chat contracts from `packages/contracts/src/index.ts`
- [x] T003 [P] Add the `/api/v1/chat` request/response and security schemas to `specs/004-conversational-assistant/contracts/openapi.yaml`
- [x] T004 [P] Add bounded input and trusted-user header documentation to `.env.example`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish durable conversation storage, identity context and provider/tool ports before user stories.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T005 [P] Define conversation and message TypeORM entities with ownership, timestamps and sequence constraints in `api/src/infrastructure/database/typeorm/entities/conversation.entities.ts`
- [x] T006 [P] Create the versioned conversations/messages migration with unique `(conversation_id, sequence)` in `api/src/infrastructure/database/typeorm/migrations/1750000000000-create-conversations.ts`
- [x] T007 [P] Define the framework-independent LLM provider port and validated provider result types in `api/src/application/chat/ports/llm-provider.port.ts`
- [x] T008 [P] Define the conversation repository port for owned reads and atomic turn persistence in `api/src/application/chat/ports/conversation-repository.port.ts`
- [x] T009 [P] Define the allow-listed tool catalog, tool names and structured result contracts in `api/src/domain/conversations/services/tool-catalog.ts`
- [x] T010 Add the conversation entities and migration to TypeORM configuration in `api/src/infrastructure/database/typeorm/typeorm-options.ts`
- [x] T011 Add the trusted simulated user context extraction and validation to `api/src/infrastructure/http/controllers/chat.controller.ts`
- [x] T012 Wire the conversation repository, provider and chat services through `api/src/infrastructure/http/http.module.ts`

**Checkpoint**: Database, identity boundary, provider port and tool catalog are available without implementing user-facing chat behavior.

---

## Phase 3: User Story 1 - Consultar el estado del pedido por chat (Priority: P1) 🎯 MVP

**Goal**: Let an owner ask about a real order and receive a Spanish answer generated from the safe backend status tool.

**Independent Test**: Send a status question with a trusted user context and owned order; verify one tool call, current backend data, Spanish response, conversation ID and no private fields.

### Tests for User Story 1

- [x] T013 [P] [US1] Add unit tests for deterministic intent selection and status tool request generation in `api/src/infrastructure/ai/deterministic-llm.provider.spec.ts`
- [x] T014 [P] [US1] Add unit tests for owned status lookup, not-found and ownership rejection in `api/src/application/chat/services/chat-orchestrator.service.spec.ts`
- [x] T015 [P] [US1] Add a contract test for valid status chat, required identity context and safe response shape in `api/test/contract/chat.contract-spec.ts`
- [x] T016 [P] [US1] Add the automated critical status flow from user message through tool result to Spanish assistant answer in `api/test/e2e/chat.e2e-spec.ts`

### Implementation for User Story 1

- [x] T017 [US1] Implement the deterministic provider mapping Spanish status questions to `get_order_status` in `api/src/infrastructure/ai/deterministic-llm.provider.ts`
- [x] T018 [US1] Implement the safe order status tool using US2 query capabilities and sanitized fields in `api/src/application/chat/services/order-status.tool.ts`
- [x] T019 [US1] Implement the chat orchestrator validation, ownership gate, one-round tool dispatch and Spanish final response in `api/src/application/chat/services/chat-orchestrator.service.ts`
- [x] T020 [US1] Implement the send-message use case with trusted user context and conversation creation in `api/src/application/chat/use-cases/send-chat-message.use-case.ts`
- [x] T021 [US1] Add bounded chat request validation and trusted user header DTOs in `api/src/infrastructure/http/dto/chat.dto.ts`
- [x] T022 [US1] Expose `POST /api/v1/chat` with role authorization, rate limiting, trace IDs and Swagger metadata in `api/src/infrastructure/http/controllers/chat.controller.ts`
- [x] T023 [US1] Implement sanitized status result mapping that excludes courier and restaurant private data in `api/src/application/chat/services/order-status.tool.ts`
- [x] T024 [US1] Align the chat request/response and status tool examples in `specs/004-conversational-assistant/contracts/openapi.yaml`

**Checkpoint**: US1 works independently with deterministic provider, real safe order lookup and persisted conversation turn.

---

## Phase 4: User Story 2 - Solicitar ayuda mediante intenciones de soporte (Priority: P1)

**Goal**: Recognize all four support intents and safely hand future actions to US5 without executing them.

**Independent Test**: Send status, cancellation, delay and missing-item messages; verify the intended allow-listed tool and structured non-mutating result for the three future actions.

### Tests for User Story 2

- [ ] T025 [P] [US2] Add deterministic provider tests for all supported intents and out-of-scope messages in `api/src/infrastructure/ai/deterministic-llm.provider.spec.ts`
- [ ] T026 [P] [US2] Add tool catalog tests rejecting unknown names, extra arguments and unrestricted mutation tools in `api/src/domain/conversations/services/tool-catalog.spec.ts`
- [ ] T027 [P] [US2] Add orchestrator tests proving action stubs return `NOT_IMPLEMENTED_US5` and never mutate orders in `api/src/application/chat/services/chat-orchestrator.service.spec.ts`
- [ ] T028 [P] [US2] Add contract coverage for structured intent/tool outcomes in `api/test/contract/chat.contract-spec.ts`

### Implementation for User Story 2

- [x] T029 [US2] Implement deterministic intent routing for `CANCEL_ORDER`, `LATE_ORDER_COMPLAINT`, `MISSING_ITEMS` and `OUT_OF_SCOPE` in `api/src/infrastructure/ai/deterministic-llm.provider.ts`
- [x] T030 [US2] Implement non-mutating cancellation, delay-compensation and missing-item tool stubs in `api/src/application/chat/services/future-action.tools.ts`
- [x] T031 [US2] Enforce tool schemas, trusted identity and order scope before every dispatch in `api/src/domain/conversations/services/tool-catalog.ts`
- [x] T032 [US2] Add Spanish responses for unsupported intent and `NOT_IMPLEMENTED_US5` handoff in `api/src/application/chat/services/chat-orchestrator.service.ts`
- [x] T033 [US2] Document the four tools, structured results and US5 boundary in `specs/004-conversational-assistant/contracts/openapi.yaml`

**Checkpoint**: All supported intents route safely; only status reads real data and all future action tools are non-mutating stubs.

---

## Phase 5: User Story 3 - Conversar de forma segura y resiliente (Priority: P1)

**Goal**: Fail closed on ownership, privacy, prompt injection, invalid provider output, rate limits and provider outages.

**Independent Test**: Exercise unauthorized order, courier PII request, injection text, unknown tool, second round and provider failures; verify no leakage or partial mutation.

### Tests for User Story 3

- [ ] T034 [P] [US3] Add unit tests for ownership, private-field sanitization and body/context user mismatch in `api/src/application/chat/services/chat-orchestrator.service.spec.ts`
- [ ] T035 [P] [US3] Add unit tests for timeout, 429, 5xx, malformed provider output and second tool round in `api/src/application/chat/services/chat-orchestrator.service.spec.ts`
- [ ] T036 [P] [US3] Add prompt-injection and unknown-tool E2E tests proving no arbitrary capability is available in `api/test/e2e/chat.e2e-spec.ts`
- [ ] T037 [P] [US3] Add provider-failure and privacy contract tests in `api/test/contract/chat.contract-spec.ts`

### Implementation for User Story 3

- [x] T038 [US3] Add fail-closed provider error mapping and retry-safe response handling in `api/src/application/chat/services/chat-orchestrator.service.ts`
- [x] T039 [US3] Add explicit rejection of body identity conflicts and missing trusted user context in `api/src/infrastructure/http/controllers/chat.controller.ts`
- [x] T040 [US3] Ensure public tool results and persisted messages exclude courier PII, hidden prompts and provider secrets in `api/src/application/chat/services/order-status.tool.ts` and `api/src/infrastructure/database/typeorm/repositories/typeorm-conversation.repository.ts`
- [x] T041 [US3] Add chat-specific throttling configuration while preserving existing API limits in `api/src/infrastructure/http/controllers/chat.controller.ts`
- [ ] T042 [US3] Add structured trace-safe logging for provider/tool latency without user content or PII in `api/src/application/chat/services/chat-orchestrator.service.ts`

**Checkpoint**: The assistant cannot broaden permissions, expose private data or produce partial domain actions under adversarial or failing conditions.

---

## Phase 6: User Story 4 - Retomar una conversación persistida (Priority: P2)

**Goal**: Persist and continue an owned conversation with ordered messages across process restarts.

**Independent Test**: Create a conversation, send multiple messages, close/reopen the application and continue with the same ID; verify ownership and chronological context.

### Tests for User Story 4

- [ ] T043 [P] [US4] Add repository integration tests for conversation creation, message sequence and unique ownership constraints in `api/test/integration/chat.integration-spec.ts`
- [ ] T044 [P] [US4] Add E2E tests for valid continuation, cross-user rejection and missing order identifier in `api/test/e2e/chat.e2e-spec.ts`

### Implementation for User Story 4

- [x] T045 [US4] Implement conversation/message persistence with owned reads and atomic sequence allocation in `api/src/infrastructure/database/typeorm/repositories/typeorm-conversation.repository.ts`
- [x] T046 [US4] Register the conversation migration and entities in `api/src/infrastructure/database/typeorm/typeorm-options.ts` and `api/src/infrastructure/database/typeorm/migrations/1750000000000-create-conversations.ts`
- [x] T047 [US4] Load ordered conversation context and preserve order scope during continuation in `api/src/application/chat/use-cases/send-chat-message.use-case.ts`
- [x] T048 [US4] Return the same conversation ID and persist successful user/assistant turns without duplicating retries in `api/src/application/chat/services/chat-orchestrator.service.ts`
- [x] T049 [US4] Add conversation continuation examples and persistence errors to `specs/004-conversational-assistant/contracts/openapi.yaml` and `specs/004-conversational-assistant/quickstart.md`

**Checkpoint**: US4 supports safe, ordered, persisted continuation independently of frontend or global memory.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Validate the complete assistant locally and document operational evidence.

- [x] T050 [P] Add Swagger descriptions for the chat endpoint, trusted user context and failure responses in `api/src/infrastructure/http/controllers/chat.controller.ts`
- [x] T051 [P] Add assistant/provider environment variables to `.env.example` without real secrets in `.env.example`
- [x] T052 Run lint, build and focused unit/contract/integration/E2E suites and record actual evidence in `specs/004-conversational-assistant/quickstart.md`
- [ ] T053 Run the deterministic-provider latency scenario and document measured p95 against the 1-second target in `api/test/performance/chat.performance-spec.ts`
- [ ] T054 Validate migration, restart/continuation, PII boundaries and OpenAPI/Swagger alignment from the repository root in `specs/004-conversational-assistant/quickstart.md`
- [ ] T055 Review the complete diff for domain isolation, fail-closed behavior, safe logs, Spanish user messaging and no frontend scope expansion in `specs/004-conversational-assistant/plan.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001–T004 can run in parallel; no story work starts before shared contracts exist.
- **Foundational (Phase 2)**: Depends on Setup; T005–T009 can run in parallel, then T010–T012 wire infrastructure.
- **US1 (Phase 3)**: Depends on Foundation and existing US2 order query capabilities; delivers the MVP.
- **US2 (Phase 4)**: Depends on US1 orchestration and tool catalog; adds future action stubs.
- **US3 (Phase 5)**: Depends on US1/US2 ports; hardens all paths and validates fail-closed security.
- **US4 (Phase 6)**: Depends on Foundation and US1 orchestration; can begin after persistence is available but integrates final chat flow.
- **Polish (Phase 7)**: Depends on all desired stories and local PostgreSQL availability.

### User Story Dependencies

- **US1 (P1)**: Depends on Foundational and US2 order read surface; MVP.
- **US2 (P1)**: Depends on US1 provider/orchestrator/catalog.
- **US3 (P1)**: Depends on US1/US2 tool dispatch.
- **US4 (P2)**: Depends on Foundational and US1; persistence can be developed in parallel with US2/US3 after ports stabilize.

### Parallel Opportunities

- T001–T004 and T005–T009 are parallel setup/foundation work in separate files.
- T013–T016, T025–T028 and T034–T037 are parallel test streams, with same-file tasks sequenced in one checkout.
- T017–T018 can proceed in parallel after contracts; T021–T022 can proceed in parallel after the use case shape is stable.
- T043–T044 can run in parallel after the migration/repository interface is agreed.
- T050–T051 are independent polish tasks.

## Parallel Example: User Story 1

```text
T013: Deterministic intent/provider unit tests
T014: Ownership and status-tool unit tests
T015: Chat contract test
T016: Critical end-to-end status flow
```

## Parallel Example: User Story 3

```text
T034: Ownership/privacy tests
T035: Provider failure and round-limit tests
T036: Prompt-injection E2E test
T037: Failure/privacy contract test
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Setup and Foundation, including migration and deterministic provider port.
2. Implement `get_order_status`, ownership and sanitized response.
3. Expose `POST /api/v1/chat` and persist the successful turn.
4. Stop and validate the automated status flow before adding action intents.

### Incremental Delivery

1. US1: owned status question end to end.
2. US2: four intents and safe future-action stubs.
3. US3: adversarial/privacy/provider-failure hardening.
4. US4: durable continuation and restart validation.
5. Polish: Swagger, performance, migration and quickstart evidence.

## Notes

- Every task uses the required checkbox/ID format and includes an exact repository path.
- Unit tests target orchestration and security decisions, not trivial DTOs or Nest delegation.
- No frontend tasks are included because `web/` is explicitly out of scope for US4.
- R1–R7, real cancellation/compensation, approvals and detailed audit remain deferred to US5/US6.
