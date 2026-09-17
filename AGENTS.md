# Kuri Delivery Operations Copilot

## Scope

These instructions apply to the repository root. Before changing a file, read the nearest `AGENTS.md` in its parent tree. More specific instructions refine these rules; do not duplicate or contradict them.

## Repository map

```text
.
├── api/                    # NestJS backend and domain core
│   └── AGENTS.md
├── web/                    # Next.js operations panel
│   └── AGENTS.md
├── packages/contracts/     # Shared TypeScript contracts
│   └── AGENTS.md
├── specs/                  # Spec-driven development artifacts
├── compose.yaml            # PostgreSQL, API and web local environment
├── DECISIONS.md            # Architecture and business-case decisions
└── AI_USAGE.md             # AI and Spec Kit usage record
```

## Product context

Kuri is an operations copilot for a food-delivery marketplace in Bogotá, Mexico City and Lima. The product must help Operations prioritize active orders, explain risk, support users safely and control sensitive actions.

## Language

- Use English for code, identifiers, API field names, comments that describe implementation, and commit messages.
- Use Spanish for user-facing UI, assistant responses and delivery documentation.
- Preserve external protocol names and domain constants such as `ORDER_CREATED`, `PICKED_UP`, `REQUIRES_APPROVAL` and `X-Kuri-Role`.

## Architecture boundaries

- Keep domain code independent of NestJS, TypeORM, PostgreSQL and LLM SDKs.
- Put orchestration in application services and adapters in infrastructure.
- Keep API DTOs and frontend types aligned through `packages/contracts`.
- The LLM may select an allowlisted tool, but domain policies decide whether an action is valid.
- Never add generic tools such as SQL execution, arbitrary order updates or unrestricted refunds.

## Safety rules

- Store money as integer cents; never use floating point for monetary decisions.
- Never expose courier phone numbers, documents or other personal data in public/assistant DTOs.
- Keep secrets in environment variables. Do not add API keys to frontend inputs, source code or logs.
- Validate and bound all external input.
- Preserve idempotency for events and support actions.
- Use versioned migrations for schema changes; do not enable TypeORM synchronization.

## Development commands

```bash
pnpm install
pnpm local:up
pnpm lint
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm build
```

`pnpm local:up` starts PostgreSQL, the API and the web app. Use `pnpm local:down` to stop the local environment.

## Change workflow

1. Read the relevant feature artifacts under `specs/` before implementation.
2. Prefer the smallest change that satisfies the acceptance criteria.
3. Add or update tests at the critical business-flow boundary.
4. Run focused validation, then the broader checks relevant to the change.
5. Run `git diff --check` before committing.
6. Use semantic English commits with an emoji, for example `fix(api): 🛡️ redact courier data`.

## Do not modify automatically

- Do not rewrite unrelated user changes.
- Do not commit or push unless explicitly requested.
- Do not add cloud deployment or real authentication without a scoped requirement.
