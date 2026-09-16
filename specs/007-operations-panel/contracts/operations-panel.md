# Operations Panel UI Contract

## Backend resources consumed

| UI capability | Request | Authoritative response |
|---|---|---|
| Active orders | `GET /api/v1/orders/at-risk` with `city`, `status`, `page`, `limit` | Risk-ordered paginated orders |
| Order detail | `GET /api/v1/orders/:orderId` | Operational order, risk and timeline data |
| Order timeline | Detail response or `GET /api/v1/orders/:orderId/events` when available | Events ordered by `occurred_at` |
| Order support history | `GET /api/v1/traces/orders/:orderId` | Redacted paginated trace records |
| Approval queue | `GET /api/v1/approvals?status=PENDING&page=&limit=` | Redacted paginated approvals |
| Approve | `POST /api/v1/approvals/:approvalRequestId/approve` | `ALLOWED`, `REJECTED` or stale/conflict result |
| Reject | `POST /api/v1/approvals/:approvalRequestId/reject` | Rejected result |

The client must send the simulated role context required by the local API and treat `400`, `403`,
`404` and `409` as distinct user-facing states. It must never retry a resolution mutation
automatically.

## UI state contract

Every query renders one of `loading`, `success`, `empty`, `error` or `forbidden`. Resolution renders
`confirming`, `submitting`, `resolved`, `obsolete` or `conflict`. A mutation is considered complete
only after the server response is received; optimistic approval/rejection is forbidden.

## Visual contract

- Ink/navy background, warm paper surfaces, amber priority accent and restrained cyan metadata.
- Risk and status include text/icon labels, not color alone.
- Page titles use the selected display face; dense operational values use the selected readable
  data face.
- Primary action hierarchy is visible at 320 px without horizontal scrolling.
- Trace payloads are collapsed and bounded by default.
