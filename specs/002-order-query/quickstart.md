# Quickstart: Order Query and Listing

Guía de validación local para US2. La feature depende de la proyección y referencias cargadas por
US1; no agrega frontend.

## Prerrequisitos

- Node.js 22 y pnpm 11.
- Docker Desktop o Docker Engine con Compose.
- Puerto 3001 libre para la API y 5432 libre para PostgreSQL.

## Levantar el entorno

Desde la raíz del monorepo:

```bash
cp .env.example .env
pnpm local:up
pnpm db:migrate
pnpm data:seed -- --seed 20260915 --orders 1500
```

La API queda disponible en `http://localhost:3001` y la salud de la base se verifica con:

```bash
curl --fail http://localhost:3001/health
```

La documentación interactiva local estará disponible en:

```text
http://localhost:3001/docs
```

Debe reflejar los DTOs públicos de US2, incluidos filtros, paginación, respuestas y errores. El
archivo [contracts/openapi.yaml](./contracts/openapi.yaml) continúa siendo la versión revisable del
contrato y debe mantenerse alineado con la documentación generada.

## Validación de detalle

Consultar un pedido conocido con el rol operativo:

```bash
curl --fail \
  -H 'X-Kuri-Role: OPS' \
  http://localhost:3001/api/v1/orders/ord_20260915_000001
```

Comprobar que la respuesta incluye el estado proyectado, `restaurant.restaurant_id`,
`restaurant.name`, `courier_id`, ítems y timeline ordenado por `occurred_at`. No deben aparecer
`phone`, `document_id`, `full_name` de courier ni datos privados de restaurante.

Un pedido inexistente debe devolver `404` y un rol ausente debe devolver `403`:

```bash
curl -i http://localhost:3001/api/v1/orders/ord_unknown
curl -i -H 'X-Kuri-Role: OPS' http://localhost:3001/api/v1/orders/ord_unknown
```

## Validación de listado y filtros

Listado resumido con valores por defecto:

```bash
curl --fail -H 'X-Kuri-Role: OPS' \
  'http://localhost:3001/api/v1/orders'
```

Filtros combinados y paginación:

```bash
curl --fail -H 'X-Kuri-Role: OPS' \
  'http://localhost:3001/api/v1/orders?city=BOG&status=ACCEPTED&delayed=true&page=1&limit=20'
```

Verificar que cada objeto de `data` contiene solo la vista resumida, que `pagination` informa
`page`, `limit`, `total` y `totalPages`, y que el orden por defecto es `created_at DESC` y luego
`order_id ASC`.

Casos de retraso:

- `delayed=true`: `now > promised_at` y estado diferente de `DELIVERED`.
- `delayed=false`: solo pedidos que no cumplen esa condición.
- Sin `delayed`: no se filtra por retraso.

## Validación automatizada

```bash
pnpm lint
pnpm build
pnpm test
pnpm test:integration
pnpm test:e2e
```

La evidencia crítica debe cubrir detalle, listado, filtros individuales y combinados, límite de
página, página vacía, retraso en igualdad de timestamps, autorización, `404`, rate limit,
privacidad y lectura coherente mientras llega una ingesta.

## Límites conocidos

- La autenticación real no forma parte del ejercicio; los roles son simulados mediante
  `X-Kuri-Role`, aunque la autorización se aplica realmente.
- La paginación es por página y límite; una futura operación a escala mayor puede requerir cursores.
- El orden y el retraso se calculan al leer; una vista puede cambiar si ingesta o el reloj cambia
  entre consultas.
- Riesgo, soporte conversacional, reglas R1-R7, aprobaciones y frontend están fuera de US2.
