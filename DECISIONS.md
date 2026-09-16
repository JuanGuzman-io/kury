# Decisiones técnicas

## Alcance entregado

Kuri Delivery es un monorepo pnpm con un backend NestJS, una aplicación Next.js y un paquete de contratos compartidos. La entrega prioriza los cuatro casos del business case: ingesta y consulta, riesgo, asistente de soporte y panel operacional.

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

Primero cerraría la demostración completa con pruebas end-to-end de los cuatro casos y agregaría la vista de chat al panel. Después mejoraría la gestión de errores de infraestructura para que referencias inexistentes respondan `4xx` en lugar de `500`, incorporaría evaluaciones automáticas del asistente y dejaría preparado un adaptador opcional para un proveedor LLM real.

## Decisiones deliberadamente fuera de alcance

No se implementaron despliegue cloud, autenticación de identidad real, cola externa, WebSockets/SSE, mapa de couriers ni un modelo ML. El proveedor LLM por defecto es determinístico y local para que la suite funcione sin red ni credenciales.
