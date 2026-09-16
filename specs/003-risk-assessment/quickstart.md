# Quickstart: Order Risk Assessment

Guía de validación local para US3. Depende de la proyección, eventos y referencias cargadas por
US1/US2; no agrega frontend ni credenciales externas.

## Prerrequisitos y entorno

- Node.js 22, pnpm 11 y Docker Compose.
- Puerto 3001 libre para la API y PostgreSQL disponible mediante Docker.

Desde la raíz del monorepo:

```bash
cp .env.example .env
pnpm local:up
pnpm db:migrate
pnpm data:seed -- --seed 20260915 --orders 1500
```

La API queda en `http://localhost:3001`; Swagger local en `http://localhost:3001/docs` y el
contrato revisable en [contracts/openapi.yaml](./contracts/openapi.yaml).

## Detalle con riesgo

```bash
curl --fail -H 'X-Kuri-Role: OPS' \
  http://localhost:3001/api/v1/orders/ord_20260915_000001
```

Verificar `risk.level`, `risk.score` y `risk.reasons`. Las razones deben estar en español, ser
deterministas para el mismo instante y no incluir PII ni configuración interna.

## Listado activo priorizado

```bash
curl --fail -H 'X-Kuri-Role: OPS' \
  'http://localhost:3001/api/v1/orders/at-risk?page=1&limit=20&city=BOG'
```

Comprobar que solo aparecen estados activos, que cada fila reutiliza la vista resumida de US2 más
`risk`, que el orden es `HIGH`, `MEDIUM`, `LOW`, luego puntaje descendente, `promised_at`
ascendente e ID, y que la paginación informa sus cuatro metadatos. `limit=101`, rol ausente o
filtros inválidos deben recibir el error seguro correspondiente.

## Validación temporal y de reglas

La suite debe usar reloj/contextos fijos para verificar preparación igual y superior al promedio,
umbrales de 10 y 5 minutos, retraso estricto, ventanas pico por ciudad, clima, duración por estado,
datos faltantes, exclusión terminal y no mutación.

```bash
pnpm lint
pnpm build
pnpm test -- --runInBand
pnpm test:integration -- --runInBand
pnpm test:e2e -- --runInBand
pnpm test:performance -- --runInBand
```

## Flujo crítico de demostración

1. Consultar un pedido activo y explicar sus razones.
2. Consultar con un instante posterior controlado y comprobar el deterioro.
3. Consultar `at-risk` y abrir el primer pedido según prioridad.
4. Confirmar que un pedido terminal no aparece en la bandeja activa.
5. Repetir sin rol y confirmar rechazo sin datos de pedido.

La implementación no debe requerir PostgreSQL para las pruebas unitarias del motor; integración y
E2E validan el ensamblaje real con la base local.
