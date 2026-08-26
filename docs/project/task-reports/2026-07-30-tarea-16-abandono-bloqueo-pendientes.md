# Reporte De Cambios — Tarea 16: Abandono, Bloqueo Y Pendientes

## Fecha

2026-07-30.

## Objetivo

Conocer dónde se detuvo una visita, por qué el paciente no continuó y qué
trabajo debe recuperarse sin ocultar tareas pendientes.

## Resultado Implementado

- Se creó un registro específico para el abandono durante una visita.
- Guarda estado anterior, área, motivo, nota, usuario, fecha y pendientes.
- Los motivos son espera, costo, rechazo, emergencia, falta de insumo,
  derivación y otro.
- Los pendientes son consulta, estudio, aplicación, cobro, entrega y
  seguimiento.
- SIGECO combina lo marcado por el empleado con lo que detecta en órdenes,
  estudios, ventas, entregas y seguimientos.
- Tareas de área y órdenes abiertas cambian a bloqueadas; no se eliminan ni se
  presentan como completadas.
- El seguimiento de recuperación solo se crea con consentimiento vigente y se
  asigna a Recepción/Marlen cuando esa cuenta existe.
- Yazmin no recibe seguimientos clínicos.
- Recepción, Médico, Enfermería y Administración pueden registrar que el
  paciente no continuará.
- Dirección puede leer el reporte, pero no modificar el flujo.
- Se agregó `/sigeco/recepcion/abandonos` con filtros de motivo y fecha.
- El detalle de la visita muestra punto, área, motivo, usuario, pendientes y
  seguimiento relacionado.

## Decisiones Técnicas

- `VisitDiscontinuation` es la fuente de verdad del evento.
- `VisitDiscontinuationReason` evita motivos ambiguos escritos de distintas
  maneras.
- `VisitPendingType[]` conserva una fotografía simple de lo que quedó
  pendiente.
- El cierre, bloqueo, seguimiento y evento se guardan dentro de una transacción
  serializable.
- El flujo general ya no acepta `left`; el abandono debe pasar por la acción
  detallada con motivo obligatorio.
- Los abandonos anteriores se migran como `other`, sin inventar pendientes.
- Se añadieron permisos independientes de lectura y escritura.
- Se corrigió el schema para reflejar defaults que ya existían en migraciones
  anteriores, evitando cambios de base de datos ajenos a esta tarea.

## Base De Datos Y Ambientes

- Migración local: `20260730142202_visit_discontinuations`.
- Desarrollo local quedó al día con 23 migraciones.
- Staging y producción no fueron modificados.

## Validación Local

- `prisma format`, `prisma validate` y `prisma generate`: aprobados.
- `pnpm exec tsc --noEmit`: aprobado.
- `pnpm lint`: aprobado sin advertencias.
- 4 archivos y 25 pruebas enfocadas aprobados.
- `git diff --check`: aprobado.
- La migración y las consultas se comprobaron únicamente en PostgreSQL local.
- Los 4 abandonos anteriores quedaron enlazados a un evento conservador y no
  existe ninguna visita `left_without_care` sin su evento.

## Pendientes Del Cierre Conjunto

- Ejecutar la integración acumulada acordada.
- Completar build y QA web/móvil con gstack al terminar todas las tareas.
- Probar el flujo con cada rol en staging.
- Confirmar una cuenta activa de Recepción llamada Marlen.
- Revisar con Dirección los motivos del reporte.
- Solicitar autorización antes de migrar o habilitar en producción.

La implementación local queda **en progreso** hasta completar el QA acumulado y
la validación por roles en staging.

## Commit Sugerido

`feat(sigeco): record abandonment and blocked work`
