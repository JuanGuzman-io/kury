# API agent instructions

## Scope

These instructions apply to `api/` and refine the repository rules in `../AGENTS.md`.

## Architecture

```text
src/domain          # framework-free entities, value objects, policies and reducers
src/application     # use cases and ports
src/infrastructure  # TypeORM, Nest HTTP, CLI, LLM and action adapters
test/               # integration, E2E, contract and performance tests
```

- Domain imports must not depend on NestJS, TypeORM, Express or provider SDKs.
- Use ports at application boundaries and adapters in infrastructure.
- Controllers validate transport input and delegate to use cases; do not place business rules in controllers.
- Keep `@kuri/contracts` as the shared public contract source.

## Database rules

- PostgreSQL is the local source of persistence.
- Every schema change requires a new TypeORM migration in `src/infrastructure/database/typeorm/migrations/`.
- Keep `synchronize` disabled.
- Use integer cents for all monetary values.
- Preserve unique event and action idempotency constraints.

## HTTP and security

- Keep `/api/v1` versioned routes and explicit DTO boundaries.
- Preserve `X-Kuri-Role` simulated authorization and `X-Kuri-User-Id` trusted chat context.
- Public and assistant responses must use sanitized operational views.
- Keep rate limits, validation, CORS allowlists and trace IDs intact.
- Convert expected domain/reference failures into stable 4xx error contracts.

## AI and audit

- The LLM is an intent/tool orchestrator, never a domain authority.
- Keep tools explicitly allowlisted and argument validation outside the model.
- Audit messages, LLM calls, tool executions and decisions with redaction and bounded payloads.
- Runtime logs must be structured and must not contain raw secrets or sensitive personal data.
- The deterministic provider must continue to work without network access or credentials.

## Validation

```bash
pnpm --filter api lint
pnpm --filter api exec tsc --noEmit
pnpm --filter api exec jest --runInBand
pnpm test:integration
pnpm test:e2e
```

Prioritize tests for event ordering/idempotency, R1-R7, risk calculation, tool allowlisting, ownership, approvals and privacy boundaries.
