# Shared contracts instructions

## Scope

These instructions apply to `packages/contracts/` and refine the repository rules in `../../AGENTS.md`.

## Contract rules

- This package is the shared type boundary between `api/` and `web/`.
- Keep public fields explicit, stable and transport-oriented.
- Use the repository's snake_case API naming convention for wire contracts.
- Preserve domain literal unions for statuses, event types, roles, cities, weather and support decisions.
- Do not import NestJS, TypeORM, React, Next.js or provider SDKs.
- Do not expose courier phone numbers, documents or other sensitive fields in public response contracts.
- Monetary contract fields must state whether they are integer cents or decimal display values; backend decisions use cents.

## Validation

```bash
pnpm --filter @kuri/contracts lint
pnpm --filter @kuri/contracts build
```

When changing a contract, inspect and validate both API DTOs and web consumers before committing.
