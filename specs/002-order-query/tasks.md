---

description: "Tareas ejecutables para la consulta, listado y detalle de pedidos"
---

# Tasks: Order Query and Listing

**Input**: Design documents from `specs/002-order-query/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [OpenAPI](./contracts/openapi.yaml) y [quickstart](./quickstart.md)

**Tests**: Se incluyen únicamente pruebas de contratos, integración, E2E y unitarias que protegen
decisiones críticas o flujos operativos. No se crean pruebas aisladas para DTOs triviales, mapeadores
sin reglas o wiring de framework.

**Organization**: Las fases siguen las tres historias de usuario de la especificación. US1 entrega
detalle seguro, US2 agrega filtros y US3 completa paginación; todas preservan la lectura de US1.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: puede ejecutarse en paralelo porque usa archivos distintos y no espera otra tarea pendiente.
- **[Story]**: historia que recibe el valor de la tarea (`US1`, `US2` o `US3`).
- Cada tarea incluye las rutas exactas que debe crear o modificar.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Preparar dependencias, contratos y soporte compartido para la superficie de lectura.

- [X] T001 Añadir `@nestjs/swagger` a `api/package.json` y actualizar `pnpm-lock.yaml`.
- [X] T002 [P] Actualizar los contratos tipados de lectura en `packages/contracts/src/order-queries.ts` y `packages/contracts/src/index.ts` con vistas resumida, detalle, timeline, paginación y errores.
- [X] T003 [P] Extender el contrato OpenAPI de US2 en `specs/002-order-query/contracts/openapi.yaml` para reflejar los tipos compartidos, filtros, roles y respuestas seguras.
- [X] T004 [P] Preparar fixtures reutilizables de pedidos, referencias, estados, timestamps y PII en `api/test/support/test-app.ts` y `api/test/support/order-query-fixtures.ts`.

**Checkpoint**: Dependencias, contratos y fixtures están disponibles sin cambiar `web/`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Crear límites comunes de lectura, documentación y validación que bloquean las historias.

**⚠️ CRITICAL**: No iniciar las historias hasta completar esta fase.

- [X] T005 Implementar el puerto de consultas de pedidos en `api/src/application/orders/ports/order-query-repository.port.ts`, incluyendo detalle coherente y listado filtrado.
- [X] T006 [P] Implementar la política pura de retraso con instante de evaluación explícito en `api/src/application/orders/services/delayed-order.policy.ts`.
- [X] T007 [P] Configurar Swagger local en `api/src/infrastructure/http/swagger.ts` y conectarlo desde `api/src/main.ts` en la ruta `/docs`, sin habilitar una superficie productiva adicional.
- [X] T008 [P] Crear DTOs públicos independientes para detalle y listado en `api/src/infrastructure/http/dto/order-details.response.dto.ts` y `api/src/infrastructure/http/dto/order-list.response.dto.ts`, excluyendo columnas privadas de entidades TypeORM.
- [X] T009 [P] Añadir índices de lectura requeridos mediante una migración versionada en `api/src/infrastructure/database/typeorm/migrations/1740000000000-add-order-query-indexes.ts`, sin activar `synchronize`.
- [X] T010 [P] Definir errores de consulta, validación, autorización, no encontrado y rate limit en `packages/contracts/src/order-queries.ts` y `api/src/infrastructure/http/filters/http-error.filter.ts`.

**Checkpoint**: El límite de lectura, documentación, contratos, privacidad y soporte de consulta están listos.

---

## Phase 3: User Story 1 - Consultar detalle operativo (Priority: P1) 🎯 MVP

**Goal**: Devolver un pedido completo, su información operativa segura y timeline ordenado sin mutar US1.

**Independent Test**: Con un pedido existente y eventos fuera de orden, `GET /api/v1/orders/{orderId}` devuelve detalle coherente, timeline por `occurred_at`, `404` para desconocidos, `403` para roles no autorizados y cero PII.

### Tests for User Story 1

> Escribir primero y comprobar que fallan por la razón esperada antes de implementar.

- [X] T011 [P] [US1] Escribir pruebas de contrato para detalle, `404`, rol no autorizado, campos obligatorios y exclusión de PII en `api/test/contract/orders.contract-spec.ts`.
- [X] T012 [P] [US1] Escribir prueba de integración de lectura coherente de pedido, ítems, restaurante y eventos en `api/test/integration/order-query.integration-spec.ts`.
- [X] T013 [P] [US1] Escribir prueba E2E de detalle con eventos fuera de orden, timeline ascendente, courier nulo y respuesta segura en `api/test/e2e/order-query.e2e-spec.ts`.

### Implementation for User Story 1

- [X] T014 [US1] Implementar el adaptador TypeORM de detalle con una unidad de lectura coherente y joins limitados a datos comerciales en `api/src/infrastructure/database/typeorm/repositories/typeorm-order-query.repository.ts`.
- [X] T015 [US1] Extender el caso de uso de detalle para mapear restaurante, courier operativo, items y timeline sin serializar entidades internas en `api/src/application/orders/use-cases/get-order-details.use-case.ts`.
- [X] T016 [US1] Completar los DTOs de respuesta de detalle y anotaciones Swagger en `api/src/infrastructure/http/dto/order-details.response.dto.ts`.
- [X] T017 [US1] Exponer y documentar `GET /api/v1/orders/{orderId}` con roles `OPS`/`SYSTEM` en `api/src/infrastructure/http/controllers/orders.controller.ts` y `api/src/infrastructure/http/http.module.ts`.
- [X] T018 [US1] Hacer pasar las pruebas de detalle, autorización, `404`, coherencia temporal y privacidad en `api/test/contract/orders.contract-spec.ts`, `api/test/integration/order-query.integration-spec.ts` y `api/test/e2e/order-query.e2e-spec.ts`.

**Checkpoint**: La consulta individual entrega el detalle completo y seguro, preserva US1 y está documentada en Swagger.

---

## Phase 4: User Story 2 - Listar pedidos con filtros (Priority: P1)

**Goal**: Listar vistas resumidas aplicando ciudad, estado y retraso como filtros combinables.

**Independent Test**: Con pedidos de las tres ciudades y distintos estados/promesas, cada filtro y su combinación devuelve únicamente resultados que cumplen todas las condiciones.

### Tests for User Story 2

- [X] T019 [P] [US2] Ampliar las pruebas de contrato para listado resumido, filtros válidos/ inválidos, `delayed=true`, `delayed=false` y ausencia del parámetro en `api/test/contract/orders.contract-spec.ts`.
- [X] T020 [P] [US2] Añadir pruebas unitarias de límites de retraso (`now == promised_at`, `now > promised_at`, `DELIVERED`) en `api/src/application/orders/services/delayed-order.policy.spec.ts`.
- [X] T021 [P] [US2] Añadir pruebas de integración para filtros individuales y combinados, referencias seguras y no mutación de proyección en `api/test/integration/order-query.integration-spec.ts`.
- [X] T022 [P] [US2] Añadir escenarios E2E de listado, filtros, permisos, errores y ausencia de PII en `api/test/e2e/order-query.e2e-spec.ts`.

### Implementation for User Story 2

- [X] T023 [US2] Implementar validación estricta de query parameters y defaults de filtro en `api/src/infrastructure/http/dto/order-list.query.dto.ts`.
- [X] T024 [US2] Implementar la política pura de retraso y sus límites conforme a `promised_at` y estado proyectado en `api/src/application/orders/services/delayed-order.policy.ts`.
- [X] T025 [US2] Implementar la consulta TypeORM de listado con joins seguros, filtros AND, evaluación temporal y orden estable en `api/src/infrastructure/database/typeorm/repositories/typeorm-order-query.repository.ts`.
- [X] T026 [US2] Implementar el caso de uso de listado y el mapeo a la vista resumida en `api/src/application/orders/use-cases/list-orders.use-case.ts`.
- [X] T027 [US2] Exponer `GET /api/v1/orders` con validación, roles, rate limit, respuestas y anotaciones Swagger en `api/src/infrastructure/http/controllers/orders.controller.ts` y `api/src/infrastructure/http/dto/order-list.response.dto.ts`.
- [X] T028 [US2] Hacer pasar los contratos, integración y E2E de filtros, retraso, privacidad y no mutación en `api/test/contract/orders.contract-spec.ts`, `api/test/integration/order-query.integration-spec.ts` y `api/test/e2e/order-query.e2e-spec.ts`.

**Checkpoint**: El listado resumido filtra correctamente por ciudad, estado y retraso sin exponer datos privados.

---

## Phase 5: User Story 3 - Recorrer páginas de resultados (Priority: P1)

**Goal**: Entregar páginas acotadas, estables y consistentes sobre el listado filtrado.

**Independent Test**: Con más de 100 pedidos, consultar páginas consecutivas y límites válidos, verificando metadatos, ausencia de duplicados, página vacía y rechazo de límites inválidos.

### Tests for User Story 3

- [X] T029 [P] [US3] Añadir pruebas de contrato para defaults, `page`, `limit`, `total`, `totalPages`, máximo 100 y errores de paginación en `api/test/contract/orders.contract-spec.ts`.
- [X] T030 [P] [US3] Añadir pruebas de integración de páginas consecutivas, conjunto vacío, orden `created_at DESC`/`order_id ASC` y conteo consistente en `api/test/integration/order-query.integration-spec.ts`.
- [X] T031 [P] [US3] Añadir prueba E2E de paginación combinada con filtros y respuesta resumida sin timeline en `api/test/e2e/order-query.e2e-spec.ts`.

### Implementation for User Story 3

- [X] T032 [US3] Implementar cálculo de offset, límites, `total` y `totalPages` en `api/src/application/orders/use-cases/list-orders.use-case.ts` sin aceptar valores fuera de 1..100.
- [X] T033 [US3] Añadir orden e índices de paginación y revisar el plan de consulta en `api/src/infrastructure/database/typeorm/repositories/typeorm-order-query.repository.ts` y `api/src/infrastructure/database/typeorm/migrations/1740000000000-add-order-query-indexes.ts`.
- [X] T034 [US3] Completar el contrato tipado y las anotaciones Swagger de `pagination` en `packages/contracts/src/order-queries.ts` y `api/src/infrastructure/http/dto/order-list.response.dto.ts`.
- [X] T035 [US3] Hacer pasar las pruebas de paginación, orden estable, páginas vacías y filtros combinados en `api/test/contract/orders.contract-spec.ts`, `api/test/integration/order-query.integration-spec.ts` y `api/test/e2e/order-query.e2e-spec.ts`.

**Checkpoint**: El listado es navegable por páginas y no pierde consistencia entre consultas repetidas.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validar rendimiento, privacidad, documentación y reproducibilidad de la feature completa.

- [X] T036 [P] Verificar mediante pruebas E2E que detalle, listado, errores, logs y Swagger no serializan `phone`, `document_id`, nombres privados ni contactos en `api/test/e2e/order-query.e2e-spec.ts` y `api/src/infrastructure/http/filters/http-error.filter.ts`.
- [X] T037 [P] Añadir límites de longitud, valores desconocidos, query string malformado y protección contra serialización accidental de entidades en `api/src/infrastructure/http/dto/order-list.query.dto.ts`, `api/src/infrastructure/http/dto/order-details.response.dto.ts` y `api/src/infrastructure/http/dto/order-list.response.dto.ts`.
- [X] T038 Medir p95 de detalle y listado bajo 250 ms con 1,500 pedidos y combinaciones de filtros en `api/test/performance/order-query.performance-spec.ts`.
- [X] T039 [P] Actualizar la guía local, ruta Swagger, comandos de validación y límites conocidos en `README.md`, `api/README.md` y `specs/002-order-query/quickstart.md`.
- [X] T040 Ejecutar y corregir `lint`, `build`, pruebas unitarias críticas, integración, E2E, rendimiento, migraciones y validación del contrato en `package.json`, `api/package.json`, `specs/002-order-query/contracts/openapi.yaml` y `specs/002-order-query/quickstart.md`.

**Checkpoint**: US2 cumple contratos, privacidad, rendimiento y validación local documentada.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 — Setup**: no tiene dependencias.
- **Phase 2 — Foundational**: depende de Setup y bloquea todas las historias.
- **US1 — Detail**: depende de Foundational y entrega el MVP de lectura individual.
- **US2 — Filters**: depende de Foundational y del repositorio/contratos preparados para US1; añade el listado filtrado.
- **US3 — Pagination**: depende de US2 porque pagina la colección filtrada.
- **Polish**: depende de US1–US3.

### User Story Dependencies

```text
Setup -> Foundational -> US1 (detail) -> US2 (filters) -> US3 (pagination) -> Polish
```

### Parallel Opportunities

- T002, T003 y T004 pueden ejecutarse en paralelo tras T001.
- T006, T007, T008, T009 y T010 pueden ejecutarse en paralelo después de T005 cuando no compartan archivos.
- T011, T012 y T013 pueden escribirse en paralelo antes de T014–T017.
- T019, T020, T021 y T022 pueden escribirse en paralelo antes de T023–T027.
- T029, T030 y T031 pueden escribirse en paralelo antes de T032–T034.
- T036, T037 y T039 pueden ejecutarse en paralelo antes de T038 y T040.

## Parallel Example: User Story 1

```text
Task: "Contract test for order detail in api/test/contract/orders.contract-spec.ts"
Task: "Integration test for coherent order read in api/test/integration/order-query.integration-spec.ts"
Task: "E2E test for safe temporal detail in api/test/e2e/order-query.e2e-spec.ts"
```

## Implementation Strategy

### MVP First

1. Completar Setup y Foundational.
2. Completar US1: consulta individual, detalle seguro y timeline.
3. Detenerse para validar `200`, `404`, `403`, privacidad y consistencia temporal.

### Incremental Delivery

1. US1 entrega el detalle operacional confiable.
2. US2 agrega listado resumido y filtros combinables.
3. US3 agrega paginación estable y límites.
4. Polish aporta Swagger, rendimiento, seguridad y quickstart verificable.

### Scope Guard

Esta feature no modifica `web/` ni implementa riesgo, LLM, soporte, reglas R1–R7, aprobaciones,
acciones de pedido o autenticación real.

## Notes

- Los tests se reservan para decisiones críticas y flujos de usuario; no se crean unit tests para
  getters, DTOs triviales, mapeadores mecánicos o wiring sin lógica.
- El detalle y el listado usan DTOs explícitos; nunca se retorna una entidad TypeORM directamente.
- Todas las consultas son de solo lectura y no alteran proyección, eventos, outcomes ni timestamps.
- Swagger debe derivarse de los DTOs públicos y mantenerse alineado con `contracts/openapi.yaml`.
- Cada tarea debe recibir validación proporcional y un commit semántico en inglés con emoji.
