# Research: Support Rules and Actions

## Decision: Keep policies framework-independent

**Rationale**: R1–R7 are business authority and must not depend on NestJS, TypeORM or the model.
Each policy receives an immutable order context and an explicit clock, then returns a structured
`SupportDecision`.

**Alternatives considered**: Put rules in controllers or prompts. Rejected because either path
allows transport/model behavior to bypass domain safety and makes boundary testing weaker.

## Decision: Use integer USD cents and explicit half-open boundaries

**Rationale**: The clarified feature uses USD only. Store and calculate cents as integers. Use
`acceptedDuration < 5 minutes`, `delay > 20 minutes`, `delay > 45 minutes`, and
`amount > USD 8` exactly as specified.

**Alternatives considered**: Floating-point dollars or runtime currency conversion. Rejected because
both introduce rounding and an exchange-rate policy outside this feature.

## Decision: Compose policies in an application action service

**Rationale**: Cancellation, delay compensation and missing-item refund have separate inputs and
limits, but R5 must be applied after the amount is calculated. The application service invokes the
specific policy, applies the approval gate, then chooses execution or pending approval.

**Alternatives considered**: One large policy or duplicated approval checks in tools. Rejected
because it makes independent boundary tests and future US6 integration harder.

## Decision: Persist approval requests in US5

**Rationale**: A `REQUIRES_APPROVAL` result needs a durable `PENDING` record to be idempotent and
available to US6. US5 creates it but does not approve, reject or provide the inbox.

**Alternatives considered**: Return an in-memory decision or defer creation to US6. Rejected because
retries could create duplicate approval requests or lose the proposed action.

## Decision: Generate canonical idempotency keys on the backend

**Rationale**: The key is derived from action type, order, selected alternative and policy version.
Client identifiers are correlation-only. A unique database constraint plus a transaction prevents
double effects and makes retries return the original structured result.

**Alternatives considered**: Trust a client-provided key or use a timestamp. Rejected because users
could create duplicates or retries would not converge.

## Decision: Persist cancellation through the existing event path

**Rationale**: An allowed cancellation must produce a `CANCELLED` projection and preserve temporal
history. Reusing the event boundary keeps ingestion and reads consistent.

**Alternatives considered**: Update the projection directly. Rejected because it would bypass the
event ledger and reconstruction guarantees.

## Decision: Require explicit choice for delay over 45 minutes

**Rationale**: Full refund and 30% coupon are materially different actions. The assistant must show
both amounts and wait for a user choice; no default can create the wrong approval or effect.

**Alternatives considered**: Default to coupon or refund. Rejected because it changes user intent.

## Decision: Keep action integrations behind ports

**Rationale**: US5 needs deterministic local effects and structured outcomes without payment or
coupon-provider credentials. Ports allow a later adapter without moving policy authority.

**Alternatives considered**: Call an external provider directly from the policy. Rejected because
it couples decisions to infrastructure and complicates rollback/idempotency testing.
