<!--
Sync Impact Report
- Version change: template -> 1.0.0
- Modified principles: none; five initial principles established.
- Added sections: Architecture, Data and Security Constraints; Delivery Workflow and Quality Gates.
- Removed sections: none.
- Follow-up TODOs: none.
-->

# Kuri Delivery Constitution

## Core Principles

### I. Domain Rules Are Deterministic and Isolated

Business decisions MUST live in framework-independent domain code. The API, persistence,
LLM provider, and UI are adapters around that core; the domain MUST NOT import NestJS, an
ORM, Next.js, or an LLM SDK. R1-R7 MUST be enforced by code at the tool or use-case boundary,
never by prompt text alone. Monetary values MUST use integer cents end to end. An ORM is
permitted as a persistence adapter, but versioned migrations are the authoritative record of
schema evolution. This prevents an LLM, a transport change, or a persistence choice from
bypassing support policy.

### II. Events Preserve Temporal Truth

`event_id` MUST make ingestion idempotent and `occurred_at` MUST determine state reduction;
`received_at` is diagnostic only. The order aggregate MUST tolerate duplicate and out-of-order
`ORDER_CREATED` and `ORDER_STATUS_CHANGED` events without corrupting the current state or its
timeline. Each accepted event MUST trigger risk recalculation for an active order. State
transitions, terminal states, pagination, filtering, and risk ordering MUST have explicit,
tested contracts. This preserves operational trust when the input stream is imperfect.

### III. Safety, Privacy, and Authorization Are Enforced at Every Boundary

All external inputs MUST be validated, bounded, and rate-limited before use. Role context may
be simulated for this exercise, but authorization checks MUST be real. User-facing responses,
tool results, logs, and API DTOs MUST never expose courier or restaurant personal data, including
phone numbers and identity documents. The assistant MUST treat user content as untrusted data,
resist prompt-injection attempts, use allow-listed tools and schemas, verify order ownership,
and create a human approval request instead of executing compensation above USD 8. Secrets MUST
remain outside version control and `.env.example` MUST contain no real value.

### IV. Evidence-Based Quality Includes Accessible Operations

Every business rule R1-R7, event reducer, risk calculation, money formatter, and privacy guard
MUST have unit tests. End-to-end tests MUST cover the critical ingest-to-query, support action,
approval, and operations-panel flows. The web panel MUST meet WCAG 2.2 AA: semantic controls,
keyboard operation, visible focus, labels, error feedback, contrast, and non-color status cues
are mandatory. It MUST work from a 320 px viewport without horizontal scrolling and remain
responsive at larger widths. Quality claims require executable evidence, not manual assertion.

### V. Local Reproducibility and Traceability Come First

The pnpm monorepo MUST keep `web`, `api`, and shared typed contracts coherent through a single
root workspace and lockfile. Docker Compose MUST provide PostgreSQL 16, and one documented
local command MUST start the required environment. Dataset generation MUST be synthetic,
deterministic from a documented seed, and cover approximately 1,500 orders, the specified
duplicate/out-of-order ratios, cities, weather conditions, delayed and cancelled orders, and
active orders. Conversations MUST retain messages, tool calls, arguments, results, decisions,
and approval state. Structured logs MUST record LLM/tool latency and token or cost metadata when
available. Code and identifiers, as well as commit messages, MUST be English; documentation,
UI, and assistant responses MUST be Spanish.

## Architecture, Data and Security Constraints

The system consists of a Next.js App Router frontend in `web/`, a NestJS backend in `api/`, and
a shared typed-contract package consumed by both. The backend MUST use hexagonal boundaries:
domain, application use cases and ports, and infrastructure adapters. PostgreSQL 16 stores
events, derived order state, risk, conversations, tool traces, and approvals. Every schema change
MUST be introduced through an ordered, versioned migration; direct schema mutation is forbidden.

An LLM provider MUST be accessed through a port. A deterministic in-memory adapter MUST support
the complete test suite without network access or credentials. Model output MAY select an
intent or request a tool, but only code may read data, calculate eligibility, execute permitted
actions, or create approvals. Public API contracts MUST define requests, responses, validation
errors, pagination, and authorization behavior before UI integration.

Delivery scope is constructed in this order: ingestion and query, risk detection, conversational
support, then the operations panel. Cloud deployment, real identity authentication, mobile apps,
live courier maps, courier reassignment, external event queues, ML training, and multilingual
assistant behavior remain out of scope until all four cases meet their minimum acceptance
criteria.

## Delivery Workflow and Quality Gates

Work MUST remain small, reviewable, and defensible in a live technical session. Each meaningful
change MUST have a semantic English commit message with an emoji and MUST be validated with the
relevant unit, end-to-end, build, lint, and local-environment checks before it is claimed done.
Failures, skipped checks, pre-existing issues, and unverified runtime behavior MUST be reported
separately.

The delivery documentation MUST explain local startup, architecture, event idempotency and scale
limits, the risk approach and production validation plan, LLM rule enforcement, assistant
evaluation and operational metrics, and scaling tradeoffs. It MUST also record architecture
decisions, AI-assisted development usage and human review, explicitly deferred scope, and the
demo path. The PRD, UX/UI token guide, TRD with C4 diagrams, quality scenarios and ADRs, and
local infrastructure contract are required planning artifacts; they MUST be created through their
own approved specification or planning workflows rather than by silently expanding this
constitution update.

## Governance

This constitution supersedes local conventions when they conflict. Every specification, plan,
implementation, review, and release-readiness check MUST verify compliance with these principles.
Any exception requires a documented rationale, risk, compensating control, owner, and expiry in
an ADR or issue before implementation.

Amendments require a written proposal, review of affected contracts, migrations, tests,
documentation, and a compliance update in the same change. Versioning follows semantic intent:
MAJOR for removed or incompatible principles, MINOR for a new principle or materially expanded
governance, and PATCH for clarifications that preserve policy. Compliance reviews MUST reject
changes that bypass domain rules, migrations, ownership checks, privacy controls, test evidence,
or local reproducibility.

**Version**: 1.0.0 | **Ratified**: 2026-09-15 | **Last Amended**: 2026-09-15
