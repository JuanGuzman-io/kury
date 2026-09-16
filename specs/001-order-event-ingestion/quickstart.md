# Inicio rápido y evidencia de aceptación

Esta guía describe el contrato local esperado al completar US1. Los comandos todavía son trabajo de
implementación; este documento fija cómo deben comportarse y cómo se verificará la entrega.

## Requisitos

- Node.js 22 LTS
- pnpm 11
- Docker Engine con Docker Compose
- puertos locales `3001` y `5432` disponibles

## Levantar el entorno

Desde la raíz del monorepo:

```bash
cp .env.example .env
pnpm install
pnpm local:up
```

`pnpm local:up` debe iniciar PostgreSQL 16, esperar su salud, ejecutar las migraciones versionadas e
iniciar la API. No debe requerir credenciales externas ni servicios de nube.

Comprobar disponibilidad:

```bash
curl --fail http://localhost:3001/health
```

Respuesta esperada:

```json
{"status":"ok","database":"up"}
```

## Generar y cargar el dataset

```bash
pnpm data:seed -- --seed 20260915 --orders 1500
```

La ejecución debe terminar en menos de 60 segundos en un equipo local de desarrollo razonable,
mostrar conteos de resultados y dejar pedidos de las tres ciudades, los tres climas, estados
terminales y estados activos. Repetir el comando con la misma semilla debe reportar los eventos
como duplicados sin cambiar las proyecciones.

## Probar creación e idempotencia

Guardar un evento nuevo:

```bash
curl --fail-with-body \
  -H 'Content-Type: application/json' \
  -H 'X-Kuri-Role: SYSTEM' \
  -d '{
    "event_id":"evt_demo_created",
    "order_id":"ord_demo",
    "type":"ORDER_CREATED",
    "occurred_at":"2026-09-15T15:00:00Z",
    "received_at":"2026-09-15T15:00:02Z",
    "payload":{
      "user_id":"usr_demo",
      "city":"BOG",
      "restaurant_id":"rst_bog_0001",
      "actor":"USER",
      "items":[{"sku":"sku_ajiaco","name":"Ajiaco","quantity":1,"unit_price":12.50}],
      "total_amount":12.50,
      "promised_at":"2026-09-15T15:45:00Z",
      "weather":"RAIN"
    }
  }' \
  http://localhost:3001/api/v1/order-events
```

La primera llamada devuelve HTTP `201` y `outcome: APPLIED`. Repetirla sin modificar el cuerpo
devuelve HTTP `200` y `outcome: DUPLICATE`; no crea otra fila ni incrementa
`projection_version`. Cambiar el cuerpo conservando `event_id` devuelve HTTP `409` con
`code: EVENT_ID_CONFLICT`.

## Probar eventos fuera de orden

Enviar primero `COURIER_ASSIGNED` a las 15:15 y después `ACCEPTED` a las 15:10:

```bash
curl --fail-with-body \
  -H 'Content-Type: application/json' \
  -H 'X-Kuri-Role: SYSTEM' \
  -d '{
    "event_id":"evt_demo_assigned",
    "order_id":"ord_demo",
    "type":"ORDER_STATUS_CHANGED",
    "occurred_at":"2026-09-15T15:15:00Z",
    "received_at":"2026-09-15T15:20:00Z",
    "payload":{"status":"COURIER_ASSIGNED","actor":"SYSTEM","courier_id":"crr_bog_0001"}
  }' \
  http://localhost:3001/api/v1/order-events

curl --fail-with-body \
  -H 'Content-Type: application/json' \
  -H 'X-Kuri-Role: SYSTEM' \
  -d '{
    "event_id":"evt_demo_accepted",
    "order_id":"ord_demo",
    "type":"ORDER_STATUS_CHANGED",
    "occurred_at":"2026-09-15T15:10:00Z",
    "received_at":"2026-09-15T15:21:00Z",
    "payload":{"status":"ACCEPTED","actor":"RESTAURANT"}
  }' \
  http://localhost:3001/api/v1/order-events
```

El primer cambio queda `PENDING` porque falta `ACCEPTED`. Al ingresar el predecesor, la reducción
completa promueve ambos y la proyección final queda en `COURIER_ASSIGNED`, determinada por
`occurred_at`, no por el orden de recepción.

Consultar la proyección y su historia segura:

```bash
curl --fail-with-body \
  -H 'X-Kuri-Role: OPS' \
  http://localhost:3001/api/v1/orders/ord_demo
```

La línea de tiempo incluye los tres eventos ordenados por tiempo fuente. La respuesta puede exponer
`courier_id`, pero nunca nombre, teléfono o documento del courier.

## Verificar persistencia y protección

```bash
docker compose restart api
curl --fail-with-body \
  -H 'X-Kuri-Role: OPS' \
  http://localhost:3001/api/v1/orders/ord_demo
```

El pedido y su historia deben conservarse tras el reinicio. Además:

- omitir `X-Kuri-Role` o usar `OPS` para ingesta devuelve HTTP `403`;
- agregar campos desconocidos o enviar montos con más de dos decimales devuelve HTTP `400` o `422`;
- superar el límite configurado devuelve HTTP `429` y `Retry-After`;
- reutilizar una marca temporal para transiciones incompatibles conserva el primer hecho confiable
  y devuelve conflicto para el posterior;
- un evento posterior a `DELIVERED` o `CANCELLED` queda rechazado y nunca reabre el pedido.

## Ejecutar validaciones de ingeniería

```bash
pnpm lint
pnpm test
pnpm test:e2e
pnpm build
```

La evidencia mínima cubre unitariamente normalización monetaria, el grafo completo de estados,
duplicados, igualdad temporal, eventos pendientes y terminales. Las pruebas de integración validan
restricciones y concurrencia real en PostgreSQL 16; las pruebas end-to-end validan los flujos HTTP,
autorización, límites, reinicio y carga repetida.

## Apagar

```bash
pnpm local:down
```

El comando detiene contenedores sin borrar el volumen de PostgreSQL. La eliminación del volumen debe
ser una acción diferente y explícita para no destruir evidencia por accidente.
