# Data Model: Order Risk Assessment

US3 no agrega una tabla ni muta la proyección de pedidos. El riesgo es una vista calculada en cada
lectura sobre los datos durables de US1/US2.

## Risk rule configuration

| Field | Shape | Default | Rule |
|---|---|---:|---|
| `weather.clear` | integer points | 0 | No reason when zero |
| `weather.rain` | integer points | 10 | One Spanish reason |
| `weather.storm` | integer points | 20 | One Spanish reason |
| `peakHour` | integer points | 10 | Local half-open windows 12:00–14:00 and 19:00–21:00 |
| `prepOverAverage` | integer points | 20 | Only when elapsed ACCEPTED time is greater than average |
| `prepOverOneAndHalfAverage` | integer points | 15 | Additional when elapsed exceeds 1.5 × average |
| `statusDuration` | map | 5/10/10 | CREATED >5m, COURIER_ASSIGNED >10m, PICKED_UP >20m |
| `remainingUnderTen` | integer points | 20 | Additional when remaining time is strictly <10m |
| `remainingUnderFive` | integer points | 20 | Additional when remaining time is strictly <5m |
| `delayed` | integer points | 40 | `now > promised_at` and status is not DELIVERED |
| `thresholds` | LOW/MEDIUM/HIGH | 0..29/30..59/60+ | Deterministic classification |

Configuration is internal and validated at construction. It is not client input or a public field.

## Risk order context

```text
{
  orderId: string,
  city: BOG | MEX | LIM,
  currentStatus: CREATED | ACCEPTED | COURIER_ASSIGNED | PICKED_UP | DELIVERED | CANCELLED,
  statusOccurredAt: Date,
  acceptedAt: Date | null,
  promisedAt: Date,
  weather: CLEAR | RAIN | STORM,
  averagePreparationMinutes: positive integer | null,
  evaluationInstant: Date
}
```

The adapter derives `acceptedAt` and status timing from US1 event history/projection. The engine
rejects invalid enum values, invalid dates, non-positive averages and negative monetary values
before returning an assessment. It does not mutate input.

## Risk assessment

```text
{
  level: LOW | MEDIUM | HIGH,
  score: non-negative integer,
  reasons: string[]
}
```

Reasons are Spanish, concise, privacy-safe and returned in stable rule order. Missing restaurant or
average adds no points and produces an informative reason. Terminal orders are excluded from the
active-risk collection.

## Public read models

### Risk-enriched order summary

```text
US2 OrderListItem + { risk: RiskAssessment }
```

The summary retains safe operational fields, integer cents and `updated_at`; it excludes timeline,
event payloads, courier PII, restaurant private fields, rule configuration and model metadata.

### Risk-enriched order detail

```text
US2 OrderDetail + { risk: RiskAssessment }
```

The existing US2 detail timeline remains available only on the detail route, not in `at-risk` rows.

### Active-risk page

```text
{
  data: RiskEnrichedOrderSummary[],
  pagination: { page: positive integer, limit: 1..100, total: non-negative integer, totalPages: non-negative integer }
}
```

The query accepts US2 filters plus `page` and `limit`; active-risk results always restrict to active
statuses and use `HIGH`, `MEDIUM`, `LOW`, then `risk.score DESC`, `promised_at ASC`, `order_id ASC`.

## Relationships and source boundaries

```text
Order projection 1 ─── 1 read-time RiskAssessment
Order projection 1 ─── 0..1 Restaurant preparation context
Order projection 1 ─── * OrderEvent (timing source)
```

Risk is not an independent aggregate, event or persistence record. Reads must not update events,
projection versions, timestamps or monetary values.
