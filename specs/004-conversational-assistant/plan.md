# Implementation Plan: Conversational Support Assistant

**Branch**: `004-conversational-assistant` | **Date**: 2026-09-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/004-conversational-assistant/spec.md`

## Summary

Construir el orquestador conversacional que recibe mensajes, mantiene conversaciones persistidas,
usa un proveedor LLM detrás de un puerto y ejecuta únicamente tools allow-listed. La autorización,
ownership, sanitización y política fail-closed vivirán en código; las tools de acción serán stubs no
mutantes hasta US5. El flujo local usará un proveedor determinista sin red ni credenciales.

## Technical Context

**Language/Version**: Node.js 22, TypeScript 5.9-compatible project configuration

**Primary Dependencies**: NestJS 11, TypeORM 0.3, PostgreSQL driver `pg`, `class-validator`,
`class-transformer`, `@nestjs/throttler`, `@nestjs/swagger`, Jest and Supertest; no provider SDK is
required for the deterministic adapter

**Storage**: PostgreSQL 16 in Docker with versioned migration for `conversations` and `messages`;
conversation ownership and message order are durable

**Testing**: Focused unit tests for ownership, intent/tool allow-list and fail-closed orchestration;
contract/integration/E2E tests for owned status, continuation, privacy, unsupported requests and
provider failures

**Target Platform**: Local Docker Compose on macOS/Linux hosts; Linux containers; arm64 and amd64

**Project Type**: pnpm monorepo NestJS backend with shared typed contracts; frontend excluded

**Performance Goals**: At least 95% of deterministic local status chats complete under 1 second once
the order lookup is available; bounded message input and one tool round per request

**Constraints**: Existing `/api/v1` prefix, simulated trusted user context plus `OPS`/`SYSTEM`
roles, rate limiting, trace IDs, safe errors, Spanish responses, no PII, no arbitrary tools, no
partial mutations, no streaming and no real provider credentials in the repository

**Scale/Scope**: Basic conversation/message persistence and one status flow plus safe non-mutating
stubs for three future action intents. Detailed tool audit, approvals, real authentication and
frontend remain outside US4.

## Constitution Check

*GATE: Passed before Phase 0 research and re-checked after Phase 1 design.*

| Principle / Gate | Design Evidence | Status |
|---|---|---|
| Domain isolation | LLM port, tool schemas, ownership and fail-closed policy are framework-independent; adapters hold NestJS/TypeORM/provider code. | PASS |
| Temporal truth and idempotency | Conversation/message order is durable; retry identity and transaction boundaries prevent duplicate persisted user turns. | PASS |
| Safety, privacy, authorization | Trusted user context, ownership before lookup/result, sanitized status DTO, allow-list and no generic mutation tools. | PASS |
| Evidence-based quality | Unit tests cover critical orchestration decisions; E2E covers status, ownership, privacy, injection and provider failure. | PASS |
| Local reproducibility | Deterministic in-memory LLM and Docker PostgreSQL require no network/provider credentials. | PASS |
| UX and microinteractions | Spanish response/error states and explicit pending/failure semantics are documented for future chat UI; no frontend change. | PASS |
| Versioned contracts and schema | Shared contracts, OpenAPI and a versioned conversation migration are planned; Swagger uses explicit DTOs. | PASS |

No constitutional exception is required.

## Phase 0: Research Decisions

Research findings are recorded in [research.md](./research.md). All technical-context decisions are
resolved; no `NEEDS CLARIFICATION` items remain.

## Phase 1: Design Summary

- Add conversation and message entities with unique conversation ownership and an ordered message
  sequence; use a migration rather than synchronization.
- Define an `LlmProvider` port whose response is either final text or one validated tool request;
  implement a deterministic adapter that maps Spanish test phrases to the expected tool.
- Define a typed allow-list/catalog and a tool dispatcher. Every dispatcher call receives the trusted
  user context, validates order ownership before lookup, strips private fields and fails closed.
- Implement `get_order_status` against the existing safe order query surface. Implement the three
  future-action tools as non-mutating stubs returning structured `NOT_IMPLEMENTED_US5` results.
- Persist the user and assistant messages in one application transaction boundary; provider/tool
  failures persist no partial action and return a safe Spanish response.
- Expose `POST /api/v1/chat` with validation, simulated user context (`X-Kuri-User-Id`), role guard,
  throttling, trace ID, Swagger and a reviewed OpenAPI contract.

## Project Structure

### Documentation (this feature)

```text
specs/004-conversational-assistant/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/openapi.yaml
└── tasks.md                  # Created later by $speckit-tasks
```

### Source Code (repository root)

```text
api/src/domain/conversations/
├── entities/conversation.ts
├── entities/message.ts
├── services/assistant-policy.ts
└── services/tool-catalog.ts

api/src/application/chat/
├── ports/llm-provider.port.ts
├── ports/conversation-repository.port.ts
├── ports/order-status-tool.port.ts
├── services/chat-orchestrator.service.ts
└── use-cases/send-chat-message.use-case.ts

api/src/infrastructure/ai/
└── deterministic-llm.provider.ts

api/src/infrastructure/database/typeorm/
├── entities/conversation.entities.ts
├── migrations/1750000000000-create-conversations.ts
└── repositories/typeorm-conversation.repository.ts

api/src/infrastructure/http/
├── controllers/chat.controller.ts
└── dto/chat.dto.ts

api/test/
├── contract/chat.contract-spec.ts
├── integration/chat.integration-spec.ts
└── e2e/chat.e2e-spec.ts

packages/contracts/src/chat.ts
```

**Structure Decision**: Mantener la arquitectura hexagonal existente: dominio para policy/catalog,
aplicación para orchestration/ports, infraestructura para LLM determinista, TypeORM y HTTP, y
`packages/contracts` para el contrato público. `web/` no cambia en US4.

## Complexity Tracking

No violations.

## Post-Design Constitution Check

All gates remain PASS. The design introduces only the durable conversation/message data required by
US4, keeps provider output untrusted, limits tool execution to one round, and leaves R1-R7/action
authority to US5. No frontend, cloud service or real authentication is introduced.
