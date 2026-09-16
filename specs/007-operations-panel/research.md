# Research: Operations Panel

## Frontend architecture

- **Decision**: Use Next.js App Router route segments for `/orders`, `/orders/[orderId]` and
  `/approvals`, with feature-owned components and a small typed API client. Use TanStack Query for
  server state, query invalidation after approval resolution, and explicit loading/error states.
- **Rationale**: The panel is read-heavy and server-authoritative. Query state avoids duplicating
  API data in global state while preserving filters in URL search parameters.
- **Alternatives considered**: A large global store was rejected because the feature has no shared
  client-owned business state. Fetching directly in every component was rejected because it makes
  invalidation and failure states inconsistent.

## Visual direction to reduce AI slop

- **Decision**: Build an editorial dispatch ledger aesthetic: deep ink/navy canvas, warm paper
  surfaces, a single amber priority accent, restrained cyan for system metadata, and hairline
  borders. Use a distinctive display face for page titles and a highly legible sans face for
  operational data. Use compact density where comparison matters and generous spacing around
  decisions.
- **Rationale**: Operations users need hierarchy and scan speed, not decorative “AI dashboard”
  tropes. A strong palette and typography pair makes risk and action states memorable without
  relying on color alone.
- **Alternatives considered**: Generic white cards with purple gradients, glassmorphism and
  rounded-everything were rejected because they reduce information hierarchy and resemble
  interchangeable generated interfaces.
- **Motion rule**: Use only purposeful transitions: initial staggered reveal, filter pending state,
  row focus/selection, dialog entry/exit and toast feedback. Respect `prefers-reduced-motion`.

## Responsive and accessibility strategy

- **Decision**: Use a desktop comparison table that becomes stacked order briefs at narrow widths;
  preserve the same reading order and actions. Keep all interactive controls native and labeled,
  with visible focus, logical tab order, keyboard-operable dialogs and non-color status markers.
- **Rationale**: A dense table is efficient on desktop but fails at 320 px. A deliberate responsive
  transformation preserves task meaning without horizontal scrolling.
- **Alternatives considered**: Horizontal scrolling was rejected because it hides priority columns
  and conflicts with the constitution's mobile usability requirement. Hover-only detail was rejected
  because it is unavailable to keyboard and touch users.

## Data and refresh behavior

- **Decision**: Keep filters, page and selected order in URL search parameters. Fetch the backend's
  risk-ordered active list, order detail, order traces and pending approvals. Refresh only through a
  visible manual control and invalidate the relevant query after a resolution.
- **Rationale**: URL state makes the panel shareable and recoverable while honoring the clarified
  manual-refresh decision. The backend remains the only authority for risk and action outcomes.
- **Alternatives considered**: Polling and push updates were deferred because live streaming is out
  of scope for US7 and could interrupt an operator's review context.

## Approval interaction safety

- **Decision**: Use one reusable confirmation dialog for Approve and Reject. It shows the order,
  action, amount, consequence and an explicit pending state; it disables duplicate submission and
  returns focus to the trigger on safe dismissal.
- **Rationale**: Both actions permanently change the approval state and must be deliberate and
  auditable.
- **Alternatives considered**: Immediate row actions were rejected because a dense queue increases
  accidental activation risk. Optimistic UI was rejected because the backend may return stale,
  rejected or obsolete outcomes.

## API boundary

- **Decision**: Consume the existing versioned REST endpoints and shared contracts. The client maps
  transport failures to Spanish user-facing messages while preserving status codes for permission,
  not-found, validation and conflict behavior.
- **Rationale**: This keeps the panel thin and prevents business rules from drifting into the UI.
- **Alternatives considered**: A frontend-specific aggregation endpoint was deferred until the panel
  demonstrates a real contract gap; the existing order and trace surfaces are sufficient for US7.
