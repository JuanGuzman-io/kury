<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Kuri web instructions

## Scope

These instructions apply to `web/` and refine the repository rules in `../AGENTS.md`. The generated Next.js block above is managed by Next.js; preserve it unless the framework regenerates it.

## Product UI

- This is an operations console, not a generic AI chat product. Optimize for fast scanning, confidence and safe decisions.
- Keep user-facing copy in Spanish. Use clear labels for loading, empty, error, success, approval and disabled states.
- Preserve the existing dispatch-ledger visual language: paper background, ink navigation, amber priority accent, cyan focus treatment and restrained motion.
- Prefer reusable components and server-authoritative data. Do not duplicate risk, compensation, cancellation or approval logic in the browser.

## Responsive and accessibility rules

- Design from 320 px upward; do not introduce horizontal page scrolling.
- Keep the desktop navigation sticky and use the collapsible menu on mobile.
- Use semantic landmarks, labels, keyboard-accessible controls and visible `:focus-visible` states.
- Confirmation dialogs must support Escape and communicate destructive or monetary consequences.
- Respect `prefers-reduced-motion` and keep tap targets usable on touch devices.

## Data and API

- Consume backend resources through `web/lib/api` and query hooks.
- Keep API types aligned with `@kuri/contracts`.
- Send the simulated role/user context only through the intended headers.
- Never put provider API keys or other secrets in client code, local storage or frontend forms.
- Represent API loading, error and empty states deliberately; do not silently swallow failures.

## Validation

```bash
pnpm --filter web lint
pnpm --filter web exec tsc --noEmit
pnpm --filter web build
```

Manually check `/orders`, `/orders/:orderId`, `/approvals` and `/chat` at desktop and mobile widths after UI changes.
