# Feature Specification: Order Risk Assessment

**Feature Branch**: `003-risk-assessment`
**Created**: 2026-09-15
**Status**: Draft
**Input**: User description: "US 3 — Detección y explicación de riesgo de pedidos"

## Clarifications

### Session 2026-09-16

- Q: ¿El endpoint `GET /api/v1/orders/at-risk` debe reutilizar la paginación de US2? → A: Sí. Debe reutilizar `page` y `limit`, con límite por defecto de 20 y máximo de 100.
- Q: Cuando no pueda resolverse el restaurante o falte `avg_prep_minutes`, ¿cómo debe comportarse el motor de riesgo? → A: Debe evaluar con las señales disponibles, omitir la regla de preparación y añadir una razón informativa en español, sin sumar puntaje por ese dato faltante.
- Q: ¿El listado `GET /api/v1/orders/at-risk` debe devolver la misma vista operativa resumida de US2, enriquecida con `risk`? → A: Sí. Debe reutilizar los campos resumidos de US2 y agregar `risk.level`, `risk.score` y `risk.reasons`, sin incluir la línea de tiempo completa.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Entender el riesgo de un pedido activo (Priority: P1)

Como miembro del equipo de Operaciones, quiero ver el nivel, puntaje y razones de riesgo de un
pedido activo para identificar retrasos potenciales antes de que el usuario contacte a soporte.

**Why this priority**: Convierte la verdad de US1 y la consulta de US2 en una señal accionable.

**Independent Test**: Preparar pedidos con señales distintas, consultar su detalle y comprobar que
cada activo incluye `risk.level`, `risk.score` y razones legibles, deterministas para el mismo
instante.

**Acceptance Scenarios**:

1. **Given** un pedido en `CREATED`, `ACCEPTED`, `COURIER_ASSIGNED` o `PICKED_UP`, **When** se
   consulta su detalle, **Then** incluye nivel, puntaje y razones de riesgo.
2. **Given** un pedido `DELIVERED` o `CANCELLED`, **When** se consulta o lista como activo,
   **Then** no aparece en la superficie de pedidos activos en riesgo.
3. **Given** señales que aumentan el puntaje, **When** se devuelve la evaluación, **Then** cada
   señal aplicada tiene una explicación comprensible para Operaciones.
4. **Given** el mismo contexto e instante, **When** se evalúa varias veces, **Then** el resultado es
   exactamente igual.

### User Story 2 - Detectar el deterioro del riesgo con el tiempo (Priority: P1)

Como miembro de Operaciones, quiero que el riesgo se recalcule al pasar el tiempo o al llegar un
evento para no depender de una actualización manual ni de un evento artificial de retraso.

**Why this priority**: Un pedido puede volverse crítico aunque no reciba eventos.

**Independent Test**: Evaluar el mismo pedido con dos instantes controlados y después de un cambio
de estado, comprobando que el resultado refleja ambas situaciones sin mutar su historia.

**Acceptance Scenarios**:

1. **Given** 30 minutos y luego 7 minutos hasta `promised_at`, **When** se evalúa el mismo pedido,
   **Then** la segunda evaluación puede aumentar de nivel y explica el tiempo restante.
2. **Given** un pedido `ACCEPTED`, **When** llega `COURIER_ASSIGNED`, **Then** la evaluación usa el
   estado actualizado.
3. **Given** un pedido cuyo `promised_at` ya pasó, **When** se evalúa, **Then** incluye la razón de
   retraso y no depende de un estado `DELAYED`.

### User Story 3 - Priorizar pedidos activos por riesgo (Priority: P1)

Como miembro de Operaciones, quiero consultar los pedidos activos ordenados por riesgo para atender
primero los casos de mayor impacto potencial.

**Why this priority**: Reduce el tiempo de revisión y prepara la cola para soporte futuro.

**Independent Test**: Preparar pedidos LOW, MEDIUM y HIGH, consultar la lista y verificar estados,
orden, desempates y razones.

**Acceptance Scenarios**:

1. **Given** pedidos activos y terminales, **When** se consulta `GET /api/v1/orders/at-risk`,
   **Then** solo devuelve `CREATED`, `ACCEPTED`, `COURIER_ASSIGNED` y `PICKED_UP`.
2. **Given** distintos niveles, **When** se consulta la lista, **Then** ordena `HIGH`, `MEDIUM`,
   `LOW`.
3. **Given** igual nivel, **When** se ordenan, **Then** usa `risk_score DESC`, `promised_at ASC`
   y `order_id ASC`.
4. **Given** que cambian señales por evento o tiempo, **When** se consulta de nuevo, **Then** la
   posición refleja la evaluación actual.
5. **Given** una solicitud sin rol operativo, **When** consulta la lista, **Then** recibe rechazo
   sin datos de pedidos.

### Edge Cases

- `CLEAR` no agrega puntaje; `RAIN` y `STORM` agregan pesos distintos y razones en español.
- Las comparaciones en límites de tiempo deben ser estrictas, documentadas y no duplicar señales.
- Preparación igual a `avg_prep_minutes` no excede el promedio; un minuto adicional sí.
- La hora pico usa la hora local de BOG, MEX o LIM.
- Sin restaurante resoluble, la evaluación usa una respuesta segura y una razón de datos faltantes.
- Un pedido sin courier puede evaluarse y no expone datos privados.
- Pedidos terminales no aparecen en activos aunque tengan evaluación histórica.
- Retroceder el reloj no muta eventos; solo cambia una evaluación explícitamente solicitada.
- Clima o estado inválido se rechazan antes de producir una evaluación incorrecta.
- Las razones son legibles en español, estables y sin datos personales.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST evaluate only `CREATED`, `ACCEPTED`, `COURIER_ASSIGNED` and
  `PICKED_UP`; terminal statuses MUST be excluded from the active-risk list.
- **FR-002**: The system MUST return `risk.level`, `risk.score` and `risk.reasons` for every active
  order detail and active-list item. Active-list items MUST reuse the US2 summarized operational
  view and MUST NOT include the complete event timeline.
- **FR-003**: The system MUST calculate risk deterministically from an order context and explicit
  evaluation instant without PostgreSQL, HTTP, network, LLM or machine-learning inference.
- **FR-004**: The context MUST consider current status duration, restaurant average preparation,
  time remaining to `promised_at`, weather, local peak hour and delayed state.
- **FR-005**: Named configurable weights MUST cover weather, peak hour, preparation overrun,
  remaining time and delayed state; unexplained magic numbers are forbidden.
- **FR-006**: Default climate weights MUST be `CLEAR=0`, `RAIN=10` and `STORM=20`, with a Spanish
  reason for each non-zero climate signal.
- **FR-007**: Default peak-hour weight MUST be 10 for local times `12:00 <= time < 14:00` or
  `19:00 <= time < 21:00`.
- **FR-008**: When `avg_prep_minutes` is available, preparation time above it MUST add 20, and
  above 1.5 times that average MUST add an additional 15; the reason MUST include both durations.
  When the restaurant or average is unavailable, the preparation rule MUST be omitted, no score
  MUST be added for the missing signal, and the result MUST include an informative Spanish reason.
- **FR-009**: The initial status-duration rules MUST add 5 when `CREATED` exceeds 5 minutes, 10
  when `COURIER_ASSIGNED` exceeds 10 minutes, and 10 when `PICKED_UP` exceeds 20 minutes; each
  non-zero signal MUST produce a Spanish reason naming the current state and elapsed time.
- **FR-010**: Fewer than 10 minutes before `promised_at` MUST add 20 and fewer than 5 minutes MUST
  add an additional 20; each applied signal is explained once.
- **FR-011**: Being past `promised_at` while not `DELIVERED` MUST add 40 and MUST not require a
  `DELAYED` lifecycle status.
- **FR-012**: Scores MUST map deterministically to default `LOW=0..29`, `MEDIUM=30..59` and
  `HIGH>=60`; weights and thresholds remain configurable through an approved boundary.
- **FR-013**: Every material positive signal MUST generate a concise Spanish reason naming the
  observed condition and relevant comparison.
- **FR-014**: Detail and active-list reads MUST recalculate risk with the current evaluation instant.
- **FR-015**: Accepted order events MUST cause the next evaluation to use the updated context without
  changing event history or projection semantics.
- **FR-016**: `GET /api/v1/orders/{orderId}` MUST include risk without duplicating the algorithm in
  its controller.
- **FR-017**: `GET /api/v1/orders/at-risk` MUST return a paginated collection of active orders,
  reusing the US2 `page` and `limit` contract with a default limit of 20 and maximum of 100;
  results MUST be ordered by level, score, `promised_at` and `order_id` as specified above.
- **FR-018**: Risk endpoints MUST preserve simulated `OPS`/`SYSTEM` authorization, rate limiting,
  trace IDs and the safe error shape.
- **FR-019**: Risk responses and reasons MUST exclude courier phone, document, name/contact details,
  restaurant private contact data and prompt/model metadata.
- **FR-020**: The engine MUST be unit-testable with a plain context and fixed clock, covering
  boundaries, competing signals, failure paths and terminal exclusion.
- **FR-021**: Risk calculations MUST preserve integer-cent monetary values and MUST NOT mutate orders.

### Key Entities

- **Risk assessment**: Read-time `level`, integer `score` and ordered Spanish reasons for one active
  order at an evaluation instant.
- **Risk rule configuration**: Named weights, thresholds, time windows and timezone rules.
- **Risk order context**: Safe order projection, event timing, restaurant average, weather, city and
  evaluation instant needed by the engine.
- **Active risk item**: US2 summarized operational order view enriched with risk and ordered for
  triage; it does not include the complete event timeline.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of active orders return level, score and applicable reasons when a positive signal
  exists.
- **SC-002**: 100% of repeated assessments with identical context and instant return identical
  results.
- **SC-003**: 100% of tested terminal orders are excluded from the active-risk list.
- **SC-004**: 100% of tested rule boundaries respect preparation, time, delayed, weather and peak
  conventions.
- **SC-005**: 100% of tested positive signals have Spanish explanations and no PII.
- **SC-006**: At least 95% of warmed detail and active-risk reads with 1,500 orders complete under
  250 ms locally.
- **SC-007**: 100% of active-risk results follow level, score, promise-time and ID ordering.
- **SC-008**: Operations can identify the highest-risk active order and understand its top reasons in
  one list read during the critical-flow test.

## Assumptions

- US1/US2 projection, events, city, weather, `promised_at` and restaurant reference are the source
  of truth.
- Preparation overrun measures time in `ACCEPTED`; `CREATED`, `COURIER_ASSIGNED` and `PICKED_UP`
  use their own status-duration thresholds and do not receive the preparation-overrun signal.
- Missing restaurant or `avg_prep_minutes` data does not add risk; the engine uses available signals
  and reports the missing preparation signal in Spanish.
- Remaining-time bonuses are cumulative; exactly 10 or 5 minutes does not activate the strict rule.
- City time zones are `America/Bogota`, `America/Mexico_City` and `America/Lima`.
- Risk is calculated on-read rather than persisted as a second source of truth.
- The active-risk endpoint reuses US2 pagination semantics: `page` defaults to 1 and `limit` defaults
  to 20 with a maximum of 100.
- Precision/recall evaluation is deferred; deterministic rule tests are required.
- LLM, ML, support, R1-R7, approvals, automatic actions, real authentication and frontend remain out
  of scope.
