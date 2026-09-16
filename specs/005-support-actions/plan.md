# Implementation Plan: Support Rules and Actions

**Branch**: `005-support-actions` | **Date**: 2026-09-16 | **Spec**: [spec.md](./spec.md)

## Summary

Implement R1–R7 as deterministic policies over the existing order projection, expose their
decisions through the US4 tools, and persist every automatic effect and pending approval behind
canonical backend-generated idempotency keys. Cancellation is represented as a persisted order
event; financial actions above USD 8 create a `PENDING` approval request and never execute money.

## Technical Context

**Language/Version**: TypeScript 5.7, Node.js 22

**Primary Dependencies**: NestJS 11, TypeORM 0.3, PostgreSQL 16, `@kuri/contracts`

**Storage**: PostgreSQL with versioned migrations; existing orders/events plus support decisions,
action effects and approval requests

**Testing**: Jest unit tests for every policy boundary and idempotency branch; Nest contract and
E2E tests for critical support-action flows

**Target Platform**: Local Linux/macOS server through the pnpm monorepo and Docker Compose

**Project Type**: Web service with shared contracts

**Performance Goals**: At least 95% of deterministic eligible-action evaluations complete within
1 second in the local test environment

**Constraints**: Integer USD cents only; domain code cannot import NestJS, TypeORM or LLM SDKs;
all external input is bounded, authorized and rate-limited; approval-required actions have no
financial side effect; no courier or restaurant personal data crosses the tool boundary

**Scale/Scope**: Existing synthetic dataset of approximately 1,500 orders; one action decision per
request with safe retries and at-most-once effects

## Constitution Check

*GATE: Must pass before Phase 0 research and after Phase 1 design.*

- **Deterministic domain rules**: PASS. Policies and money calculations live in framework-free
  domain services; tools only adapt requests and structured decisions.
- **Event temporal truth**: PASS. Allowed cancellation goes through the existing event ingestion/
  projection path and preserves the order timeline.
- **Safety, privacy and authorization**: PASS. Trusted user context and ownership are checked
  before evaluation; tool schemas are allow-listed; approval threshold is enforced in code.
- **Evidence-based quality**: PASS. Tests target R1–R7 boundaries, exact monetary caps,
  rejection/approval branches and idempotent critical user flows rather than trivial wiring.
- **Local reproducibility**: PASS. PostgreSQL 16, deterministic tests and a documented quickstart
  remain local and credential-free.
- **UX and microinteractions**: PASS for this backend feature. Decisions, reasons, pending approval
  and rejection outcomes are structured in Spanish for the existing assistant; frontend work is
  explicitly excluded.

## Project Structure

### Documentation

```text
specs/005-support-actions/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/openapi.yaml
└── tasks.md
```

### Source Code

```text
api/src/domain/support/
├── entities/
├── policies/
├── services/
└── value-objects/
api/src/application/support/
├── ports/
├── services/
└── use-cases/
api/src/infrastructure/database/typeorm/
├── entities/support-action.entities.ts
├── migrations/*-create-support-actions.ts
└── repositories/typeorm-support-action.repository.ts
api/src/infrastructure/http/
├── controllers/support-actions.controller.ts
└── dto/support-action.dto.ts
api/test/
├── contract/support-actions.contract-spec.ts
├── e2e/support-actions.e2e-spec.ts
└── integration/support-actions.integration-spec.ts
packages/contracts/src/support-actions.ts
```

**Structure Decision**: Extend the existing Nest hexagonal backend. Policies remain framework
independent under `domain/support`; application services coordinate order ownership, event
ingestion, action effects and approvals; TypeORM and HTTP remain infrastructure adapters. No
frontend files are changed.

## Phase 0: Research Summary

See [research.md](./research.md). Decisions cover exact-cent arithmetic, policy composition,
transactional idempotency, cancellation through events, approval persistence and the US4 tool
boundary.

## Phase 1: Design Summary

See [data-model.md](./data-model.md) for entities and invariants and
[contracts/openapi.yaml](./contracts/openapi.yaml) for policy evaluation and execution contracts.
See [quickstart.md](./quickstart.md) for runnable local validation.

## Complexity Tracking

No constitution violations identified. Approval persistence is included because the constitution
requires approval state and idempotency, while approval resolution remains outside US5.
