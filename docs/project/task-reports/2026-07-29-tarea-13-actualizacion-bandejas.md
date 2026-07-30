# Reporte De Cambios — Tarea 13: Actualización De Bandejas Entre Áreas

## Fecha

2026-07-29.

## Objetivo

Evitar que Recepción, Consulta, Enfermería y Administración trabajen con una
bandeja antigua, sin perder filtros, selección ni información sin guardar.

## Resultado Implementado

- Las cuatro bandejas se actualizan sin recargar toda la aplicación.
- Escritorio revisa cada 30 segundos.
- Móvil revisa cada 60 segundos para reducir consumo.
- Cada bandeja muestra cuándo fue revisada por última vez.
- Se agregó un botón de actualización manual.
- El polling se pausa en segundo plano y sin conexión.
- Una solicitud activa impide iniciar otra.
- Al volver a la pestaña se programa una sola revisión.
- Los filtros, la paginación y la visita seleccionada permanecen en la URL.
- Los formularios modificados detienen la actualización y conservan sus datos.
- La búsqueda controlada de pacientes y los rangos de fecha también se
  consideran cambios sin aplicar.
- Una revisión que supera 20 segundos se libera con una advertencia.
- La sesión mide solicitudes, pausas, fallos y duración sin guardar datos de
  pacientes.

## Decisiones Técnicas

- Se usa `router.refresh()` sobre páginas de servidor; la base continúa siendo
  la fuente de verdad.
- No se agregó SSE ni WebSocket porque el volumen actual todavía no demuestra
  esa necesidad.
- No se consulta la base para registrar cada polling.
- Las métricas quedan en `sessionStorage` y no contienen información clínica.
- El componente es común a todas las bandejas para mantener una sola política.

## Base De Datos Y Ambientes

- No se agregó ninguna migración.
- La base local continúa con 20 migraciones.
- Staging y producción no fueron modificados.

## Validación Local

- `pnpm exec tsc --noEmit`: aprobado.
- `pnpm lint`: aprobado sin advertencias.
- 7 pruebas focalizadas cubren intervalos, formularios modificados, una sola
  solicitud activa y pausa/reanudación en segundo plano.

## Pendientes Del Cierre Conjunto

- Ejecutar integración acumulada según la autorización acordada.
- Completar QA móvil y escritorio con gstack.
- Validar el recorrido entre las cuatro áreas en staging.
- Observar las métricas del piloto antes de considerar tiempo real.
- Solicitar autorización antes de cualquier cambio en producción.

La implementación local queda **en progreso** hasta completar el QA acumulado y
la validación por roles en staging.

## Commit Sugerido

`feat(sigeco): refresh operational queues`
