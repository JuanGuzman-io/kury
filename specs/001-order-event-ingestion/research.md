# Research: Order Event Ingestion

## ORM and migration ownership

**Decision**: Use TypeORM 0.3 through `@nestjs/typeorm`, with infrastructure-only entity schemas,
explicit repositories, reviewed migrations, and `synchronize: false` in every environment.

**Rationale**: NestJS provides first-party TypeORM integration and recommends explicit transaction
control through `QueryRunner`. TypeORM supplies PostgreSQL support and versioned migrations without
forcing decorators or repositories into the domain. This is the shortest stable path for the
existing NestJS 11 project and the 72-hour delivery window.

**Alternatives considered**:

- Prisma: strong schema and migration tooling, but the current major-version transition introduces
  extra runtime/configuration choices and does not improve this feature's simple relational model.
- Drizzle: lightweight and SQL-oriented, but requires more custom Nest wiring and repository
  conventions than TypeORM for this deadline.
- Raw `pg`: maximum control, but increases mapping, migration, and transaction boilerplate without a
  proportional benefit for this scope.

Sources: [NestJS database integration](https://docs.nestjs.com/techniques/database),
[TypeORM migrations](https://typeorm.io/docs/migrations/why/), and
[TypeORM transactions](https://typeorm.io/docs/transactions/).

## Atomic ingestion and per-order concurrency

**Decision**: Execute duplicate detection, event insertion, timeline reduction, outcome updates,
and order projection replacement in one PostgreSQL transaction. Acquire a transaction-level
advisory lock derived from `order_id` before reading its timeline. Retain a unique database
constraint on `event_id` as the final race-condition guard.

**Rationale**: A row lock cannot protect an order that does not exist yet, which is valid when a
status event arrives before creation. A transaction-level advisory lock serializes only operations
for the same logical order and is released automatically on commit or rollback. Different orders
continue concurrently. Unique `event_id` makes simultaneous duplicate delivery safe even if
application checks race.

**Alternatives considered**:

- Table lock: correct but unnecessarily blocks unrelated orders.
- Order-row `FOR UPDATE`: insufficient for pre-creation events because no row exists.
- Serializable transactions alone: valid, but requires broader retry behavior and creates avoidable
  conflicts; advisory locking makes the ordering intent explicit.
- External queue: outside scope and unnecessary for local throughput.

Source: [PostgreSQL 16 advisory locks](https://www.postgresql.org/docs/16/explicit-locking.html#ADVISORY-LOCKS).

## Event identity and conflict detection

**Decision**: Treat `event_id` as globally unique. Store a SHA-256 hash of a canonicalized event
body. The same identifier and hash returns `DUPLICATE`; the same identifier with a different hash
returns `EVENT_ID_CONFLICT` and creates an ingestion-attempt audit record without altering the
event ledger.

**Rationale**: A uniqueness constraint detects repetition but cannot distinguish a safe retry from
identifier reuse with mutated content. Canonical hashing gives a deterministic comparison while
keeping the entire immutable source payload available for audit.

**Alternatives considered**:

- Compare raw JSON strings: key order and whitespace create false conflicts.
- Compare selected columns only: payload mutations could go undetected.
- Overwrite on conflict: violates idempotency and destroys evidence.

## Timeline reduction and projection

**Decision**: Re-run a pure reducer over all unique events for one order after each accepted event,
ordered by `occurred_at` and stable ingestion sequence. The reducer emits an outcome for every
event (`APPLIED`, `HISTORICAL`, `PENDING_SEQUENCE`, or `REJECTED_CONFLICT`) and optionally a current
order projection.

**Rationale**: Orders have only a small number of lifecycle events, so full per-order replay is
simple, deterministic, and easy to test. It correctly promotes pending events when missing
predecessors arrive and preserves older valid events received after a terminal projection.

Rules:

1. `ORDER_CREATED` establishes `CREATED`; status events remain pending until it exists.
2. Non-cancellation transitions require the complete lifecycle sequence.
3. `CANCELLED` is valid from every non-terminal state.
4. Equal-time incompatible events keep the earliest trusted ingestion and reject the later one.
5. Events occurring after a terminal event are rejected; events received later but occurring before
   it remain in history and cannot reopen the order.

**Alternatives considered**:

- Incremental last-write-wins: fails when events arrive out of order.
- Sort by `received_at`: contradicts the business source of temporal truth.
- Database trigger reducer: hides business behavior from unit tests and couples policy to storage.

## Money normalization

**Decision**: Accept the supplied decimal JSON shape only at the transport/import boundary, validate
at most two fractional digits, and immediately convert values to integer cents. Domain objects,
repositories, responses, and calculations use cents only. Reject totals that are negative, unsafe,
or inconsistent with the item sum.

**Rationale**: The source dataset uses decimal USD values, while the constitution prohibits
floating-point money inside the system. A single boundary conversion preserves compatibility and
keeps every business value exact thereafter.

**Alternatives considered**:

- Store database decimal values: accurate in PostgreSQL but exposes decimal/string handling across
  domain boundaries.
- Change the input dataset to cents: cleaner internally but incompatible with the supplied contract.

## Validation, authorization, throttling, and privacy

**Decision**: Apply global strict validation with unknown-field rejection and typed transformation.
Require a simulated `X-Kuri-Role` of `SYSTEM` for ingestion and `SYSTEM` or `OPS` for direct order
inspection. Apply configurable in-memory throttling suitable for the single local API instance,
with stricter defaults on reads and a higher event-ingestion allowance. Never serialize courier
phone, document, or full name in HTTP responses.

**Rationale**: This fulfills real authorization without implementing identity authentication,
rejects malformed/unbounded payloads before domain execution, and protects the local exercise from
accidental or abusive traffic. In-memory throttling is sufficient because horizontal deployment is
out of scope.

**Alternatives considered**:

- No authorization because roles are simulated: violates the constitution and hides ownership of
  privileged operations.
- Shared distributed rate-limit storage: unnecessary without multiple API instances.
- Returning full courier records to OPS: expands sensitive-data exposure with no US1 value.

Sources: [NestJS validation](https://docs.nestjs.com/techniques/validation) and
[NestJS rate limiting](https://docs.nestjs.com/security/rate-limiting).

## Dataset generation and loading

**Decision**: Provide one deterministic synthetic generator using a fixed, documented PRNG seed and
a streaming loader for JSONL events plus restaurant/courier JSON arrays. The loader enters through
the same application use case as HTTP but runs from a Nest application context, bypassing HTTP rate
limits while preserving validation, authorization context, idempotency, and transactions.

**Rationale**: No dataset files were delivered. A deterministic generator satisfies the business
ratios and makes tests and demos reproducible. Streaming avoids loading all events into memory and
keeps the CLI viable if datasets grow.

**Alternatives considered**:

- Direct database inserts: faster but bypasses event rules and gives false confidence.
- Loader calling the HTTP endpoint: exercises transport but is throttled and slower; HTTP behavior
  is covered separately by end-to-end tests.
- Random unseeded data: prevents repeatable acceptance evidence.
