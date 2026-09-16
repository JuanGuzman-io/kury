# API de Kuri Delivery

Backend NestJS para eventos y proyección de pedidos. Las rutas locales son `POST /api/v1/order-events`,
`GET /api/v1/orders/:orderId` y `GET /health`.

Ejecutar desde la raíz del monorepo:

```bash
pnpm db:migrate
pnpm dev:api
```

La API exige `X-Kuri-Role: SYSTEM` para ingesta y `SYSTEM` u `OPS` para consulta. Los importes se
normalizan a centavos enteros y las respuestas no exponen PII de couriers.
