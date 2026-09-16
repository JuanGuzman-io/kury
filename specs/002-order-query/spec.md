# Feature Specification: Order Query and Listing

**Feature Branch**: `002-order-query`

**Created**: 2026-09-15

**Status**: Draft

**Input**: User description: "US 2 — Consulta, listado y detalle de pedidos"

## Clarifications

### Session 2026-09-15

- Q: ¿El listado de pedidos debe devolver una vista resumida y el detalle ampliar la información operativa y la línea de tiempo? → A: El listado devuelve una vista resumida; el detalle devuelve todos los campos operativos y el timeline.
- Q: ¿Cuál debe ser el orden predeterminado del listado cuando no se proporciona un criterio de ordenamiento? → A: Pedidos más recientes primero, con `created_at DESC` y `order_id ASC` como desempate determinista.
- Q: ¿Qué campos debe incluir la vista resumida de cada pedido en el listado? → A: `order_id`, ciudad, estado actual, `delayed`, `promised_at`, total, referencias operativas y `updated_at`, sin timeline ni datos sensibles.
- Q: ¿Cómo deben mostrarse las referencias de restaurante y courier en las respuestas operativas? → A: Restaurante con `restaurant_id` y nombre comercial; courier únicamente con `courier_id`, sin nombre, teléfono, documento ni contacto.
- Q: ¿Qué debe significar `delayed=false` cuando se usa como filtro? → A: Devuelve únicamente pedidos no retrasados; si se omite el parámetro, no se aplica filtro de retraso.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consultar detalle operativo (Priority: P1)

Como miembro del equipo de Operaciones, quiero consultar un pedido por su identificador para
conocer rápidamente su estado proyectado, información operativa y línea de tiempo confiable.

**Why this priority**: El detalle es la superficie mínima que permite investigar un pedido sin
revisar varias fuentes y depende directamente de la verdad reconstruida por US1.

**Independent Test**: Con un pedido persistido y sus eventos almacenados, consultar su
identificador y comprobar que la respuesta contiene el estado actual, los datos operativos y la
línea de tiempo ordenada por el momento en que ocurrieron los eventos.

**Acceptance Scenarios**:

1. **Given** un pedido existente, **When** Operaciones consulta `GET /api/v1/orders/{orderId}`, **Then**
   recibe `200` con `order_id`, `user_id`, ciudad, restaurante, courier operativo sin datos
   sensibles, estado actual, `promised_at`, total, clima, timestamps y timeline.
2. **Given** un `order_id` inexistente, **When** Operaciones consulta el detalle, **Then** recibe
   `404` con el formato de error consistente de la API.
3. **Given** eventos recibidos fuera de orden, **When** se consulta el detalle, **Then** el timeline
   se muestra en orden ascendente por `occurred_at`, no por el orden de recepción.
4. **Given** un usuario sin el rol operativo requerido, **When** intenta consultar el detalle,
   **Then** la solicitud es rechazada y no revela información del pedido.

### User Story 2 - Listar pedidos con filtros (Priority: P1)

Como miembro del equipo de Operaciones, quiero listar pedidos con filtros combinables para reducir
rápidamente el conjunto de trabajo y encontrar los pedidos relevantes.

**Why this priority**: La consulta individual no escala para monitorear miles de pedidos; el
listado filtrable es la base de la futura detección y priorización de riesgo.

**Independent Test**: Con pedidos de las tres ciudades y varios estados, solicitar el listado con
cada filtro por separado y con combinaciones, y verificar que ningún resultado incumple las
condiciones aplicadas.

**Acceptance Scenarios**:

1. **Given** pedidos persistidos, **When** Operaciones consulta `GET /api/v1/orders`, **Then** recibe
   una colección con `data` y metadatos de paginación.
2. **Given** pedidos de Bogotá, Ciudad de México y Lima, **When** filtra por `city=BOG`, **Then**
   todos los resultados pertenecen a Bogotá y ningún resultado pertenece a otra ciudad.
3. **Given** pedidos en varios estados, **When** filtra por `status=PICKED_UP`, **Then** todos los
   resultados tienen esa proyección actual.
4. **Given** pedidos entregados y no entregados con distintas fechas prometidas, **When** filtra
   por `delayed=true`, **Then** cada resultado cumple `now > promised_at` y `status != DELIVERED`.
5. **Given** filtros de ciudad, estado y retraso, **When** los combina en una misma consulta, **Then**
   el listado aplica todas las condiciones conjuntamente.
6. **Given** una solicitud sin filtros, **When** Operaciones consulta la primera página, **Then** la
   respuesta usa `page=1`, `limit=20` por defecto y un orden estable.

### User Story 3 - Recorrer páginas de resultados (Priority: P1)

Como miembro del equipo de Operaciones, quiero controlar la página y el tamaño de la respuesta
para revisar grandes volúmenes sin perder mi posición ni recibir resultados excesivos.

**Why this priority**: La operación diaria trabaja con decenas de miles de pedidos y necesita una
respuesta acotada, predecible y navegable.

**Independent Test**: Con más de 100 pedidos, consultar varias páginas y tamaños válidos y
verificar que los resultados no se repiten entre páginas consecutivas, que el total es consistente
y que el tamaño nunca supera el máximo permitido.

**Acceptance Scenarios**:

1. **Given** al menos 45 pedidos, **When** se solicitan `page=2&limit=20`, **Then** la respuesta
   contiene como máximo 20 pedidos, indica página 2 y calcula correctamente `totalPages`.
2. **Given** una solicitud con `limit=101` o un valor no positivo, **When** se procesa, **Then** se
   rechaza con un error de validación sin ejecutar una consulta ilimitada.
3. **Given** una página posterior al último resultado, **When** se consulta, **Then** se devuelve una
   colección vacía con metadatos de paginación válidos.
4. **Given** el mismo conjunto de datos y filtros, **When** se repite una consulta, **Then** el orden
   y los metadatos son estables mientras no cambie la fuente de datos.

### Edge Cases

- Un pedido sin courier asignado debe devolver `courier_id: null` y no inventar datos del courier.
- Un pedido `DELIVERED` nunca aparece en `delayed=true`, aunque su hora prometida ya haya pasado.
- Un pedido con `promised_at` exactamente igual al momento de consulta todavía no está retrasado;
  el retraso requiere que el momento actual sea posterior.
- Una ciudad, estado, booleano, página o límite desconocido debe rechazarse con un error de
  validación claro y consistente.
- Un identificador con formato inválido debe rechazarse sin consultar datos de otros pedidos.
- Un timeline vacío o con eventos pendientes debe conservar la información disponible sin alterar
  el estado proyectado de US1.
- El restaurante y el courier pueden existir como referencias internas, pero sus teléfonos,
  documentos y otros datos personales no deben aparecer en ninguna respuesta, error o log.
- La lectura concurrente con una nueva ingesta debe devolver una vista internamente consistente,
  correspondiente a una proyección completa, sin mezclar versiones parciales.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide an authenticated-by-role operational read surface for a
  single order by `order_id`.
- **FR-002**: The system MUST return the projected current status produced by US1 together with
  the order's complete detail fields: `order_id`, `user_id`, city, restaurant reference, courier
  operational reference, `promised_at`, total amount, weather, relevant timestamps, and timeline.
- **FR-003**: The system MUST provide a paginated order collection with a summarized operational
  view in `data` containing `order_id`, city, current status, delayed flag, `promised_at`, total,
  operational references, and `updated_at`, plus `page`, `limit`, `total`, and `totalPages`
  metadata; the collection MUST NOT include the complete event timeline.
- **FR-004**: The system MUST support filtering the collection by the valid cities `BOG`, `MEX`,
  and `LIM`.
- **FR-005**: The system MUST support filtering the collection by every valid projected lifecycle
  status: `CREATED`, `ACCEPTED`, `COURIER_ASSIGNED`, `PICKED_UP`, `DELIVERED`, and `CANCELLED`.
- **FR-006**: The system MUST support a `delayed` filter whose true result set satisfies
  `current_time > promised_at` and `current_status != DELIVERED`; it MUST NOT depend on a
  nonexistent `DELAYED` lifecycle status. `delayed=false` MUST return only orders that do not
  satisfy the delayed condition, while an omitted parameter MUST leave the delayed dimension
  unfiltered.
- **FR-007**: The system MUST apply city, status, and delayed filters conjunctively when more than
  one is provided.
- **FR-008**: The system MUST default to page 1 and limit 20, and MUST reject limits above 100,
  non-positive values, invalid pages, and malformed query values.
- **FR-009**: The system MUST use a stable, documented ordering for list results and calculate
  pagination metadata from the same filtered result set; the default ordering MUST be
  `created_at DESC` followed by `order_id ASC`.
- **FR-010**: The system MUST include the stored event timeline in the order detail, ordered
  ascending by `occurred_at`, with a deterministic tie-breaker for equal timestamps.
- **FR-011**: The system MUST return a consistent not-found error for an unknown order without
  exposing internal database details.
- **FR-012**: The system MUST separate operational courier and restaurant views from internal
  reference data; public read responses MUST never contain courier phone numbers, identity
  documents, restaurant private contact data, or equivalent personal data.
- **FR-013**: The system MUST enforce the existing simulated role authorization for read access and
  MUST reject unauthorized requests before returning order data.
- **FR-014**: The system MUST ensure that a read observes a coherent order projection and timeline,
  even when ingestion occurs concurrently.
- **FR-015**: The system MUST preserve the semantics and historical ordering established by US1;
  querying MUST NOT mutate events, projections, or their outcomes.
- **FR-016**: The system MUST return validation, authorization, not-found, and rate-limit errors
  using the established error shape and a trace identifier without sensitive data.

### Key Entities

- **Order operational view**: The safe read representation of a persisted order, including its
  projected status, operational references, delivery promise, total, weather and timestamps.
- **Order collection**: A filtered, ordered page of order operational views plus pagination metadata.
- **Order timeline**: The immutable event history for one order, presented by event occurrence time
  with deterministic ordering for ties.
- **Operational courier view**: The minimum courier association needed by Operations, limited to a
  non-sensitive identifier and never including phone, identity document or private contact data.
- **Pagination query**: The validated combination of page, limit and optional city, status and
  delayed filters.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 95% of valid single-order and filtered-list queries return a usable result
  within 250 ms after the local environment is warm, excluding network setup time.
- **SC-002**: A list of 1,500 persisted orders can be narrowed by any supported filter combination
  and returned in pages of at most 100 records without a timeout in the documented local setup.
- **SC-003**: 100% of tested delayed results satisfy both delayed conditions, and 0 delivered orders
  appear in the delayed result set.
- **SC-004**: 100% of tested timelines are ordered by occurrence time and remain unchanged after
  repeated reads.
- **SC-005**: 100% of unauthorized, malformed, and unknown-order requests receive the documented
  error category and no order or personal data.
- **SC-006**: 100% of responses in the critical query and list flows exclude courier phone numbers,
  identity documents, and restaurant private contact data.
- **SC-007**: An Operations user can locate a target order using a city, status, or delayed filter
  and reach its coherent detail in no more than two read actions during the critical-flow test.

## Assumptions

- The order, event, projected status, reference and timestamp data from US1 are the source of truth;
  this feature does not recalculate or repair projections.
- The operational roles available for this feature remain the simulated `OPS` and `SYSTEM` roles
  already defined by the project; no real identity system is introduced.
- Query time is the current server time at evaluation. Tests and future consumers can control the
  clock or evaluation instant to make delayed filtering deterministic.
- List results use `created_at DESC` followed by `order_id ASC` as a stable deterministic order.
  Detail timelines use `occurred_at` ascending and event identity as the tie-breaker.
- The default page size is 20 and the maximum page size is 100, as requested; page numbers start at
  1.
- Restaurant and courier names may be used internally to resolve references but are not included in
  the public operational response unless they are explicitly classified as non-sensitive display
  data by the approved contract.
- Rate limiting, trace identifiers, bounded inputs, and the shared error shape from US1 remain in
  force for this read surface.
- Risk detection, frontend work, LLM behavior, support conversations, compensation rules and
  approvals are separate features and remain out of scope.
