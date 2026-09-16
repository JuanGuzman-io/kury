# Quickstart: Human Approvals and Assistant Traceability

## Prerequisites

```bash
cp .env.example .env
pnpm local:up
pnpm db:migrate
```

The local role is supplied with `X-Kuri-Role: OPS`. Only OPS can resolve approvals or inspect
traces. All stored and returned trace content is bounded and redacted.

## Critical validation scenarios

1. Create a US5 decision above USD 8 and verify one `PENDING` approval exists before any effect.
2. Approve it as OPS and verify context revalidation, one effect, resolver metadata and `APPROVED`.
3. Change the order context before approval and verify `OBSOLETE` with no effect.
4. Reject a pending approval and verify no effect is created.
5. Repeat approve/reject requests and verify one terminal state and one effect at most.
6. Execute a chat flow and query its trace by conversation and order.
7. Verify messages, LLM calls, tool calls, decisions, approvals, effects and failures are
   independently queryable in chronological order.
8. Submit PII or prompt-injection text and verify redaction, bounded storage and no authorization
   or action based on trace content.

## Validation commands

```bash
pnpm --filter api exec jest --runInBand
pnpm --filter api test:integration
pnpm --filter api test:e2e
pnpm --filter api test:performance
pnpm lint
pnpm build
```

Expected result: all critical approval and trace flows pass without network access or LLM
credentials. The complete request/response contract is in [contracts/openapi.yaml](./contracts/openapi.yaml),
and the entities and state machine are in [data-model.md](./data-model.md).

## Validation evidence (2026-09-16)

- `pnpm --filter api build` passed.
- `pnpm --filter api exec eslint "{src,test}/**/*.ts" --max-warnings=0` passed.
- `pnpm --filter api exec jest --runInBand`: 12 suites, 31 tests passed.
- `pnpm --filter api test:integration`: 9 suites, 15 tests passed.
- `pnpm --filter api test:e2e`: 8 suites, 15 tests passed.
- `pnpm db:migrate`: no migrations pending.
- `pnpm --filter api test:performance`: 3 suites, 3 tests passed.

The approval E2E covers OPS rejection, OPS approval, context-backed resolution, one persisted
effect and repeated approval protection. The chat E2E covers chronological trace records and
PII-safe output. Dedicated approval/trace p95 coverage and a restart/concurrency suite remain pending.
