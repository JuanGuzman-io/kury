# Research: Conversational Support Assistant

## Decision: Provider port with deterministic local adapter

**Rationale**: Provider SDKs and credentials must not enter domain code or be required for local
tests. A small port can return final Spanish text or one structured tool request; the deterministic
adapter makes the critical flow reproducible and supports prompt-injection tests.

**Alternatives considered**: Calling a provider directly from the controller couples transport to
vendor behavior. Requiring a real provider makes the suite non-reproducible and expensive.

## Decision: One tool round and strict allow-list

**Rationale**: One request may contain at most one provider tool-call round, followed by a final
response. Tool names and arguments are validated against a catalog before dispatch. This bounds
latency/cost and blocks tool chaining or generic capabilities.

**Alternatives considered**: Unlimited loops create denial-of-service and cost risk. Multiple rounds
are deferred until a separately evaluated agent workflow exists.

## Decision: Trusted simulated user context separate from request body

**Rationale**: Ownership cannot rely on a user-controlled `user_id`. US4 will use `X-Kuri-User-Id` as
the exercise's simulated trusted context, while an optional body value is ignored for authorization
or rejected on conflict. This keeps the boundary ready for real authentication later.

**Alternatives considered**: Trusting body identity permits trivial impersonation. Using only the
simulated role header conflates operator role with end-user ownership.

## Decision: Transactional conversation persistence

**Rationale**: Create/continue, append the user turn, execute a non-mutating tool, append the
assistant answer and update the conversation in one controlled application boundary. Unique IDs and
an ordered sequence make retries and context reconstruction deterministic.

**Alternatives considered**: Persisting only after provider completion loses user history on failure.
Persisting each intermediate provider artifact would expand US4 into the US6 audit scope.

## Decision: Sanitized status tool reuses US2 query capabilities

**Rationale**: `get_order_status` can consume the existing safe order query/read port, then enforce
ownership and return only status, promise, delay, risk if available and safe restaurant/courier
references. It never serializes ORM entities or private fields.

**Alternatives considered**: A separate status data path duplicates query rules. Returning full order
detail leaks unnecessary timeline and private context.

## Decision: Future action tools are safe stubs

**Rationale**: `request_order_cancellation`, `evaluate_delay_compensation` and `report_missing_items`
demonstrate orchestration and structured handoff while returning `NOT_IMPLEMENTED_US5` or a prepared
request. They do not mutate orders, calculate policy or create approvals.

**Alternatives considered**: Executing actions now violates the US4 boundary and risks bypassing
R1-R7. Omitting the tools prevents testing the intended future integration contract.
