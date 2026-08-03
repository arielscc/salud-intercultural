# Tarea 6 (Dashboard del médico) — Historial Del Paciente En La Consulta

Fecha: 2026-08-03. Entorno modificado: código en `develop`. **Sin migración**
(solo lectura de datos existentes y precarga). Iniciativa:
[Dashboard del médico](../sigeco-medico-dashboard/tasks.md). Depende de las
Tareas 1-5.

Aplica el modo de ejecución vigente: se implementó y se corrieron **lint y
typecheck**; QA de navegador (gstack), pruebas y build quedan pendientes para el
cierre acumulado.

## Objetivo

Que el médico vea el tratamiento y costo previos y no reescriba desde cero en una
reconsulta.

## Resultado

- **Historial de visitas anteriores en la consulta:** nueva tarjeta "Historial
  del paciente" (colapsable, plegada por defecto) que lista las visitas previas
  del paciente con un **resumen de cada una**: fecha, diagnóstico (principal y
  secundario), plan de tratamiento, lo **vendido con su costo** (ítems y total),
  y las **sesiones** de servicio (usadas/total y monto). Soporta **1..n
  reconsultas**; todas quedan registradas y se muestran.
- **Receta rápida precargada:** en una reconsulta, la "Receta rápida" se precarga
  con los medicamentos de la **consulta anterior** (medicamento, dosis,
  frecuencia, duración, observaciones); en la primera visita queda **vacía**. La
  receta de la visita actual siempre tiene prioridad; la sección se abre sola
  cuando hay algo precargado y avisa que viene de la consulta anterior.
- **Solo lectura:** el historial no altera registros previos; se cargan con una
  consulta de solo lectura y la precarga solo rellena valores por defecto
  editables.

## Criterios de aceptación

- **En una 2ª, 3ª o n-ésima visita, el médico ve el resumen de cada consulta
  anterior con lo vendido y su costo:** tarjeta de historial con ventas, ítems,
  costo y sesiones por visita.
- **La receta rápida llega precargada en reconsultas y vacía en la primera vez:**
  precarga desde la última receta previa; sin historial → vacía.
- **No se modifican datos de visitas anteriores:** solo lectura + valores por
  defecto.

## Archivos

- `src/modules/database/queries/clinical-care.ts`:
  `getPatientConsultationHistory(patientId, excludeVisitId)` — visitas previas con
  consulta, diagnósticos, ventas e ítems, sesiones y última receta.
- `src/app/(internal)/sigeco/(app)/consultas/[visitId]/page.tsx`: carga el
  historial, calcula la receta de precarga (`recetaDefault`), renderiza la
  tarjeta "Historial del paciente" y ajusta la "Receta rápida".

## Decisiones técnicas

- El historial se consulta aparte de `getClinicalVisitById` (que sigue cargando
  solo la visita actual) para no cambiar esa consulta ni su rendimiento.
- La precarga usa la última receta de la visita anterior más reciente que tenga
  receta; la visita actual manda si ya tiene receta.
- Se reutilizan los formatos de dinero y de modo de sesión existentes.

## Validación

- `pnpm lint`: aprobado.
- `pnpm typecheck` / `tsc --noEmit`: aprobado.
- Sin migración; no requiere `prisma migrate`.

## Pendientes (cierre acumulado)

- QA de navegador (gstack): paciente con varias visitas previas (con y sin
  ventas/sesiones/receta), verificar resumen y costos; reconsulta con receta
  precargada y primera visita con receta vacía; responsive 390/768/1024/1280/1440.
- `pnpm test`, `pnpm run build` en el cierre acumulado.

## Commit Sugerido

`feat(sigeco): show patient history in consultation`
