# Quickstart: Support Rules and Actions

## Prerequisites

```bash
cp .env.example .env
pnpm local:up
pnpm db:migrate
pnpm data:seed
```

The API uses local PostgreSQL and all action calculations use deterministic USD cents.

## Critical validation

Run the focused policy suite without infrastructure:

```bash
pnpm --filter api exec jest --runInBand --testPathPattern='support'
```

Run the complete local checks:

```bash
pnpm build
pnpm lint
pnpm test
pnpm test:integration
pnpm test:e2e
```

The critical scenarios must prove:

1. `CREATED` cancellation succeeds and records `CANCELLED` through the event history.
2. `ACCEPTED` cancellation succeeds below five minutes and is rejected at five minutes.
3. Delay thresholds return 15%/USD 5 and 30%/USD 10 alternatives with exact cents.
4. Amounts above USD 8 create one `PENDING` approval request without a financial effect.
5. Missing-item refunds use order values, cap at 50%, and apply approval when above USD 8.
6. Repeating the same canonical action key returns the original result without duplicate effects.
7. Unauthorized orders, invalid arguments and sensitive courier/restaurant data fail closed.

## HTTP examples

The authoritative request and response shapes are in
[contracts/openapi.yaml](./contracts/openapi.yaml). The trusted identity is supplied with
`X-Kuri-User-Id`; `user_id` in a request body cannot authorize an action. A delay over 45 minutes
must return both alternatives and wait for an explicit user choice.

## Evidence to record

Record migration success, unit/contract/integration/E2E results, idempotent retry behavior and
the absence of PII in responses/logs. Approval resolution and the operations inbox are US6 scope.

## Validation evidence (2026-09-16)

- PostgreSQL migration `CreateSupportActions1760000000000` applied locally.
- Unit: 11 suites, 28 tests passed.
- Contract/integration: 8 suites, 12 tests passed.
- E2E: 7 suites, 14 tests passed, including ownership, cancellation projection, compensation approval, missing items and retry idempotency.
- ESLint, API build and contracts build passed.
