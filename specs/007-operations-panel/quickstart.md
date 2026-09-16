# Quickstart: Operations Panel

## Prerequisites

```bash
pnpm local:up
pnpm db:migrate
pnpm data:seed
```

Start the API and web applications in separate terminals:

```bash
pnpm dev:api
pnpm dev:web
```

The panel uses the simulated role context. Use `OPS` for approval resolution and operational
trace access. The API base URL is configured outside the repository; no secret belongs in the web
bundle.

## Critical validation scenarios

1. Open `/orders` and verify only active orders appear, ordered by backend risk.
2. Filter by BOG and `ACCEPTED`, move between numbered pages, refresh, and verify filters persist.
3. Open an order and verify status, risk, timeline occurrence order, safe courier data and support
   history.
4. Open `/approvals`, review a pending request, confirm Reject, and verify the server result updates
   the queue.
5. Approve a pending request through the confirmation dialog and verify approved/obsolete/conflict
   feedback is authoritative.
6. Run each flow at 320 px and desktop width with keyboard only, including dialog focus and Escape.
7. Exercise loading, empty, error and forbidden states using deterministic fixtures or API mocks.

## Validation commands

```bash
pnpm --filter web lint
pnpm --filter web build
pnpm build
```

Browser validation must additionally verify no horizontal scroll at 320 px, visible focus, status
text independent of color, and absence of courier phone/document data in rendered content.
