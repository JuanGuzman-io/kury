---

description: "Tareas ejecutables para la ingesta y reconstruccion de pedidos"
---

# Tasks: Order Event Ingestion

**Input**: Artefactos de diseño en `/specs/001-order-event-ingestion/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [OpenAPI](./contracts/openapi.yaml) y
[contrato de carga](./contracts/data-load.md)

**Tests**: Obligatorios solo cuando protegen una decisión de dominio o un flujo crítico. Escribir
esas pruebas antes de su implementación y comprobar que fallan por la razón esperada. No crear
unit tests aislados para DTOs, mapeadores, wiring o delegación trivial de framework.

**Organization**: Las fases de historia entregan incrementos verificables. US2 se apoya en la
creación durable de US1; US3 consume la proyección estable de US2.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede realizar en paralelo, pues usa archivos distintos y no espera una tarea previa
  de la misma fase.
- **[Story]**: historia que recibe el valor de la tarea (`US1`, `US2` o `US3`).
- Cada tarea nombra las rutas exactas que debe crear o modificar.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Preparar el monorepo, dependencias y entorno local repetible.

- [X] T001 Configurar el paquete workspace compartido en `pnpm-workspace.yaml`, `packages/contracts/package.json`, `packages/contracts/tsconfig.json` y `packages/contracts/src/index.ts`.
- [X] T002 [P] Añadir TypeORM, `pg`, validación, configuración, throttling y utilidades CLI a `api/package.json` y actualizar `pnpm-lock.yaml`.
- [X] T003 [P] Definir PostgreSQL 16, volumen persistente, healthcheck y servicio API en `compose.yaml`, `api/Dockerfile`, `.env.example` y `.dockerignore`.
- [X] T004 [P] Añadir comandos raíz `local:up`, `local:down`, `db:migrate`, `data:generate`, `data:load`, `data:seed`, `lint`, `test` y `test:e2e` en `package.json`.

**Checkpoint**: El workspace resuelve `api`, `web` y `@kuri/contracts`; Docker puede construir el
entorno sin secretos reales.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Construir límites compartidos que bloquean todas las historias de la feature.

**⚠️ CRITICAL**: No iniciar trabajo de historia hasta completar esta fase.

- [X] T005 Definir enums, DTOs de transporte, tipos de respuesta y códigos de error compartidos en `packages/contracts/src/order-events.ts` y reexportarlos desde `packages/contracts/src/index.ts`.
- [X] T006 [P] Implementar carga y validación tipada de ambiente y la configuración de PostgreSQL con `synchronize: false` en `api/src/infrastructure/config/environment.ts`, `api/src/infrastructure/database/typeorm/data-source.ts` y `api/src/infrastructure/database/typeorm/typeorm-options.ts`.
- [X] T007 [P] Preparar la infraestructura de pruebas PostgreSQL aislada en `api/test/support/postgres-test-environment.ts`, `api/test/support/database-reset.ts` y `api/test/jest-integration.json`.
- [X] T008 Configurar la aplicación Nest con configuración, TypeORM, límite de cuerpo de 256 KiB, `ValidationPipe` estricto, trazas y filtro de errores seguro en `api/src/main.ts`, `api/src/app.module.ts`, `api/src/infrastructure/http/filters/http-error.filter.ts` y `api/src/infrastructure/http/filters/trace-id.middleware.ts`.
- [X] T009 Implementar autorización por `X-Kuri-Role`, throttling por ruta y endpoint de salud de base de datos en `api/src/infrastructure/http/guards/simulated-role.guard.ts`, `api/src/infrastructure/http/guards/throttle.config.ts`, `api/src/infrastructure/http/controllers/health.controller.ts` y `api/src/infrastructure/http/http.module.ts`.
- [X] T010 Configurar scripts de ejecución de migraciones con `synchronize: false` en `api/package.json` y `api/src/infrastructure/database/typeorm/typeorm-options.ts`.

**Checkpoint**: La API arranca con PostgreSQL, aplica solo migraciones, rechaza entradas no
autorizadas o no válidas y expone `GET /health`.

---

## Phase 3: User Story 1 - Registrar un pedido creado (Priority: P1) 🎯 MVP

**Goal**: Persistir un `ORDER_CREATED` válido como pedido durable, con sus ítems y evento
inmutable, y rechazar entradas parciales sin dejar registros inconsistentes.

**Independent Test**: Con una referencia de restaurante preparada en PostgreSQL, ingresar un evento
de creación válido, reiniciar la aplicación y verificar mediante repositorio que existe un pedido
con todos sus campos e historial de exactamente un evento.

### Critical evidence for User Story 1

- [X] T011 [P] [US1] Escribir pruebas unitarias de la conversión decimal-a-centavos y la igualdad entre total e ítems en `api/src/domain/orders/value-objects/money.spec.ts`.
- [X] T012 [P] [US1] Escribir la prueba de contrato del flujo crítico `ORDER_CREATED`, incluyendo cuerpo inválido y respuesta `201`, en `api/test/contract/order-events.contract-spec.ts`.
- [X] T013 [P] [US1] Escribir la prueba de integración del flujo crítico de persistencia, ítems y reinicio en `api/test/integration/order-created.persistence-spec.ts`.

### Implementation for User Story 1

- [X] T014 [US1] Crear entidades y value objects puros de pedido, ítem, evento de creación, ciudad, clima y errores de dominio en `api/src/domain/orders/entities/order.ts`, `api/src/domain/orders/entities/order-item.ts`, `api/src/domain/orders/entities/order-event.ts`, `api/src/domain/orders/value-objects/money.ts` y `api/src/domain/orders/errors/order-domain.error.ts`.
- [X] T015 [US1] Definir los puertos de repositorio y unidad transaccional para pedidos, eventos, restaurantes, couriers y consultas en `api/src/application/orders/ports/order-repository.port.ts`, `api/src/application/orders/ports/order-event-repository.port.ts`, `api/src/application/orders/ports/reference-data-repository.port.ts` y `api/src/application/orders/ports/order-transaction.port.ts`.
- [X] T016 [US1] Mapear entidades TypeORM de `orders`, `order_items`, `order_events`, `restaurants`, `couriers`, `ingestion_attempts` y `load_runs` en `api/src/infrastructure/database/typeorm/entities/`.
- [X] T017 [US1] Completar el esquema inicial, claves, índices, checks y enums únicamente mediante `api/src/infrastructure/database/typeorm/migrations/1730000000000-initialize-order-ingestion.ts`.
- [X] T018 [US1] Implementar mapeadores y repositorios TypeORM de creación y lectura de pedido en `api/src/infrastructure/database/typeorm/repositories/typeorm-order.repository.ts`, `api/src/infrastructure/database/typeorm/repositories/typeorm-order-event.repository.ts` y `api/src/infrastructure/database/typeorm/repositories/typeorm-reference-data.repository.ts`.
- [X] T019 [US1] Implementar el caso de uso atómico de creación, incluida conversión temprana a centavos y rollback completo, en `api/src/application/orders/use-cases/ingest-order-event.use-case.ts` y `api/src/application/orders/dto/ingest-order-event.command.ts`.
- [X] T020 [US1] Exponer `POST /api/v1/order-events` para `ORDER_CREATED` con DTO estricto, rol `SYSTEM` y mapeo de errores en `api/src/infrastructure/http/dto/order-event.dto.ts`, `api/src/infrastructure/http/controllers/order-events.controller.ts` y `api/src/infrastructure/http/orders-http.module.ts`.
- [X] T021 [US1] Conectar el módulo de órdenes al contenedor Nest y eliminar el endpoint de plantilla en `api/src/application/orders/orders.module.ts`, `api/src/app.module.ts`, `api/src/app.controller.ts` y `api/src/app.service.ts`.
- [X] T022 [US1] Hacer pasar la evidencia crítica de dinero, creación, persistencia y reinicio en `api/src/domain/orders/value-objects/money.spec.ts`, `api/test/contract/order-events.contract-spec.ts` y `api/test/integration/order-created.persistence-spec.ts`.

**Checkpoint**: Un `ORDER_CREATED` válido crea exactamente un pedido y su evento; errores no dejan
filas parciales y el dato sobrevive al reinicio.

---

## Phase 4: User Story 2 - Mantener una proyección temporal correcta (Priority: P1)

**Goal**: Reducir el historial por `occurred_at`, manejar duplicados y conflictos, mantener eventos
pendientes y actualizar una única proyección correcta bajo concurrencia.

**Independent Test**: Enviar la misma secuencia canónica, desordenada y con duplicados para un
pedido; las tres ejecuciones deben dejar el mismo estado y un único evento por `event_id`.

### Critical evidence for User Story 2

- [X] T023 [P] [US2] Escribir pruebas unitarias de la reducción crítica: grafo completo, cancelación, pendientes, terminales y empate conflictivo en `api/src/domain/orders/services/order-timeline-reducer.spec.ts`.
- [X] T024 [P] [US2] Escribir pruebas unitarias de identidad crítica: canonicalización SHA-256 y reutilización mutada de `event_id` en `api/src/application/orders/services/event-identity.service.spec.ts`.
- [X] T025 [P] [US2] Escribir pruebas de integración para duplicados, conflictos, advisory locks y eventos concurrentes del mismo pedido en `api/test/integration/order-event-concurrency.spec.ts`.
- [X] T026 [P] [US2] Escribir la prueba end-to-end del flujo crítico de proyección desordenada, roles, `429`, terminales y conflicto en `api/test/e2e/order-event-projection.e2e-spec.ts`.

### Implementation for User Story 2

- [X] T027 [US2] Implementar reducción pura de la línea de tiempo, outcomes y transiciones permitidas en `api/src/domain/orders/services/order-timeline-reducer.ts` y `api/src/domain/orders/errors/order-transition.error.ts`.
- [X] T028 [US2] Implementar canonicalización segura y hashing SHA-256 de eventos en `api/src/application/orders/services/event-identity.service.ts`.
- [X] T029 [US2] Implementar la unidad de trabajo TypeORM con advisory lock transaccional derivado de `order_id` y actualizaciones de outcome en `api/src/infrastructure/database/typeorm/typeorm-order-transaction.ts` y `api/src/infrastructure/database/typeorm/repositories/typeorm-order-event.repository.ts`.
- [X] T030 [US2] Extender `IngestOrderEvent` para deduplicar, registrar intentos, reproducir el historial, conservar pendientes y reemplazar la proyección en `api/src/application/orders/use-cases/ingest-order-event.use-case.ts` y `api/src/application/orders/dto/ingestion-result.dto.ts`.
- [X] T031 [US2] Validar y mapear `ORDER_STATUS_CHANGED`, respuestas `200`/`409`/`422` y códigos estables sin filtrar datos sensibles en `api/src/infrastructure/http/dto/order-event.dto.ts`, `api/src/infrastructure/http/controllers/order-events.controller.ts` y `api/src/infrastructure/http/filters/http-error.filter.ts`.
- [X] T032 [US2] Hacer pasar las pruebas de reducción, identidad, concurrencia y proyección HTTP en `api/src/domain/orders/services/order-timeline-reducer.spec.ts`, `api/test/integration/order-event-concurrency.spec.ts` y `api/test/e2e/order-event-projection.e2e-spec.ts`.

**Checkpoint**: Duplicados exactos no cambian nada, conflictos quedan auditados, el desorden no
sobrescribe la verdad temporal y los terminales no se reabren.

---

## Phase 5: User Story 3 - Auditar y preparar datos operativos (Priority: P2)

**Goal**: Exponer una línea de tiempo segura y cargar un dataset sintético o suministrado de forma
determinista, repetible y auditable.

**Independent Test**: Sobre una base vacía, ejecutar `pnpm data:seed -- --seed 20260915 --orders 1500`,
consultar un pedido por HTTP y repetir la carga sin aumentar pedidos, eventos ni versión de la
proyección.

### Critical evidence for User Story 3

- [X] T033 [P] [US3] Escribir pruebas unitarias del generador determinista de alto impacto: semilla, ratios, cobertura y totales en `api/src/infrastructure/cli/dataset-generator.spec.ts`.
- [X] T034 [P] [US3] Escribir pruebas de integración del flujo de carga: upsert de referencias, streaming JSONL, `LoadRun`, reintento y códigos de salida en `api/test/integration/dataset-loader.spec.ts`.
- [X] T035 [P] [US3] Escribir pruebas de contrato de la consulta crítica `GET /api/v1/orders/{orderId}` para orden temporal, roles, `404` y ausencia de PII en `api/test/contract/orders.contract-spec.ts`.
- [X] T036 [P] [US3] Escribir la prueba end-to-end del flujo crítico generación, carga, repetición y consulta segura en `api/test/e2e/dataset-load-and-order-query.e2e-spec.ts`.

### Implementation for User Story 3

- [X] T037 [US3] Implementar el generador sintético determinista con semilla, ratios, IDs estables y escritura de los tres formatos acordados en `api/src/infrastructure/cli/dataset-generator.ts` y `api/src/infrastructure/cli/dataset-generator.command.ts`.
- [X] T038 [US3] Implementar la carga de restaurantes y couriers con upsert determinista, sin exponer PII en diagnósticos, en `api/src/application/orders/use-cases/load-reference-data.use-case.ts` y `api/src/infrastructure/database/typeorm/repositories/typeorm-reference-data.repository.ts`.
- [X] T039 [US3] Implementar el loader JSONL en streaming, huella de fuentes, `LoadRun`, resumen JSON y códigos de salida en `api/src/application/orders/use-cases/load-order-dataset.use-case.ts` y `api/src/infrastructure/cli/dataset-loader.command.ts`.
- [X] T040 [US3] Registrar comandos de Nest/Node para generar, cargar y componer `data:seed` en `api/src/infrastructure/cli/cli.module.ts`, `api/src/infrastructure/cli/main.ts`, `api/package.json` y `package.json`.
- [X] T041 [US3] Implementar la consulta de pedido y timeline ordenado, con DTO de respuesta que solo incluye `courier_id`, en `api/src/application/orders/use-cases/get-order-details.use-case.ts`, `api/src/infrastructure/http/controllers/orders.controller.ts`, `api/src/infrastructure/http/dto/order-details.response.dto.ts` y `api/src/infrastructure/http/orders-http.module.ts`.
- [X] T042 [US3] Hacer pasar las pruebas de generador, loader, carga repetida y consulta segura en `api/src/infrastructure/cli/dataset-generator.spec.ts`, `api/test/integration/dataset-loader.spec.ts`, `api/test/contract/orders.contract-spec.ts` y `api/test/e2e/dataset-load-and-order-query.e2e-spec.ts`.

**Checkpoint**: Un único comando deja datos reproducibles y auditables; la repetición es idempotente
y la consulta expone la línea temporal sin datos personales.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Consolidar seguridad, calidad, rendimiento, documentación y reproducibilidad del flujo.

- [X] T043 [P] Verificar en el flujo E2E de consulta crítica que respuestas, logs, errores y resúmenes CLI no serializan PII de courier o restaurante en `api/test/e2e/privacy-boundary.e2e-spec.ts` y `api/src/infrastructure/http/filters/http-error.filter.ts`.
- [X] T044 [P] Añadir límites de profundidad, tamaño de colección, longitud y protección contra prototipos en `api/src/infrastructure/http/dto/order-event.dto.ts` y `api/src/main.ts`.
- [X] T045 Medir la ingesta de aproximadamente 1,500 pedidos, comprobar p95 local menor a 250 ms y carga menor a 60 s en `api/test/performance/order-ingestion.performance-spec.ts`.
- [X] T046 Actualizar las instrucciones reales de inicio, migración, carga, validación y límites conocidos en `README.md`, `api/README.md` y `specs/001-order-event-ingestion/quickstart.md`.
- [X] T047 Ejecutar y corregir las pruebas críticas definidas, integración, E2E, lint, build y la guía rápida en `package.json`, `api/package.json` y `specs/001-order-event-ingestion/quickstart.md`.

**Checkpoint**: La entrega cumple contratos, privacidad, rendimiento y los pasos locales documentados.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 — Setup**: no tiene dependencias.
- **Phase 2 — Foundational**: depende de T001–T004 y bloquea las historias.
- **US1**: depende de T005–T010; constituye el MVP durable.
- **US2**: depende de US1, porque reduce eventos sobre pedidos ya persistidos.
- **US3**: depende de US2, porque carga datos a través del mismo caso de uso y consulta su
  proyección final.
- **Polish**: depende de US1–US3.

### User Story Dependencies

```text
Setup -> Foundational -> US1 (creation) -> US2 (temporal projection) -> US3 (load and audit) -> Polish
```

### Parallel Opportunities

- En Setup, T002, T003 y T004 pueden avanzar en paralelo tras T001.
- En Foundational, T006 y T007 pueden avanzar en paralelo; T008–T010 integran esos resultados.
- En US1, T011–T013 se escriben en paralelo antes de T014–T021.
- En US2, T023–T026 se escriben en paralelo antes de T027–T031.
- En US3, T033–T036 se escriben en paralelo antes de T037–T041.
- En Polish, T043 y T044 pueden avanzar en paralelo antes de T045–T047.

## Parallel Example: User Story 2

```text
Task: "Escribir transiciones y pendientes en api/src/domain/orders/services/order-timeline-reducer.spec.ts"
Task: "Escribir identidad de evento en api/src/application/orders/services/event-identity.service.spec.ts"
Task: "Escribir concurrencia PostgreSQL en api/test/integration/order-event-concurrency.spec.ts"
Task: "Escribir flujo HTTP en api/test/e2e/order-event-projection.e2e-spec.ts"
```

## Implementation Strategy

### MVP First

1. Completar Setup y Foundational.
2. Completar US1 hasta T022.
3. Detenerse para validar creación, rollback y persistencia tras reinicio.

### Incremental Delivery

1. US1 entrega el ledger y pedido durable.
2. US2 convierte ese ledger en una proyección confiable bajo duplicados, desorden y concurrencia.
3. US3 hace el sistema demostrable: carga reproducible y consulta auditable.
4. Polish aporta evidencia objetiva de seguridad, rendimiento y reproducibilidad.

## Notes

- Los unit tests se reservan para decisiones críticas; DTOs, mapeadores, wiring y delegación de
  framework se validan únicamente en el límite que corresponda, sin crear pruebas aisladas.
- Todos los cambios de esquema pasan por la migración versionada; TypeORM nunca usa `synchronize`.
- Los montos se convierten a centavos enteros en el límite HTTP/CLI y no usan punto flotante en el
  dominio ni persistencia de negocio.
- La CLI entra por el caso de uso de aplicación, no por inserciones SQL directas ni por HTTP.
- No se implementan filtros, riesgo, soporte, reglas R1–R7, aprobaciones, LLM ni frontend en esta
  feature.
