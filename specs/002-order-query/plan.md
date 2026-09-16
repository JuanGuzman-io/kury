# Implementation Plan: Order Query and Listing

**Branch**: `002-order-query` | **Date**: 2026-09-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-order-query/spec.md`

## Summary

Construir la superficie de lectura operacional sobre la proyección durable de US1. El detalle
devolverá la vista completa y el timeline temporal; el listado devolverá una vista resumida,
filtrable por ciudad, estado y retraso, con paginación estable. La lectura conservará los límites
de autorización, rate limiting, trazabilidad y privacidad ya establecidos, y expondrá el restaurante
con identificador y nombre comercial, pero el courier únicamente con `courier_id`.

## Technical Context

**Language/Version**: Node.js 22, TypeScript 5.9-compatible project configuration

**Primary Dependencies**: NestJS 11, `@nestjs/swagger`, TypeORM 0.3, PostgreSQL driver `pg`,
`class-validator`, `class-transformer`, `@nestjs/config`, `@nestjs/throttler`, Jest and Supertest

**Storage**: PostgreSQL 16 in Docker; existing `orders`, `order_items`, `order_events`,
`restaurants` and `couriers` tables; TypeORM remains an adapter with `synchronize: false`

**Testing**: Critical contract and end-to-end HTTP flows against PostgreSQL 16, integration tests
for query semantics and coherent reads, and focused unit tests only for delayed and pagination
decision logic

**Target Platform**: Local Docker Compose on macOS/Linux hosts; Linux containers; arm64 and amd64

**Project Type**: pnpm monorepo backend web service with shared typed contracts; this feature has
no frontend implementation

**Performance Goals**: At least 95% of warmed valid detail and filtered-list reads below 250 ms;
1,500 persisted orders queryable with any supported filter combination and pages up to 100 items

**Constraints**: Existing `/api/v1` route prefix and simulated `OPS`/`SYSTEM` roles; default
`page=1`, `limit=20`, maximum `limit=100`; `created_at DESC, order_id ASC` for list ordering;
`occurred_at ASC, event_id ASC` for timeline ordering; current server time for delayed evaluation;
no courier or restaurant personal data in public responses, errors or logs; no schema mutation
outside versioned migrations

**Scale/Scope**: Approximately 1,500 seeded orders for acceptance and a design suitable for tens
of thousands of orders per day. This feature implements read detail, list, filters, pagination and
timeline only; risk, support, approvals, LLM, frontend and order mutation remain excluded.

## Constitution Check

*GATE: Passed before Phase 0 research and re-checked after Phase 1 design.*

| Principle / Gate | Design Evidence | Status |
|---|---|---|
| Domain isolation | Query and mapping logic stays in application/infrastructure boundaries; existing domain projection is consumed read-only. | PASS |
| Temporal truth and idempotency | Detail timeline reads stored events ordered by `occurred_at`; query code never rewrites projections or outcomes. | PASS |
| Safety, privacy, authorization | Read routes retain simulated role authorization, throttling, bounded query parameters, consistent errors and separate safe operational DTOs. | PASS |
| Evidence-based quality | Contract/E2E tests cover detail, list filters, delayed boundaries, pagination, permissions, not-found and PII; unit tests are limited to decision logic. | PASS |
| Local reproducibility | Docker PostgreSQL 16, existing migration setup and quickstart validation are reused. | PASS |
| UX and microinteractions | No UI is introduced; response states and errors are explicit for the future panel. | PASS |
| Versioned contracts and schema | OpenAPI YAML and shared response types are versioned; `@nestjs/swagger` documents the same explicit DTO boundary; no schema change is needed for US2. | PASS |

No constitutional exception is required.

## Phase 0: Research Decisions

Research findings are recorded in [research.md](./research.md). All technical-context decisions are
resolved; no `NEEDS CLARIFICATION` items remain.

## Phase 1: Design Summary

- Reuse the existing `OrderEntity`, `OrderItemEntity`, `OrderEventEntity` and reference entities.
- Add a read query port and TypeORM adapter that builds one filtered query for the collection and
  one coherent detail read for the order plus events.
- Keep delayed evaluation in a small application/domain policy receiving an explicit evaluation
  instant, so HTTP uses current server time and tests remain deterministic.
- Map detail and list records through separate response DTOs. The list excludes items and timeline;
  the detail includes items and timeline, with only safe restaurant/courier fields.
- Validate query parameters before accessing persistence. Reject malformed values, page below 1,
  limit outside 1..100, unknown city/status and non-boolean `delayed`.
- Use the existing trace/error/role/throttle boundary and shared contracts; read failures never
  expose SQL, entity serialization or private reference columns.
- Configure `@nestjs/swagger` from the explicit public DTOs and controllers, expose Swagger UI only
  in the local environment, and keep `contracts/openapi.yaml` as the reviewed versioned contract.

## Project Structure

### Documentation (this feature)

```text
specs/002-order-query/
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
api/src/application/orders/
├── ports/
│   └── order-query-repository.port.ts
├── services/
│   └── delayed-order.policy.ts
└── use-cases/
    ├── get-order-details.use-case.ts       # extend safe detail mapping
    └── list-orders.use-case.ts

api/src/infrastructure/database/typeorm/repositories/
└── typeorm-order-query.repository.ts

api/src/infrastructure/http/
├── controllers/orders.controller.ts        # extend detail and list routes
└── dto/
    ├── order-list.query.dto.ts
    ├── order-list.response.dto.ts
    └── order-details.response.dto.ts

api/test/
├── contract/orders.contract-spec.ts
├── integration/order-query.integration-spec.ts
└── e2e/order-query.e2e-spec.ts

packages/contracts/src/
└── order-queries.ts
```

**Structure Decision**: Mantener la separación hexagonal existente en `api/`: dominio/políticas
independientes, casos de uso en aplicación, repositorios TypeORM en infraestructura y contratos
compartidos en `packages/contracts`. La feature no crea ni modifica `web/`.

## Complexity Tracking

No violations.

## Post-Design Constitution Check

All gates remain PASS. The design does not add a persistence mutation, external dependency or UI
surface. The only derived value is `delayed`, evaluated from `promised_at` and current status at
read time, and its boundary is covered by executable tests.
