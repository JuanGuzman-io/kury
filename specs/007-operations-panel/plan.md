# Implementation Plan: Operations Panel

**Branch**: `007-operations-panel` | **Date**: 2026-09-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-operations-panel/spec.md`

## Summary

Build the first operational frontend for Kuri Delivery: risk-prioritized active orders, order
detail with timeline and support history, and a safe approval inbox. The frontend remains a thin
presentation and orchestration layer over US1–US6 APIs and shared contracts. Its distinctive visual
direction is an editorial dispatch ledger: ink/navy canvas, warm paper surfaces, amber priority
signals, cyan system metadata, deliberate density and restrained motion.

## Technical Context

**Language/Version**: TypeScript 5, React 19, Next.js 16 App Router

**Primary Dependencies**: Tailwind CSS 4, TanStack Query, shared `@kuri/contracts`, native SVG
icons or a small accessible icon set

**Storage**: Browser URL search parameters for filters/page; no client-owned business persistence

**Testing**: Web lint/build, component and interaction tests for meaningful UI states, browser E2E
for critical panel journeys at 320 px and desktop widths

**Target Platform**: Local responsive web application, modern evergreen browsers, keyboard and
touch input

**Project Type**: Frontend web application in a pnpm monorepo

**Performance Goals**: Operators see a stable loading state immediately; bounded list/detail
  requests render usable content within 1 second after local API response; no layout causes
  horizontal scrolling at 320 px

**Constraints**: Spanish UI, backend-authoritative business decisions, simulated role header,
  no secrets in browser code, WCAG 2.2 AA, manual refresh, numbered pagination, no live streaming

**Scale/Scope**: Three routes, reusable feature components, approximately 1,500 synthetic orders,
  bounded pages up to 100 records, two primary operator workflows plus linked detail inspection

## Constitution Check

- **Domain isolation**: PASS. The web client only renders backend decisions and does not contain
  risk, compensation, cancellation or approval eligibility rules.
- **Security/privacy**: PASS. API DTOs and trace payloads are treated as untrusted; the UI has no
  courier private fields, secrets or generic mutation capability. Backend authorization remains
  authoritative.
- **Accessibility/usability**: PASS by design. Semantic controls, focus management, non-color
  cues, Spanish feedback, reduced motion and a 320 px layout are explicit acceptance targets.
- **Local reproducibility**: PASS. The panel uses the existing local API, Docker PostgreSQL and
  shared contracts with no network-only dependency.
- **Quality evidence**: PASS at planning gate. Implementation must include critical-flow browser
  evidence; trivial visual wrappers do not require isolated unit tests.

## Architecture and Data Flow

```text
URL filters/page
      ↓
TanStack Query hooks
      ↓
typed API client ── X-Kuri-Role context
      ↓
US1–US6 REST endpoints
      ↓
orders / risk / traces / approvals
      ↓
accessible feature components and explicit UI states
```

Approval mutations invalidate the approval list and the affected order detail only after a server
response. Stale or conflict responses remain visible and are never replaced by optimistic success.

## Visual System Direction

- **Concept**: “dispatch ledger” — a calm, high-contrast operations room rather than a generic
  analytics dashboard.
- **Palette**: `--ink-950` for the shell, `--paper-50` for content, `--amber-500` for priority,
  `--cyan-400` for metadata, `--red-500` for explicit danger and muted slate neutrals.
- **Type**: distinctive editorial display face for page titles paired with a highly legible sans
  for rows, timestamps and controls; numeric values use tabular figures.
- **Shape**: restrained 2–8 px radii, hairline borders and offset separators; avoid floating card
  grids and decorative gradients.
- **Motion**: staggered first reveal, query pending shimmer/indicator, selection transition,
  confirmation dialog and toast; all disabled under `prefers-reduced-motion`.
- **Micro UX**: every action has idle, focus, pending, success, error and forbidden/read-only
  treatment. Confirmation dialogs preserve focus and explain consequence in Spanish.

## Project Structure

### Documentation

```text
specs/007-operations-panel/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/operations-panel.md
└── tasks.md
```

### Source Code

```text
web/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                 # redirect/entry to operations
│   ├── orders/page.tsx
│   ├── orders/[orderId]/page.tsx
│   └── approvals/page.tsx
├── components/
│   ├── layout/                  # shell, navigation, page header
│   ├── orders/                  # order list, row/brief, filters, risk
│   ├── order-detail/            # summary, timeline, support history
│   ├── approvals/               # queue, confirmation dialog, status feedback
│   └── ui/                      # accessible primitives only
├── lib/
│   ├── api/                     # typed client and error mapping
│   ├── query/                   # provider and feature hooks
│   └── formatters/              # Spanish display formatting only
└── tests/                       # critical interaction/browser tests
```

**Structure Decision**: Keep UI features in `web/`, reuse `@kuri/contracts`, and keep API access
behind `web/lib/api`. Components may format and present values but cannot decide domain eligibility.

## Delivery Phases

1. Establish visual tokens, font loading, shell/navigation and API/query boundaries.
2. Build Orders with URL filters, risk ordering, numbered pagination and all operation states.
3. Build Order Detail with timeline, risk and redacted support trace progressive disclosure.
4. Build Approvals with read-only permission behavior, confirmation, mutation feedback and query
   invalidation.
5. Validate keyboard navigation, 320 px/desktop layouts, privacy rendering and critical flows.

## Complexity Tracking

No constitution violations identified. TanStack Query and a reusable UI layer are bounded to server
state and accessibility consistency; a global business state store is intentionally excluded.
