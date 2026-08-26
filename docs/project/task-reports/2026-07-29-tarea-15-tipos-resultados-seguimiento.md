# Reporte De Cambios — Tarea 15: Tipos Y Resultados De Seguimiento

## Fecha

2026-07-29.

## Objetivo

Permitir que Marlen y las demás áreas sepan por qué deben contactar, quién es
responsable y qué resultado tuvo la gestión sin interpretar notas libres.

## Resultado Implementado

- Se separaron tipo, relación, prioridad, estado y resultado.
- Los tipos son evolución, retorno, recuperación de tratamiento,
  administrativo y llamada médica.
- La bandeja web filtra por tipo, responsable, estado y vencimiento.
- Móvil muestra acciones rápidas para llamada, WhatsApp y resultado.
- Cada fila muestra propósito, responsable, prioridad, fecha y último
  resultado.
- `No responde` y `Reprogramado` exigen una nueva fecha y permanecen
  pendientes.
- `Empeoró` y `Escalado al médico` crean una llamada médica urgente relacionada.
- Solo Médico y Super administrador pueden resolver la llamada médica.
- Los seguimientos clínicos se asignan a Recepción/Marlen y no a
  Comunicación/Yazmin.
- El rol técnico `seguimiento` trabaja únicamente tareas administrativas.
- Consentimiento y canal autorizado continúan validándose en el servidor.

## Decisiones Técnicas

- `FollowUpTask.status` conserva el enum anterior por compatibilidad histórica,
  pero una restricción nueva permite solo pendiente, terminado o cancelado en
  la tarea vigente.
- `FollowUpResult` guarda el resultado en la tarea y en cada intento.
- `FollowUpType`, `FollowUpDomain` y `FollowUpPriority` evitan deducir el trabajo
  desde el título.
- `escalatedFromTaskId` relaciona el contacto original con la llamada médica.
- La política de rol se valida en query transaccional, no solo en la interfaz.
- La asignación clínica busca expresamente una cuenta activa de Recepción
  llamada Marlen; si falta, queda visible como sin asignar.

## Base De Datos Y Ambientes

- Migración local: `20260729235000_follow_up_classification`.
- Desarrollo local quedó al día con 22 migraciones.
- Cinco tareas anteriores conservaron sus resultados y fueron clasificadas.
- Staging y producción no fueron modificados.

## Validación Local

- `prisma format`, `prisma validate` y `prisma generate`: aprobados.
- `pnpm exec tsc --noEmit`: aprobado.
- `pnpm lint`: aprobado sin advertencias.
- 3 archivos y 17 pruebas focalizadas aprobados.
- `git diff --check`: aprobado.
- PostgreSQL local confirmó tipos, relación, prioridad, estado y resultado de
  los cinco registros existentes.

## Pendientes Del Cierre Conjunto

- Ejecutar la integración acumulada acordada.
- Completar build y QA móvil/escritorio con gstack al terminar las tareas.
- Revisar la clasificación histórica y los filtros con el personal en staging.
- Crear o corregir la cuenta activa de Marlen antes de habilitar asignación
  automática fuera de desarrollo.
- Validar al menos una cuenta activa por médico.
- Solicitar autorización antes de migrar o habilitar en producción.

La implementación local queda **en progreso** hasta completar el QA acumulado y
la validación por roles en staging.

## Commit Sugerido

`feat(sigeco): classify treatment follow-ups`
