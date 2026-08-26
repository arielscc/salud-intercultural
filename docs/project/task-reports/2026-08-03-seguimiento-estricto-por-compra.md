# Tarea 7 (Dashboard del médico) — Seguimiento Estricto Por Compra

Fecha: 2026-08-03. Entorno modificado: código en `develop`. **Sin migración**
(reglas y UI sobre datos existentes). Iniciativa:
[Dashboard del médico](../sigeco-medico-dashboard/tasks.md). Depende de las
Tareas 3 y 6.

Aplica el modo de ejecución vigente: se implementó y se corrieron **lint y
typecheck**; QA de navegador (gstack), pruebas y build quedan pendientes para el
cierre acumulado.

## Objetivo

Que el médico agende un seguimiento (fecha, hora y motivo) hacia Recepción solo
cuando exista una venta registrada en la visita, respetando el consentimiento.

## Resultado

- **Tarjeta "Agendar seguimiento (Recepción)" en la consulta:** el médico elige
  tipo (Retorno / Evolución / Recuperación de tratamiento), **fecha y hora**,
  **motivo** y notas. El seguimiento se crea como tarea clínica y se **asigna a
  Recepción** (por la resolución de responsable existente).
- **Estricto por compra:** el formulario solo aparece si la visita tiene una
  **venta registrada**; si no, muestra el aviso "Solo puedes agendar seguimiento
  cuando haya una venta…". Además, el servidor **revalida** que exista la venta
  (`getVisitLatestSale`) y **deniega** el intento (auditado
  `follow_up_requires_sale`) si no hay; el rol también se valida (solo médico /
  super admin).
- **Enlace de trazabilidad:** la tarea guarda `visitId` y `saleId` de la visita.
- **Consentimiento:** si no hay consentimiento vigente, se **avisa** en el
  formulario y el seguimiento se agenda igual, pero el **contacto queda
  bloqueado** (el intento de contacto exige consentimiento, como ya ocurre). Así
  "se avisa y no se habilita el contacto".

## Criterios de aceptación

- **Sin venta registrada, el médico no puede crear el seguimiento:** UI oculta el
  formulario y el servidor deniega el intento.
- **El seguimiento llega a Recepción con fecha, hora y motivo:** tarea clínica
  asignada a Recepción con `dueAt` y `title`.
- **Sin consentimiento, se avisa y no se habilita el contacto:** aviso en la
  consulta; el contacto sigue bloqueado por el consentimiento.

## Archivos

- `src/modules/database/queries/sales.ts`: `getVisitLatestSale(visitId)`.
- `src/features/follow-ups/schemas/follow-up.schema.ts`:
  `createDoctorVisitFollowUpSchema` (tipos clínicos, fecha/hora, motivo).
- `src/features/follow-ups/actions.ts`: `createDoctorVisitFollowUpAction`
  (permiso `followups_write`, rol médico/super admin, exige venta, asigna a
  Recepción, auditado).
- `src/app/(internal)/sigeco/(app)/consultas/[visitId]/page.tsx`: carga la venta
  de la visita, renderiza la tarjeta de seguimiento, avisos de éxito/error.

## Decisiones técnicas

- Se reutiliza `createFollowUpTaskRecord`, que para tipos clínicos ya asigna a
  Recepción; no se duplica lógica de asignación.
- La regla de "venta registrada" se valida en servidor además de en la UI, para
  que no dependa solo del cliente.
- Se conserva el flujo de consentimiento existente (bloqueo en el intento de
  contacto), sin duplicarlo.

## Validación

- `pnpm lint`: aprobado.
- `pnpm typecheck` / `tsc --noEmit`: aprobado.
- Sin migración; no requiere `prisma migrate`.

## Pendientes (cierre acumulado)

- QA de navegador (gstack): visita sin venta (sin formulario) vs. con venta
  (formulario); agendar y verificar que llega a Recepción con fecha/hora/motivo;
  paciente sin consentimiento (aviso + contacto bloqueado); responsive
  390/768/1024/1280/1440.
- Prueba de permisos (médico permitido; otros denegados) y del bloqueo por venta.
- `pnpm test`, `pnpm run build` en el cierre acumulado.

## Commit Sugerido

`feat(sigeco): gate follow-up creation by sale`
