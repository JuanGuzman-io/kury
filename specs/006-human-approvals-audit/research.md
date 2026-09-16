# Research: Human Approvals and Assistant Traceability

## Approval lifecycle and concurrency

- **Decision**: Model approvals as `PENDING → APPROVED`, `PENDING → REJECTED`, or
  `PENDING → OBSOLETE`, with a compare-and-set update guarded by the pending state.
- **Rationale**: The order must be revalidated immediately before execution, and concurrent
  operators must not create two terminal decisions or two effects.
- **Alternatives considered**: A mutable approval record without a state guard was rejected because
  retries and concurrent clicks could double-execute a compensation. Automatic recalculation on
  approval was rejected because the operator must approve the exact current context.

## Shared transaction boundary

- **Target decision**: Add an application transaction port that lets approval resolution coordinate
  the approval state transition, action effect and order event in one database transaction. Adapt
  the existing ingestion use case to participate in an ambient transaction rather than opening a
  second transaction.
- **Current implementation**: Approval resolution currently atomically guards the pending-to-
  approved transition and persists the deterministic effect in one TypeORM transaction. US5
  cancellation still uses its existing ingestion transaction separately; the ambient transaction
  adapter and event-plus-effect atomicity are intentionally still pending.
- **Rationale**: Independent transactions can leave a cancelled order without its effect record or
  an approved request without a durable result. This is the remaining hardening item from US5.
- **Alternatives considered**: Wrapping only the TypeORM effect repository was rejected because it
  does not include order projection or event persistence. Distributed transactions and an external
  queue are out of scope for the local deliverable.

## Trace storage and redaction

- **Decision**: Store separate records for messages, LLM calls, tool executions, decisions and
  approval events. Apply bounded payload sizes and redact secrets, courier identity data, courier
  phone, restaurant private data and equivalent sensitive fields before persistence.
- **Rationale**: Separate records allow chronological reconstruction without treating assistant text
  as a decision authority, while redaction limits the risk of audit data becoming a PII copy.
- **Alternatives considered**: One serialized transcript was rejected because it is difficult to
  query and cannot reliably distinguish intent from a domain decision. Storing raw provider payloads
  was rejected because they may contain secrets or untrusted prompt content.

## Authorization and trace scope

- **Decision**: Only simulated role `OPS` can approve, reject or inspect operational traces; an OPS
  operator may inspect any order across BOG, MEX and LIM, subject to redaction. `SYSTEM` can write
  internal records but cannot resolve approvals.
- **Rationale**: This matches the clarified US6 requirement and keeps a real authorization check at
  the API boundary.
- **Alternatives considered**: City-scoped or assignment-scoped access was deferred because the
  local role context has no reliable city/team identity.

## Observability metadata

- **Decision**: Record provider/model, status, duration, token counts and estimated cost when the
  provider supplies them; represent unavailable values as null/unknown. Never store secrets in logs.
- **Rationale**: This supports diagnosis and cost review without inventing measurements or exposing
  prompts in operational logs.
- **Alternatives considered**: Estimating tokens locally for every provider was rejected because it
  would be provider-dependent and potentially misleading.
