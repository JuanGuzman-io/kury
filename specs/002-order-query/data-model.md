# Data Model: Order Query and Listing

## Existing source entities

US2 reads the durable entities created by US1. It does not create a second order state or mutate
events.

### Order projection (`orders`)

| Field | Type / shape | Read use | Rules |
|---|---|---|---|
| `order_id` | string | Identity and stable tie-breaker | Required; existing US1 identifier |
| `user_id` | string | Detail only | Never used to authorize this simulated operator role |
| `city` | `BOG` / `MEX` / `LIM` | List filter and views | Exact enum match |
| `restaurant_id` | string | Safe restaurant reference | Join to commercial name only |
| `courier_id` | string or null | Safe courier reference | Null before assignment; never join private fields |
| `current_status` | lifecycle status | Status filter and views | Projected by US1 |
| `current_event_id` | string | Detail provenance | Read-only |
| `status_occurred_at` | timestamp | Detail status timestamp | Source occurrence time |
| `promised_at` | timestamp | Delayed policy and views | Compare against evaluation instant |
| `weather` | `CLEAR` / `RAIN` / `STORM` | Detail/list operational context | Existing US1 value |
| `total_amount_cents` | non-negative integer cents | Detail/list total | Serialize as integer cents; no float |
| `projection_version` | positive integer | Coherence diagnostics | Not a mutation input |
| `created_at` | timestamp | Default list order | Descending |
| `updated_at` | timestamp | List/detail freshness | Read-only |

### Order item (`order_items`)

Items are included only in detail. The composite identity is `(order_id, line_number)`; item values
remain integer cents and quantities remain positive integers.

### Order event (`order_events`)

The immutable source history is included only in detail as the timeline. It contains event identity,
type, status, actor, occurred/received timestamps, safe courier association, processing outcome and
rejection code. The timeline order is `occurred_at ASC`, then `event_id ASC` for equal timestamps.
`received_at` is displayed as diagnostic context and never determines ordering.

### Restaurant operational view

```text
{
  restaurant_id: string,
  name: string
}
```

`name` is the commercial name already stored by US1. Latitude, longitude, preparation metadata and
any future private contact fields are not part of this public view.

### Courier operational view

```text
{
  courier_id: string | null
}
```

The view intentionally excludes `full_name`, `phone`, `document_id`, vehicle, rating and contact
data. A missing courier remains `null`; the read model must not invent a reference.

## Read models

### Order list item

```text
{
  order_id: string,
  city: CityCode,
  restaurant: { restaurant_id: string, name: string },
  courier_id: string | null,
  current_status: OrderStatus,
  delayed: boolean,
  promised_at: ISO-8601 timestamp,
  total_amount_cents: integer,
  updated_at: ISO-8601 timestamp
}
```

No items, event payloads, timeline, courier private fields or restaurant private fields are included.

### Order detail

The detail includes all list fields plus `user_id`, `current_event_id`, `status_occurred_at`,
`weather`, `created_at`, items and the safe timeline described above. It may include `restaurant`
commercial name but never private reference columns.

### Pagination metadata

```text
{
  page: positive integer,
  limit: integer in [1, 100],
  total: non-negative integer,
  totalPages: non-negative integer
}
```

For an empty result, `total=0` and `totalPages=0`; a requested page beyond the last page returns
`data=[]` with the same valid metadata.

## Query model

```text
{
  city?: BOG | MEX | LIM,
  status?: CREATED | ACCEPTED | COURIER_ASSIGNED | PICKED_UP | DELIVERED | CANCELLED,
  delayed?: boolean,
  page: positive integer = 1,
  limit: integer in [1, 100] = 20
}
```

`delayed=true` means `evaluationInstant > promised_at AND current_status != DELIVERED`.
`delayed=false` means the negation of that condition. Omitting `delayed` leaves the dimension
unfiltered. All supplied filters combine with logical AND.

## Relationships and consistency

```text
Order 1 ─── * OrderItem
Order 1 ─── * OrderEvent
Order * ─── 1 Restaurant
Order * ─── 0..1 Courier
```

Detail reads use one coherent read boundary for the order, items, references and events. Querying
must not update `projection_version`, event outcomes, timestamps or any source row.
