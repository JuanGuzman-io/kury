# Research: Order Query and Listing

## Decision: Offset pagination with validated page and limit

**Rationale**: The product contract explicitly exposes `page` and `limit`, the acceptance examples
use page numbers, and the local dataset is moderate. A bounded offset query keeps the contract
simple for the future operations panel while the stable `created_at DESC, order_id ASC` order
prevents nondeterministic page changes for equal timestamps.

**Alternatives considered**: Cursor pagination would scale better for very large or rapidly changing
datasets, but would contradict the requested page-based contract and add a cursor lifecycle that is
not needed for this feature.

## Decision: Evaluate delayed status at read time with an explicit evaluation instant

**Rationale**: The business rule is `now > promised_at AND status != DELIVERED`; no `DELAYED` event or
stored status is needed. Passing an evaluation instant through the policy makes equality boundaries
and tests deterministic while production requests use the current server time.

**Alternatives considered**: Persisting a delayed flag would become stale without a scheduler and
would duplicate a value directly derivable from existing order data. Accepting a client-provided
current time would allow incorrect results and is therefore rejected.

## Decision: Separate summarized list and complete detail response models

**Rationale**: The clarified requirement asks for a small triage-oriented list and complete detail.
The list contains `order_id`, city, status, delayed, promise, total, operational references and
`updated_at`; detail adds user, items, full timestamps and timeline.

**Alternatives considered**: Returning the detail shape for every list record increases payload and
can accidentally expose event history. Returning only IDs and status would force unnecessary detail
opens during triage.

## Decision: Safe reference projections

**Rationale**: Restaurant responses include `restaurant_id` and commercial name. Courier responses
include only `courier_id`; phone, document, name and contact fields remain internal. Separate
response mappers prevent accidental entity serialization.

**Alternatives considered**: Returning ORM entities is rejected because it couples the public
contract to storage and risks leaking private columns. Returning courier names is rejected by the
project privacy rule even though it might be convenient operationally.

## Decision: Coherent read through one transaction boundary

**Rationale**: Detail must not combine an order projection from one point in time with an event list
from another. The query adapter will use one read transaction/manager for the order, references,
items and events. The list will select normalized order fields and derive delayed using the same
database evaluation instant.

**Alternatives considered**: Separate queries on the default manager are simpler but can expose a
mixed projection during concurrent ingestion. A materialized read model is unnecessary for this
feature and would add synchronization complexity.

## Decision: Add query-supporting indexes only through a versioned migration

**Rationale**: Existing indexes cover city and status. US2 requires the default ordering and delayed
filter to remain bounded as data grows, so the plan will add an index involving `created_at` and
`order_id`, plus a composite city/status index if query evidence shows it is needed. No direct
schema mutation or `synchronize` is allowed.

**Alternatives considered**: Relying only on existing single-column indexes may cause avoidable
sorts and scans for combined filters. Adding every possible filter permutation would increase write
and migration cost without evidence.

## Decision: Reuse existing role, trace, throttle and error boundaries

**Rationale**: US1 already defines `OPS`/`SYSTEM` authorization, trace IDs, bounded bodies,
throttling and a safe error shape. Reusing them keeps security behavior consistent and limits US2
to read-specific validation and mapping.

**Alternatives considered**: A separate read authorization or error mechanism would create policy
drift and duplicate boundary code.

## Decision: Use `@nestjs/swagger` alongside the reviewed OpenAPI contract

**Rationale**: Nest's Swagger integration can generate and serve interactive local API
documentation from the same controllers and explicit DTOs that implement US2. This gives developers
fast feedback when routes, parameters or response models change, while the checked-in
`contracts/openapi.yaml` remains the reviewable contract used in planning and integration.

**Alternatives considered**: Maintaining only a handwritten YAML contract risks drift from the
implementation. Generating the only contract at runtime reduces reviewability and makes contract
diffs less visible. Exposing Swagger UI in production is rejected for this local exercise because
the public documentation surface is not required outside local development.
