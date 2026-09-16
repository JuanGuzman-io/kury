# Implementation Plan: Order Risk Assessment

**Branch**: `003-risk-assessment` | **Date**: 2026-09-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/003-risk-assessment/spec.md`

## Summary

Construir un motor determinístico de riesgo para pedidos activos, aislado del framework y de la
persistencia. Combinará señales de estado, preparación, tiempo, clima y hora local para producir
`level`, `score` y razones en español. Los casos de uso enriquecerán el detalle y el listado
resumido de US2; `at-risk` reutilizará paginación, autorización, rate limiting, trazabilidad y DTOs
seguros existentes.

## Technical Context

**Language/Version**: Node.js 22, TypeScript 5.9-compatible project configuration

**Primary Dependencies**: NestJS 11, `@nestjs/swagger`, TypeORM 0.3, `pg`, `class-validator`,
`class-transformer`, `@nestjs/config`, `@nestjs/throttler`, Jest and Supertest

**Storage**: PostgreSQL 16 in Docker; existing order projection, events and reference tables;
risk is calculated on-read and is not persisted as a second source of truth

**Testing**: Focused unit tests for rule boundaries, composition, explanations, invalid context,
terminal exclusion and immutability; integration/contract tests for risk queries and authorization;
E2E tests for detail enrichment and active-risk prioritization against PostgreSQL

**Target Platform**: Local Docker Compose on macOS/Linux hosts; Linux containers; arm64 and amd64

**Project Type**: pnpm monorepo backend web service with shared typed contracts; no frontend change

**Performance Goals**: At least 95% of warmed detail and active-risk reads with 1,500 orders below
250 ms locally; active-risk pages bounded to 100 items

**Constraints**: Existing `/api/v1` prefix; simulated `OPS`/`SYSTEM` roles; `page=1`, `limit=20`,
maximum `limit=100`; stable risk ordering; timezone-aware peak windows; Spanish reasons; integer
cents; no PII or model metadata; no schema mutation outside migrations; no LLM, ML or network

**Scale/Scope**: Approximately 1,500 seeded orders for acceptance and a design suitable for tens
of thousands of orders per day. This feature adds deterministic risk assessment and read surfaces;
support, actions, approvals and frontend remain excluded

## Constitution Check

*GATE: Passed before Phase 0 research and re-checked after Phase 1 design.*

| Principle / Gate | Design Evidence | Status |
|---|---|---|
| Domain isolation | Risk rules, thresholds, clock and reason formatting live in framework-independent domain code. | PASS |
| Temporal truth and idempotency | Context consumes US1 projected status and event timestamps; reads never rewrite events or projections. | PASS |
| Safety, privacy, authorization | Existing role guard, throttling, trace/error boundaries and safe DTOs are reused; missing data is neutral and visible. | PASS |
| Evidence-based quality | Unit tests target meaningful rule boundaries and composition; contract/E2E tests target critical risk reads and permission denial. | PASS |
| Local reproducibility | No external provider or credential is required; Docker PostgreSQL and existing seed flow are reused. | PASS |
| UX and microinteractions | API exposes stable priority, Spanish reasons and bounded list states for the future operations panel; no frontend is changed. | PASS |
| Versioned contracts and schema | Shared TypeScript contracts and reviewed OpenAPI are updated; no migration is needed because risk is read-time. | PASS |

No constitutional exception is required.

## Phase 0: Research Decisions

Research findings are recorded in [research.md](./research.md). All technical-context decisions are
resolved; no `NEEDS CLARIFICATION` items remain.

## Phase 1: Design Summary

- Add a pure risk engine that receives a safe order context, explicit `now`, rule configuration and
  city timezone data, returning immutable risk output.
- Keep named defaults and thresholds in one configuration value object; use strict comparisons and
  cumulative remaining-time signals exactly as specified.
- Extend the query port so detail and list rows can be assessed with the same read-time instant;
  add a paginated active-risk query reusing US2 summary fields.
- Add shared risk enums/types and explicit Nest response DTOs; expose both endpoints in generated
  Swagger and the checked-in OpenAPI contract.
- Resolve local peak time through fixed city timezone mapping using `Intl.DateTimeFormat`; invalid
  city/weather/status contexts fail before an assessment is returned.
- Keep test effort on critical domain decisions and user journeys, not trivial DTOs or wiring.

## Project Structure

### Documentation (this feature)

```text
specs/003-risk-assessment/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── openapi.yaml
└── tasks.md                  # Created later by $speckit-tasks
```

### Source Code (repository root)

```text
api/src/domain/risk/
├── entities/risk-assessment.ts
├── services/risk-assessment.service.ts
├── services/risk-assessment.service.spec.ts
└── value-objects/risk-rule-config.ts

api/src/application/orders/
├── ports/order-risk-query-repository.port.ts
├── use-cases/get-order-details.use-case.ts       # enrich with risk
└── use-cases/list-at-risk-orders.use-case.ts

api/src/infrastructure/database/typeorm/repositories/
└── typeorm-order-risk-query.repository.ts

api/src/infrastructure/http/
├── controllers/orders.controller.ts              # add at-risk route
└── dto/risk.response.dto.ts

api/test/
├── contract/order-risk.contract-spec.ts
├── integration/order-risk.integration-spec.ts
└── e2e/order-risk.e2e-spec.ts

packages/contracts/src/order-risk.ts
```

**Structure Decision**: Mantener la separación hexagonal de `api/`: dominio puro para reglas,
aplicación para composición y puertos, TypeORM para lecturas, NestJS para validación/documentación
y `packages/contracts` como fuente compartida de tipos públicos. `web/` no cambia en US3.

## Complexity Tracking

No violations.

## Post-Design Constitution Check

All gates remain PASS. The design has no new persistence mutation, external provider, UI surface or
authentication mechanism. Risk remains a deterministic read-time projection and its critical rules,
privacy behavior, pagination and ordering are covered by executable validation planned in the next
phase.
