# Quickstart: Conversational Support Assistant

Guía de validación local de US4. Requiere las referencias y pedidos de US1–US3, pero el asistente
determinista no requiere red, proveedor LLM ni credenciales.

## Entorno

```bash
cp .env.example .env
pnpm local:up
pnpm db:migrate
pnpm data:seed -- --seed 20260915 --orders 1500
```

La API queda en `http://localhost:3001`; Swagger local en `/docs` y contrato revisable en
[contracts/openapi.yaml](./contracts/openapi.yaml).

## Consulta de estado

```bash
curl --fail \
  -H 'X-Kuri-Role: OPS' \
  -H 'X-Kuri-User-Id: usr_20981' \
  -H 'Content-Type: application/json' \
  -d '{"order_id":"ord_000123","message":"¿Dónde está mi pedido?"}' \
  http://localhost:3001/api/v1/chat
```

Verificar que la respuesta contiene `conversation_id` y español basado en el estado real. Repetir
con el mismo ID y preguntar cuánto falta; debe conservarse el contexto.

## Ownership y privacidad

Repetir con un `X-Kuri-User-Id` distinto al propietario. Debe devolverse una respuesta controlada,
sin `status`, restaurante, courier ni otros datos, y con `ORDER_NOT_OWNED_BY_USER` en el resultado
interno/shape de error seguro. Solicitar teléfono o documento del courier no debe exponer esos
campos.

## Tools futuras y resiliencia

Enviar solicitudes de cancelación, retraso e incompleto. Deben producir la intención y el resultado
estructurado del stub `NOT_IMPLEMENTED_US5`, sin cambiar el pedido. Enviar prompt injection, tool
name desconocido o una segunda ronda: debe fallar cerrado. Simular timeout/429/5xx debe producir
respuesta controlada sin acción parcial.

## Persistencia y pruebas

```bash
pnpm lint
pnpm build
pnpm test
pnpm test:integration
pnpm test:e2e
```

La evidencia crítica debe cubrir status propio, pedido inexistente/ajeno, continuación, tools stub,
prompt injection, privacidad, proveedor fallido, rate limit y ausencia de duplicados. Unit tests del
orquestador y catálogo deben correr sin PostgreSQL; integración/E2E prueban la migración y HTTP real.

## Evidencia ejecutada en esta implementación

- `pnpm --filter @kuri/contracts build`: OK.
- `pnpm --filter api build`: OK.
- Lint de la superficie US4: OK.
- `pnpm --filter api exec jest --runInBand`: 9 suites y 22 tests OK.
- Las pruebas que requieren PostgreSQL, migración aplicada y HTTP real quedan pendientes hasta
  disponer de Docker/PostgreSQL en el entorno local.
