# Decisiones técnicas

## Alcance entregado

Kuri Delivery es un monorepo pnpm con un backend NestJS, una aplicación Next.js y un paquete de contratos compartidos. La entrega prioriza los cuatro casos del business case: ingesta y consulta, riesgo, asistente de soporte y panel operacional.

## Arquitectura y selección del stack

El backend utiliza NestJS con arquitectura hexagonal: `domain/` contiene entidades, políticas y reglas independientes del framework; `application/` coordina casos de uso y define puertos; `infrastructure/` implementa HTTP, PostgreSQL con TypeORM, CLI y proveedor de IA. NestJS compone las dependencias. TypeORM reduce trabajo de persistencia sin incorporarse al dominio; los cambios de esquema se realizan mediante migraciones versionadas.

El frontend utiliza Next.js App Router con arquitectura modular basada en componentes. Las rutas componen las vistas; componentes y hooks reutilizan presentación y acceso a datos con TanStack Query. Tailwind define los estilos. El backend conserva las decisiones sobre riesgo, permisos y compensaciones; el frontend muestra resultados y solicita acciones. `packages/contracts` comparte los contratos TypeScript.

pnpm mantiene el monorepo y Docker Compose reproduce PostgreSQL 16, API y web. Se priorizó un entorno demostrable localmente dentro del plazo. El servicio web de Compose usa el servidor de desarrollo de Next.js; esta configuración no constituye un despliegue productivo.

## ¿Cómo se garantizó la idempotencia y el orden de eventos?

Cada evento tiene `event_id` como clave primaria. Antes de insertar un evento se busca esa clave y se compara su hash de contenido. Un reintento idéntico devuelve `DUPLICATE`; un evento con el mismo ID pero contenido diferente se rechaza como conflicto.

Los eventos válidos se conservan como historial. La proyección se reconstruye ordenando por `occurred_at` y usando `ingestion_sequence` como desempate determinista. `received_at` sirve para diagnóstico y nunca define el estado del pedido.

Con 10.000 eventos por segundo no usaría esta transacción HTTP como único mecanismo. Añadiría una cola particionada por `order_id`, consumidores horizontales, backpressure y una estrategia explícita de reintentos. Mantendría la restricción única de `event_id` y la reducción determinista como última línea de protección.

## ¿Por qué se eligió un motor determinístico para el riesgo?

El plazo era de 72 horas y el dataset no contiene suficiente información para justificar un modelo entrenado. Un motor de reglas permite explicar cada resultado y probarlo con un reloj fijo.

Las señales actuales son:

- duración en el estado actual;
- tiempo de preparación frente al promedio del restaurante;
- tiempo restante hasta `promised_at`;
- retraso real;
- clima;
- hora pico usando el timezone de la ciudad.

Los pesos están centralizados en `api/src/domain/risk/value-objects/risk-rule-config.ts`:

| Señal | Puntos |
| --- | ---: |
| Lluvia / tormenta | 10 / 20 |
| Hora pico local: 12:00–14:00 o 19:00–21:00, fin excluido | 10 |
| Preparación en ACCEPTED superior al promedio | 20 |
| Preparación superior a 1,5 veces el promedio | 15 adicionales |
| CREATED >5 min / COURIER_ASSIGNED >10 min / PICKED_UP >20 min | 5 / 10 / 10 |
| Menos de 10 minutos hasta la promesa | 20 |
| Menos de 5 minutos hasta la promesa | 20 adicionales |
| Promesa vencida | 40 adicionales |

Los umbrales son MEDIUM desde 30 y HIGH desde 60. Las señales se acumulan; una promesa vencida también activa los dos umbrales de tiempo restante. Se usan zonas IANA por ciudad. No se utiliza distancia ni un histórico aprendido: `avg_prep_minutes` es la referencia disponible del restaurante. Los pesos son configuración de código, no un panel de calibración.

El riesgo se calcula al leer y también se refleja naturalmente después de cada evento nuevo, por lo que el paso del tiempo puede cambiar el resultado sin mutar el historial.

Con más datos mediría precisión, recall y calibración por ciudad, compararía reglas contra un modelo estadístico y probaría cambios en modo sombra antes de afectar decisiones operativas.

## ¿Dónde viven las reglas y cómo se evita que el LLM las viole?

Las reglas viven en policies y servicios de aplicación del backend. El proveedor LLM solo clasifica la intención y solicita una herramienta del catálogo permitido.

El backend valida ownership, argumentos de la herramienta, allowlist de tools, estados y límites de cada acción, necesidad de aprobación humana e idempotencia de la ejecución.

No existe una herramienta genérica para ejecutar SQL, modificar pedidos arbitrariamente o crear una compensación libre. El LLM no escribe directamente en PostgreSQL.

## ¿Cómo se evaluaría la calidad del asistente?

Mantendría un conjunto versionado de conversaciones con intención, pedido, usuario, tool esperada, resultado y respuesta esperada. Lo ejecutaría en CI contra el proveedor determinístico y contra un proveedor real en una evaluación separada.

Antes de cada despliegue verificaría especialmente: ownership, privacidad R7, prompt injection, pedidos inexistentes, errores del proveedor, decisiones R1-R6 y creación de aprobaciones.

## ¿Qué métricas mirar durante la primera semana?

- tasa de resolución por intención;
- respuestas rechazadas o escaladas;
- porcentaje de tool calls inválidas;
- latencia p50/p95 del LLM y de las tools;
- errores, timeouts y respuestas 429;
- aprobaciones creadas, aprobadas y rechazadas;
- compensaciones duplicadas evitadas por idempotencia;
- feedback negativo y derivaciones a soporte humano;
- tokens y costo por conversación, cuando el proveedor los entregue.

## ¿Qué cambiaría con 50.000 conversaciones diarias?

Separaría el gateway de chat del procesamiento de tools, usaría una cola para tareas no interactivas, cachearía consultas seguras de solo lectura y aplicaría límites por usuario, IP e intención. Añadiría circuit breakers, fallback determinístico, presupuesto por conversación y observabilidad centralizada con trazas correlacionadas.

También evaluaría modelos pequeños para clasificación y reservaría modelos más costosos para casos ambiguos o de mayor riesgo.

## ¿Qué haría con una semana adicional?

Primero completaría la extracción de argumentos y los turnos de seguimiento del asistente: selección entre alternativas de retraso e identificación de ítems faltantes. Es la principal limitación entre las capacidades del dominio y la conversación actual. Después incorporaría un adaptador LLM real detrás del puerto existente y un conjunto de evaluaciones para las cuatro intenciones, privacidad y fallos. Finalmente automatizaría los recorridos de navegador de chat, detalle y aprobaciones, incluyendo revisión de accesibilidad. La vista de chat y el error 422 por referencias inexistentes ya están implementados.

## Decisiones deliberadamente fuera de alcance

No se implementaron despliegue cloud, autenticación de identidad real, cola externa, WebSockets/SSE, mapa de couriers ni un modelo ML. El proveedor LLM por defecto es determinístico y local para que la suite funcione sin red ni credenciales.
