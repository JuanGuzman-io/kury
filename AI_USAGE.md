# Uso de inteligencia artificial

## Herramientas utilizadas

Se utilizó [GitHub Spec Kit](https://github.com/github/spec-kit), un toolkit open source para desarrollo guiado por especificaciones, junto con Codex como agente de desarrollo y revisión.

Spec Kit se utilizó mediante el flujo de skills `/speckit-*` y sus artefactos versionados en `.specify/` y `specs/`. En particular, se siguió el ciclo:

```text
constitution → specify → clarify → plan → tasks → implement
```

El proceso permitió llevar cada user story desde el alcance funcional hasta el plan, las tareas, los contratos y la implementación revisable. La constitución se creó una vez para el proyecto y el ciclo de especificación se repitió para cada feature.

La dirección técnica, el alcance, la selección de patrones y la revisión final de los cambios pertenecen al desarrollador. No se incorporaron credenciales ni código generado sin validación.

## Para qué se utilizó

- estructurar el dominio y los límites entre dominio, aplicación, infraestructura y HTTP;
- proponer modelos TypeScript, DTOs, migraciones TypeORM y contratos OpenAPI;
- generar casos de prueba para idempotencia, eventos fuera de orden, riesgo, soporte y aprobaciones;
- construir componentes de Next.js y sus estados de loading, error, empty y success;
- revisar accesibilidad, responsive layout y microinteracciones del panel;
- diagnosticar errores durante las pruebas locales;
- redactar documentación técnica y decisiones de arquitectura.

## Uso concreto de GitHub Spec Kit

Spec Kit se utilizó para estructurar el business case en siete incrementos trazables:

1. Ingesta y reconstrucción del estado de pedidos.
2. Consulta, listado y detalle de pedidos.
3. Detección y explicación de riesgo.
4. Asistente conversacional y tool calling.
5. Reglas de soporte y ejecución de acciones.
6. Aprobaciones humanas y trazabilidad.
7. Panel de operaciones.

Para cada incremento se revisaron los artefactos de requisitos, contrato, modelo de datos, investigación, plan, quickstart, checklist y tareas antes de implementar. Las aclaraciones se resolvieron explícitamente antes de continuar el ciclo, y las decisiones resultantes quedaron reflejadas en el código y la documentación.

## Ejemplos de revisión y corrección

### 1. CORS y separación de procesos locales

La primera prueba del panel mostró que el navegador llamaba correctamente a `localhost:3001`, pero el backend no tenía CORS habilitado para `localhost:3000`. Se revisó `main.ts`, se agregó una allowlist explícita de origen y headers, y se validó con lint y TypeScript.

También se distinguió entre la API ejecutada por Docker y la API local con hot reload, porque ambas no pueden ocupar simultáneamente el puerto 3001.

### 2. Datos sintéticos y claves de referencia

Durante la prueba manual se usó inicialmente `rest_001`, pero el dataset generado utiliza IDs como `rst_bog_0001`. La base rechazó correctamente la referencia inexistente. Se corrigió el escenario de prueba usando un restaurante real del dataset y se documentó que el API debería transformar ese caso en un error `4xx` más claro.

### 3. Navegación del panel

El primer layout permitía que el aside se desplazara junto con el contenido. La revisión de UX identificó que esto ralentizaba el acceso a Pedidos, Aprobaciones y Chat. Se ajustó a `sticky` en desktop, con altura de viewport y scroll interno, manteniendo una navegación horizontal usable en móvil.

## Ahorro de tiempo significativo

El uso de Codex aceleró la creación coordinada de contratos, controladores, queries, componentes y pruebas a partir de las user stories. La mayor ganancia estuvo en mantener consistencia entre el contrato OpenAPI, los DTOs de Nest, los tipos compartidos y los consumidores de Next.js.

## Cómo se revisó el resultado

Cada cambio se contrastó con la especificación correspondiente y con los límites del business case. Se ejecutaron lint, TypeScript, pruebas automatizadas, `git diff --check` y pruebas manuales mediante `curl` contra PostgreSQL y Nest.

La revisión también comprobó que:

- el LLM no tuviera acceso directo a la base de datos;
- las tools estuvieran en allowlist;
- los importes se manejaran en centavos;
- no se expusieran teléfono ni documento del courier;
- las acciones sensibles pasaran por policies y aprobaciones.

## Proveedor LLM

No se utilizó Claude, OpenAI ni otro proveedor remoto. El adaptador actual es determinístico y en memoria. Esta decisión permite ejecutar localmente sin red, credenciales ni costo. Un proveedor real debe integrarse detrás del mismo puerto y configurarse mediante variables de entorno del backend, nunca mediante una API key en el frontend.
