# Kuri Delivery Operations Copilot

Monorepo pnpm para el Copiloto de Operaciones de Kuri Delivery. La aplicación combina una API NestJS, PostgreSQL 16, un panel Next.js y un asistente de soporte con un proveedor LLM determinístico para ejecución local sin credenciales.

## Entrega

- `DECISIONS.md`: decisiones técnicas y respuestas al business case.
- `AI_USAGE.md`: uso, revisión y corrección de código asistido por IA.
- `specs/`: constitución, especificaciones, planes, tareas y contratos por user story.
- Video de demo: pendiente de grabación.

## Arquitectura

```text
Next.js / web
    │  REST + X-Kuri-Role
    ▼
NestJS / api
    ├── HTTP controllers + DTO validation + Swagger
    ├── Application use cases
    ├── Domain policies, event reducer and risk engine
    ├── Deterministic LLM + allowlisted tools
    └── TypeORM repositories / migrations
             │
             ▼
       PostgreSQL 16

packages/contracts is shared by api and web.
```

El dominio no importa NestJS, TypeORM ni el SDK de un proveedor LLM. El asistente solicita herramientas; las policies del backend deciden si una acción es válida.

## Requisitos

- Node.js 22+
- pnpm 11+
- Docker Desktop

## Ejecución local

```bash
cp .env.example .env
pnpm install
pnpm local:up
```

Comprueba la API:

```bash
curl --fail http://localhost:3001/health
```

Para el panel, en otra terminal:

```bash
pnpm dev:web
```

Abre [http://localhost:3000/orders](http://localhost:3000/orders). El chat de prueba está en [http://localhost:3000/chat](http://localhost:3000/chat).

`pnpm local:up` levanta PostgreSQL y la API. El frontend se ejecuta separado para conservar hot reload durante el desarrollo.

## Dataset

Genera y carga el dataset sintético determinista:

```bash
pnpm data:seed -- --seed 20260915 --orders 1500
```

También puedes ejecutar las etapas por separado:

```bash
pnpm data:generate -- --seed 20260915 --orders 1500
pnpm data:load -- --events api/data/generated/events.jsonl --restaurants api/data/generated/restaurants.json --couriers api/data/generated/couriers.json
```

## Pruebas y calidad

```bash
pnpm lint
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm build
```

Las pruebas priorizan reducción idempotente y temporal de eventos, motor de riesgo, reglas R1-R7, tool calling, ownership, aprobaciones y trazabilidad.

## API y Swagger

La API está versionada bajo `/api/v1` y exige el rol simulado `X-Kuri-Role`.

- `SYSTEM`: ingesta de eventos.
- `OPS`: consulta operacional, chat y aprobaciones.

Endpoints principales:

```text
GET  /health
POST /api/v1/order-events
GET  /api/v1/orders
GET  /api/v1/orders/:orderId
GET  /api/v1/orders/at-risk
POST /api/v1/chat
GET  /api/v1/approvals?status=PENDING
POST /api/v1/approvals/:id/approve
POST /api/v1/approvals/:id/reject
GET  /api/v1/traces/orders/:orderId
GET  /api/v1/traces/conversations/:conversationId
```

La especificación revisada vive en cada carpeta `specs/*/contracts/openapi.yaml`. NestJS expone además la documentación Swagger configurada por el backend.

## Alcance

Implementado:

- ingesta idempotente y tolerante a desorden;
- persistencia y migraciones PostgreSQL;
- consulta, filtros, paginación y timeline;
- riesgo determinístico on-read;
- asistente con proveedor local y tools allowlisted;
- reglas de soporte, idempotencia y aprobaciones;
- trazabilidad de conversaciones, tools y decisiones;
- panel de pedidos, detalle, aprobaciones y chat de prueba;
- CORS local, validación de entrada, rate limiting y respuestas sin PII del courier.

Fuera de alcance:

- despliegue cloud;
- autenticación real;
- cola externa;
- WebSockets/SSE;
- mapa de couriers;
- ML real;
- proveedor LLM remoto por defecto.

## Detener el entorno

```bash
pnpm local:down
```

Consulta las decisiones completas en [`DECISIONS.md`](./DECISIONS.md) y el uso de IA en [`AI_USAGE.md`](./AI_USAGE.md).
