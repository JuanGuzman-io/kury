# Kuri Delivery Operations Copilot

Monorepo pnpm para el Copiloto de Operaciones de Kuri Delivery. Esta primera entrega implementa
ingesta idempotente de eventos de pedido, proyección temporal, consulta segura y carga sintética.

## Inicio local

```bash
cp .env.example .env
pnpm install
pnpm local:up
curl --fail http://localhost:3001/health
```

PostgreSQL 16 y la API quedan disponibles mediante Docker Compose. Las migraciones se ejecutan al
arrancar el servicio y también se pueden ejecutar con `pnpm db:migrate`.

## Dataset y validación

```bash
pnpm data:seed -- --seed 20260915 --orders 1500
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm build
```

Los contratos, escenarios y límites de esta entrega están en
[`specs/001-order-event-ingestion/`](./specs/001-order-event-ingestion/).
