# Research: Order Risk Assessment

## Decision: Pure deterministic domain engine with explicit evaluation instant

**Rationale**: Risk is a business decision and must remain independent of NestJS, TypeORM, HTTP,
LLM and network. Passing `now` explicitly makes repeated evaluations reproducible and lets the API
recalculate on every read without persisting a stale value.

**Alternatives considered**: A scheduled/materialized risk table adds synchronization and
staleness concerns. LLM or ML is outside US3 and makes rule boundaries harder to explain and test.

## Decision: Named cumulative rules and explicit default configuration

**Rationale**: One configuration object holds weather, peak, preparation, status-duration,
remaining-time, delayed weights and level thresholds. Rules are evaluated once in documented order;
remaining-time and preparation tiers are cumulative where specified. This avoids magic numbers and
preserves exact boundary tests.

**Alternatives considered**: Dispersed constants invite inconsistent changes. A generic rules engine
adds indirection without product benefit at this scope.

## Decision: Local peak windows use IANA city time zones

**Rationale**: BOG, MEX and LIM have explicit IANA mappings. `Intl.DateTimeFormat` with `timeZone`
converts the evaluation instant to local time without trusting client time or adding a dependency.
The windows are half-open: 12:00–14:00 and 19:00–21:00.

**Alternatives considered**: UTC comparisons misclassify cities. A client timezone parameter is
untrusted and could change classification.

## Decision: Missing restaurant preparation data is neutral but visible

**Rationale**: The engine uses all available signals, skips preparation scoring when restaurant or
average is missing, and adds a concise Spanish reason describing the unavailable signal. It does
not manufacture MEDIUM or HIGH.

**Alternatives considered**: Escalating missing data conflates data quality with delivery risk;
silently skipping it hides an operational limitation.

## Decision: Reuse US2 summarized list contract and pagination

**Rationale**: `at-risk` is a triage view, so it returns the US2 summary plus risk and excludes the
full timeline. It reuses `page`/`limit` (20 default, 100 maximum), safe DTO boundaries, roles, rate
limiting and trace/error behavior.

**Alternatives considered**: Returning all active orders is unsafe at scale. Returning only IDs or
complete detail causes extra reads or oversized responses.

## Decision: Read-time assessment over a bounded active query

**Rationale**: The query restricts active statuses and paginates, then assesses contexts and orders
by risk level, score descending, promised time ascending and ID ascending. If query evidence requires
it, indexes are added only through a versioned migration.

**Alternatives considered**: Persisting a second risk source requires event/time schedulers. Sorting
historical orders before filtering expands the read path unnecessarily.

## Decision: Separate public risk DTOs from domain/context data

**Rationale**: Public results expose only level, score and Spanish reasons alongside safe US2
summary/detail. Rule configuration, internal context, event payloads, private restaurant data and
model information are never serialized.

**Alternatives considered**: Serializing context risks leakage; returning only level fails
explainability.
