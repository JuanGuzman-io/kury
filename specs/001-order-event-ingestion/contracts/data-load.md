# Contrato de generación y carga de datos

## Objetivo

La US1 entrega un generador sintético determinista y un cargador repetible para
`events.jsonl`, `restaurants.json` y `couriers.json`. Ambos se ejecutan desde el contexto de
aplicación de NestJS y reutilizan validadores y casos de uso; no insertan eventos directamente en
tablas ni dependen del endpoint HTTP.

## Comandos públicos

```bash
pnpm data:generate -- --seed 20260915 --orders 1500 --out api/data/generated
pnpm data:load -- \
  --events api/data/generated/events.jsonl \
  --restaurants api/data/generated/restaurants.json \
  --couriers api/data/generated/couriers.json
pnpm data:seed -- --seed 20260915 --orders 1500
```

`data:seed` compone generación y carga. Todos los comandos se ejecutan desde la raíz del monorepo.
`--json` cambia la salida humana por una única respuesta JSON estable para automatización.

## Entradas del generador

| Opción | Tipo | Valor predeterminado | Regla |
|---|---|---:|---|
| `--seed` | entero de 64 bits | `20260915` | Misma semilla y opciones producen archivos byte a byte idénticos. |
| `--orders` | entero | `1500` | Entre 1 y 100000. |
| `--out` | ruta | `api/data/generated` | Debe estar dentro del repositorio; se crean archivos nuevos o se reemplazan solo los tres archivos conocidos. |
| `--json` | bandera | falso | Emite el resumen estable descrito abajo. |

El conjunto generado debe cumplir, con tolerancia explícita:

- las ciudades `BOG`, `MEX` y `LIM` y los climas `CLEAR`, `RAIN` y `STORM` están representados;
- aproximadamente 3% de entregas son duplicados exactos, tolerancia de 0.5 puntos porcentuales;
- aproximadamente 5% de entregas están fuera de orden, tolerancia de 0.5 puntos porcentuales;
- aproximadamente 12% de pedidos son retrasados, tolerancia de 1 punto porcentual;
- aproximadamente 4% de pedidos terminan cancelados, tolerancia de 0.5 puntos porcentuales;
- existen pedidos activos sin evento terminal;
- cada pedido no cancelado conserva la secuencia completa hasta su último estado generado;
- los totales se expresan con máximo dos decimales y coinciden con la suma de sus ítems.

Para que la guía de aceptación sea ejecutable con cualquier semilla, el catálogo siempre incluye
los identificadores estables `rst_bog_0001` y `crr_bog_0001`; sus demás atributos sí dependen de la
semilla.

Los duplicados cuentan como líneas adicionales en `events.jsonl`, pero conservan exactamente el
mismo documento y `event_id` de su original. La mezcla fuera de orden cambia únicamente el orden de
las líneas, nunca `occurred_at`.

## Formato de archivos

### `events.jsonl`

Un documento JSON por línea, UTF-8 y salto final. Cada documento cumple uno de los esquemas de
entrada de `POST /api/v1/order-events` en `openapi.yaml`. No se permiten líneas vacías, comentarios
ni arreglos envolventes.

### `restaurants.json`

Arreglo JSON UTF-8 de objetos con estas claves en inglés:

| Campo | Regla |
|---|---|
| `restaurant_id` | ID único de 1 a 64 caracteres. |
| `name` | Texto de 1 a 256 caracteres. |
| `city` | `BOG`, `MEX` o `LIM`. |
| `latitude`, `longitude` | Coordenadas geográficas válidas. |
| `avg_prep_minutes` | Entero positivo. |
| `rating` | Decimal entre 0.0 y 5.0. |

### `couriers.json`

Arreglo JSON UTF-8 de objetos con estas claves en inglés:

| Campo | Regla |
|---|---|
| `courier_id` | ID único de 1 a 64 caracteres. |
| `full_name` | Dato sensible, requerido. |
| `phone` | Dato sensible, requerido. |
| `document_id` | Dato sensible y único, requerido. |
| `vehicle` | Texto de 1 a 32 caracteres. |
| `city` | `BOG`, `MEX` o `LIM`. |
| `rating` | Decimal entre 0.0 y 5.0. |

Los datos personales de couriers pueden persistirse para realismo del caso, pero nunca aparecen en
respuestas HTTP, errores, trazas o resúmenes de CLI.

## Semántica de carga

1. Validar opciones, existencia, tamaño y formato de los tres archivos antes de abrir la carga.
2. Calcular una huella SHA-256 sobre archivos y opciones normalizadas y abrir un `LoadRun`.
3. Cargar restaurantes y couriers primero, con upsert determinista por ID. Un ID existente con
   datos diferentes se considera conflicto y no se sobrescribe silenciosamente.
4. Leer `events.jsonl` como flujo y procesar cada línea mediante `IngestOrderEvent`.
5. Confirmar cada evento en su propia transacción para no perder los anteriores por una línea mala.
6. Continuar después de rechazos recuperables, acumular conteos y ocultar datos sensibles.
7. Cerrar el `LoadRun` con el resumen. Una falla de infraestructura lo marca `FAILED`.

Ejecutar exactamente la misma carga por segunda vez es seguro: restaurantes y couriers permanecen
sin cambios, todos los eventos son `DUPLICATE` y ninguna proyección incrementa su versión.
`PENDING` y `HISTORICAL` son resultados válidos; `REJECTED_*` hace que la ejecución termine con
código 4 después de procesar las líneas restantes.

## Salida estable

La salida humana usa mensajes concisos en español. Con `--json`, stdout contiene solo:

```json
{
  "load_run_id": "019f1234-0000-7000-8000-000000000001",
  "source_fingerprint": "sha256-hex",
  "total_events": 6240,
  "applied_count": 5800,
  "pending_count": 0,
  "historical_count": 253,
  "duplicate_count": 187,
  "rejected_count": 0,
  "duration_ms": 12450
}
```

Los conteos son enteros no negativos y su suma es `total_events`. Los números del ejemplo son
ilustrativos y no constituyen una expectativa exacta para cualquier semilla.

## Códigos de salida

| Código | Significado |
|---:|---|
| `0` | Generación o carga completada; duplicados, históricos o pendientes no son errores. |
| `2` | Argumentos, archivo, JSON o esquema inválido antes o durante la carga. |
| `3` | PostgreSQL, migraciones o infraestructura no disponibles. |
| `4` | La carga terminó, pero uno o más registros fueron rechazados por conflicto o validación. |
| `5` | Error interno inesperado; se entrega `trace_id` sin datos sensibles. |

Los diagnósticos se escriben en stderr. En modo `--json`, stdout sigue reservado al resumen final.
