# Feature Specification: Ingesta y reconstrucción de pedidos

**Feature Branch**: `main`

**Created**: 2026-09-15

**Status**: Draft

**Input**: Descripción de la US1 para recibir eventos de pedidos, conservar su historial y
reconstruir un estado actual correcto ante duplicados y entregas fuera de orden.

## Clarifications

### Session 2026-09-15

- Q: ¿Qué debe pasar cuando llega un cambio de estado antes del evento de creación de su pedido?
  → A: Conservar el evento como pendiente y proyectarlo cuando llegue la creación.
- Q: ¿Qué debe hacer el sistema si dos eventos distintos tienen la misma hora de ocurrencia pero
  estados incompatibles? → A: Conservar el primer estado confiable y rechazar el evento conflictivo.
- Q: ¿Qué debe hacer el sistema si llega un estado válido, como `PICKED_UP`, pero aún faltan etapas
  intermedias por recibir? → A: Conservarlo como pendiente y proyectarlo cuando estén disponibles
  sus etapas previas.
- Q: ¿Qué debe pasar si, después de proyectar `DELIVERED` o `CANCELLED`, llega un evento válido pero
  más antiguo en el tiempo? → A: Conservarlo en el historial y mantener el estado terminal
  proyectado.
- Q: ¿Desde qué estados debe aceptar esta US un evento `CANCELLED` como hecho válido? → A: Desde
  cualquier estado no terminal.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Registrar un pedido creado (Priority: P1)

Como sistema de operaciones, quiero registrar un pedido cuando se recibe su evento de creación
para disponer de una fuente confiable de su estado actual, contexto operativo e historial.

**Why this priority**: Sin un pedido identificable y durable no es posible interpretar cambios de
estado ni construir los casos de riesgo, soporte o panel.

**Independent Test**: Se procesa un evento de creación válido y se verifica que el pedido queda
disponible con su información de negocio y un único evento en su historial después de reiniciar el
servicio.

**Acceptance Scenarios**:

1. **Given** un evento `ORDER_CREATED` válido para un identificador nuevo, **When** se procesa,
   **Then** se crea el pedido con usuario, ciudad, restaurante, ítems, valor total, hora prometida y
   clima, y se conserva el evento en su historial.
2. **Given** un evento de creación con campos obligatorios inválidos o incompletos, **When** se
   recibe, **Then** se rechaza con una explicación y no se crea un pedido ni un evento parcial.
3. **Given** un pedido y su evento de creación ya registrados, **When** el servicio se reinicia,
   **Then** el pedido y su historial permanecen disponibles sin alteración.

---

### User Story 2 - Mantener una proyección temporal correcta (Priority: P1)

Como sistema de operaciones, quiero que el estado de un pedido represente el evento válido más
reciente en el tiempo, aunque los eventos se reciban repetidos o en distinto orden, para no tomar
decisiones con información obsoleta.

**Why this priority**: La confiabilidad del estado es el núcleo del producto y condiciona todos los
casos posteriores.

**Independent Test**: Se envía una misma secuencia de eventos en orden canónico, con duplicados y
en orden alterado; los tres resultados conservan el mismo historial sin duplicados y la misma
proyección final.

**Acceptance Scenarios**:

1. **Given** un pedido cuyo último cambio ocurrió a las 10:10, **When** se procesa un cambio válido
   ocurrido a las 10:15, **Then** su estado actual refleja el cambio de las 10:15.
2. **Given** un pedido proyectado como `COURIER_ASSIGNED` por un evento de las 10:15, **When** llega
   después un evento `ACCEPTED` ocurrido a las 10:12, **Then** se conserva ese evento en el
   historial pero el estado actual permanece `COURIER_ASSIGNED`.
3. **Given** que ya se procesó un evento con un `event_id`, **When** llega de nuevo el mismo evento,
   **Then** no se añade otro historial ni se modifica la proyección del pedido.
4. **Given** un cambio de estado válido que llega antes que la creación del mismo pedido, **When**
   llega posteriormente la creación, **Then** ambos eventos quedan en el historial y se calcula el
   estado usando su orden temporal.

---

### User Story 3 - Auditar y preparar datos operativos (Priority: P2)

Como responsable de operaciones, quiero cargar el conjunto inicial de datos y conservar una línea
de tiempo completa por pedido para poder comprobar cómo se obtuvo su estado y preparar los casos
posteriores.

**Why this priority**: La trazabilidad permite investigar discrepancias y la carga repetible habilita
demostraciones y pruebas sin preparación manual.

**Independent Test**: En un entorno vacío se ejecuta la carga inicial una vez y se inspeccionan un
pedido con creación, cambios de estado, restaurante, courier asignado cuando corresponda, e
historial completo.

**Acceptance Scenarios**:

1. **Given** un entorno sin pedidos, **When** se ejecuta la carga inicial con los tres archivos de
   datos, **Then** los pedidos y sus eventos quedan disponibles sin intervención manual.
2. **Given** un pedido con eventos válidos no duplicados, **When** se consulta su línea de tiempo,
   **Then** se muestran todos los eventos ordenados por su instante de ocurrencia.
3. **Given** una carga inicial ya aplicada, **When** se vuelve a ejecutar con los mismos archivos,
   **Then** no se duplican eventos ni pedidos.

### Edge Cases

- Un cambio de estado recibido antes de la creación se conserva como pendiente y se incorpora a la
  proyección cuando exista la creación correspondiente.
- Un cambio de estado cuya etapa previa aún no llegó se conserva como pendiente y solo se proyecta
  cuando la secuencia temporal completa sea válida.
- Un cambio de estado para un pedido que nunca recibe creación permanece auditable, pero no crea un
  pedido incompleto ni se presenta como pedido operativo.
- Eventos con el mismo `event_id` y contenido distinto se rechazan como conflicto de integridad y
  se registran para diagnóstico sin modificar datos confiables.
- Eventos distintos con la misma hora de ocurrencia y estados incompatibles se rechazan como
  conflicto temporal; el historial y estado previamente confiables no cambian.
- Un evento recibido después de `DELIVERED` o `CANCELLED`, pero ocurrido antes del evento terminal,
  se conserva en el historial sin reabrir ni modificar el pedido.
- Un evento ocurrido después de `DELIVERED` o `CANCELLED` se rechaza como transición incompatible.
- Datos de courier incompletos o ausentes no impiden conservar el evento; la asignación queda sin
  información adicional hasta que exista contexto válido.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST aceptar eventos de creación y de cambio de estado de pedidos.
- **FR-002**: El sistema MUST validar la identidad única del evento, pedido, tipo, instante de
  ocurrencia y contenido obligatorio antes de aceptarlo.
- **FR-003**: El sistema MUST crear un pedido al aceptar su primer evento válido de creación y
  asociarle usuario, ciudad, restaurante, ítems, importe total, hora prometida y clima.
- **FR-004**: El sistema MUST conservar un historial inmutable de cada evento válido no duplicado,
  incluido actor, instante de ocurrencia, instante de recepción y datos propios del evento.
- **FR-005**: El sistema MUST identificar eventos duplicados por `event_id`; una repetición exacta
  MUST tener resultado idempotente y no alterar el pedido ni su historial.
- **FR-006**: El sistema MUST rechazar un `event_id` ya conocido cuando su contenido sea diferente,
  sin cambiar el historial confiable ni la proyección actual.
- **FR-007**: El sistema MUST usar `occurred_at` como única fuente de orden para reconstruir el
  estado actual; `received_at` MUST conservarse solo como dato diagnóstico.
- **FR-008**: El sistema MUST conservar eventos válidos que lleguen fuera de orden y MUST impedir
  que un evento más antiguo sobrescriba un estado proyectado desde uno más reciente.
- **FR-009**: El sistema MUST conservar temporalmente los cambios de estado que lleguen antes de la
  creación o de sus etapas previas y MUST recalcular la proyección cuando la secuencia temporal
  válida esté disponible.
- **FR-010**: El sistema MUST mantener únicamente transiciones permitidas del ciclo de vida:
  `CREATED`, `ACCEPTED`, `COURIER_ASSIGNED`, `PICKED_UP`, `DELIVERED` y `CANCELLED`. Un evento
  `CANCELLED` MUST ser aceptable desde cualquier estado no terminal.
- **FR-011**: El sistema MUST tratar `DELIVERED` y `CANCELLED` como estados terminales. MUST
  conservar eventos válidos ocurridos antes del evento terminal aunque se reciban después, sin
  cambiar la proyección, y MUST rechazar cambios ocurridos después del estado terminal.
- **FR-012**: El sistema MUST conservar, cuando aplique, la asociación entre pedido y courier sin
  requerir que el pedido exponga datos personales del courier.
- **FR-013**: El sistema MUST conservar pedidos, eventos y proyección actual después de reinicios.
- **FR-014**: El sistema MUST permitir ejecutar una carga inicial repetible a partir de
  `events.jsonl`, `restaurants.json` y `couriers.json` en un entorno vacío.
- **FR-015**: La carga inicial MUST producir el mismo resultado de datos al ejecutarse de nuevo con
  las mismas entradas, sin duplicar pedidos o eventos.
- **FR-016**: El sistema MUST proporcionar un resultado explícito para cada evento recibido:
  aceptado, duplicado, pendiente, rechazado por validación o rechazado por conflicto.
- **FR-017**: Esta US MUST excluir filtros, búsqueda, clasificación de riesgo, asistente, reglas de
  soporte, aprobaciones y interfaz de operaciones.

### Key Entities *(include if feature involves data)*

- **Order**: Representa el pedido operativo actual, su identidad, contexto comercial, estado
  proyectado, hora prometida y referencias a sus eventos.
- **Order Event**: Representa un hecho recibido sobre un pedido, identificado de forma única y
  fechado tanto por ocurrencia como por recepción; es la fuente de reconstrucción del estado.
- **Order Projection**: Representa el estado actual derivado de los eventos válidos y su orden
  temporal; no sustituye el historial.
- **Restaurant**: Representa el comercio asociado al pedido, su ciudad y datos operativos necesarios
  para contextualizarlo.
- **Courier Assignment**: Representa la vinculación operativa de un courier a un pedido sin exponer
  sus datos personales.
- **Load Run**: Representa una ejecución identificable de la carga inicial y su resultado para poder
  verificar su repetibilidad.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100% de los eventos de creación válidos usados en las pruebas crea exactamente un
  pedido con todos los datos de negocio obligatorios y un evento en su historial.
- **SC-002**: Al reprocesar dos veces un conjunto de eventos, el número de pedidos y eventos
  conservados permanece idéntico al obtenido tras el primer procesamiento.
- **SC-003**: Para el 100% de las secuencias de prueba con eventos desordenados, el estado final
  coincide con el resultado de ordenar los mismos eventos válidos por hora de ocurrencia.
- **SC-004**: El 100% de los eventos válidos no duplicados de las pruebas puede verse en la línea de
  tiempo del pedido correspondiente después de un reinicio.
- **SC-005**: Una persona operadora puede cargar el conjunto inicial de aproximadamente 1,500 pedidos
  en un entorno vacío con un único comando documentado y sin editar archivos manualmente.
- **SC-006**: La carga repetida de las mismas fuentes finaliza sin crear pedidos ni eventos
  adicionales.

## Assumptions

- El conjunto de datos puede contener alrededor de 3% de eventos duplicados y 5% recibidos fuera de
  orden; el diseño se valida contra ambos casos.
- La hora de ocurrencia es comparable entre todos los eventos recibidos. Dos eventos distintos con la
  misma hora y estados incompatibles se consideran un conflicto de calidad de datos, no una señal
  para adivinar un orden.
- Los importes del pedido se conservarán con precisión monetaria íntegra conforme a la constitución,
  aunque esta US no aplica todavía reglas de compensación.
- La carga inicial usa archivos suministrados o un conjunto sintético determinista equivalente cuando
  esos archivos no estén disponibles.
- Los roles simulados, filtros, riesgo, soporte, aprobaciones y frontend se tratarán en historias
  posteriores y no forman parte de la aceptación de esta US.
- Esta US registra `CANCELLED` como un hecho emitido por la fuente. Las reglas que autorizan o
  rechazan una solicitud de cancelación pertenecen a la historia de soporte posterior.
