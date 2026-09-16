# Implementation Plan: Human Approvals and Assistant Traceability

**Branch**: `006-human-approvals-audit` | **Date**: 2026-09-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/006-human-approvals-audit/spec.md`

## Summary

Implement an OPS-only approval workflow and append-only, redacted assistant trace. US5 decisions
create pending approvals; approval resolution revalidates the order context, executes at most one
effect, and records the terminal outcome. Conversations, LLM calls, tool executions, decisions,
approvals, effects and failures remain separate queryable records.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js, existing workspace configuration

**Primary Dependencies**: Existing NestJS HTTP adapters, TypeORM repositories, PostgreSQL 16,
`@kuri/contracts`, deterministic LLM adapter and Jest

**Storage**: PostgreSQL 16 with ordered versioned migrations

**Testing**: Jest unit, contract, integration, E2E and performance suites; ESLint and workspace builds

**Target Platform**: Local Docker Compose environment, API process and PostgreSQL 16

**Project Type**: Monorepo web-service capability consumed by the future operations panel

**Performance Goals**: 95% of bounded approval and trace queries usable within 500 ms locally;
deterministic policy work remains below the established 5 ms p95 test threshold

**Constraints**: OPS-only approval/trace access, integer cents, bounded/redacted trace payloads,
fail-closed behavior, no network/credentials required for tests, one effect per logical action

**Scale/Scope**: Local demonstration over approximately 1,500 orders and support conversations;
pagination maximum 100 records per page; no frontend changes in US6

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The design passes the constitution gates:

- Domain policies and decision models remain framework-independent; ORM and NestJS stay in adapters.
- Approval state transitions, context revalidation, idempotency and integer money are explicit and
  testable.
- Only OPS can resolve approvals or inspect traces; redaction occurs before persistence and output.
- Input validation, pagination limits, rate limiting, safe errors and prompt-injection resistance
  remain enforced at the boundary.
- Separate trace records preserve messages, tools, decisions, approvals, effects and failures.
- Critical approval and trace user journeys receive unit, integration and E2E evidence; trivial
  wiring does not receive standalone unit tests.
- No web UI is added; US7 will consume the API contracts.

## Project Structure

### Documentation (this feature)

```text
specs/006-human-approvals-audit/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/openapi.yaml
└── tasks.md
```

### Source Code (repository root)

```text
api/src/domain/support/                  # framework-free policy/context/decision models
api/src/application/support/             # approval, trace and transaction ports/use cases
api/src/infrastructure/database/typeorm/ # entities, repositories and migrations
api/src/infrastructure/http/             # OPS-guarded controllers, DTOs and errors
api/src/infrastructure/observability/    # redaction and trace adapters
api/test/contract/                        # public contract tests
api/test/integration/                     # repository and transaction behavior
api/test/e2e/                             # approval and trace critical flows
packages/contracts/src/                   # shared approval/trace contracts
```

**Structure Decision**: Extend the existing hexagonal NestJS API and shared contract package. Keep
US6 domain decisions independent of framework/ORM, add application services for approval and audit
orchestration, and place PostgreSQL/HTTP/observability adapters under infrastructure. `web/` is
untouched in this feature.

## Phase 0: Research Decisions

Research is recorded in [research.md](./research.md): guarded approval transitions, a shared
transaction port, redaction before persistence, OPS authorization and provider metadata handling.
All technical-context unknowns are resolved.

## Phase 1: Design Outputs

- [data-model.md](./data-model.md) defines approval/effect/trace records, relationships and state
  transitions.
- [contracts/openapi.yaml](./contracts/openapi.yaml) defines approval listing/resolution and trace
  query surfaces with authorization, pagination and safe failure responses.
- [quickstart.md](./quickstart.md) defines local prerequisites and critical validation scenarios.

## Constitution Re-check After Design

Pass with one explicitly planned risk: approval resolution must use a shared transaction boundary
with US5 event ingestion. The plan must not claim atomic event-plus-effect behavior until that port
is implemented and tested. No other constitutional exception is required.
