# Tarea: V3.3 Estudios Y Enfermeria

## Fecha

2026-05-30

## Objetivo

Implementar la fase V3.3 para registrar estudios, signos vitales, aplicaciones clinicas y observaciones de enfermeria asociados a paciente y visita.

## Cambios Implementados

- Se agregaron modelos Prisma para estudios, adjuntos de estudio, signos vitales, aplicaciones clinicas, notas de enfermeria, adjuntos clinicos y resultados de tareas de enfermeria.
- Se agrego la migracion `20260530003000_v3_3_studies_nursing`.
- Se ampliaron permisos internos con `nursing_read`, `nursing_write`, `studies_read` y `studies_write`.
- Se habilito al rol `enfermeria` para leer/escribir enfermeria y estudios sin acceso a escritura clinica de diagnosticos.
- Se agregaron labels y schemas Zod para estados de tarea, signos vitales, aplicaciones y estudios.
- Se agregaron queries `nursing.ts` y `studies.ts`.
- Se agregaron Server Actions para tomar/actualizar tareas de enfermeria, registrar signos vitales, aplicaciones clinicas, notas y estudios.
- Se crearon pantallas mobile-first:
  - `/sigeco/enfermeria`
  - `/sigeco/enfermeria/[workItemId]`
- Se actualizo la navegacion interna de Sigeco para incluir enfermeria.
- Se agrego vista de estudios y registros de enfermeria dentro de la pantalla de consulta medica.
- Se agrego timeline de enfermeria y estudios dentro del detalle del paciente.
- Se agregaron tests unitarios para permisos, schemas de enfermeria y schemas de estudios.
- Se agrego prueba de integracion para asociacion estudio-paciente-visita y ejecucion de tareas de enfermeria.
- Se aplico la migracion en la base local `salud_intercultural_dev`.

## Archivos Modificados

- `prisma/schema.prisma`
- `prisma/migrations/20260530003000_v3_3_studies_nursing/migration.sql`
- `src/components/internal/InternalShell.tsx`
- `src/features/internal-auth/permissions.ts`
- `src/features/internal-auth/permissions.test.ts`
- `src/features/nursing/actions.ts`
- `src/features/nursing/labels.ts`
- `src/features/nursing/schemas/nursing.schema.ts`
- `src/features/nursing/schemas/nursing.schema.test.ts`
- `src/features/studies/actions.ts`
- `src/features/studies/labels.ts`
- `src/features/studies/schemas/study.schema.ts`
- `src/features/studies/schemas/study.schema.test.ts`
- `src/modules/database/queries/nursing.ts`
- `src/modules/database/queries/studies.ts`
- `src/modules/database/queries/nursing-studies.integration.test.ts`
- `src/modules/database/queries/clinical-care.ts`
- `src/modules/database/queries/clinical-care.integration.test.ts`
- `src/modules/database/queries/patients.ts`
- `src/modules/database/queries/patients-visits.integration.test.ts`
- `src/app/(internal)/sigeco/(app)/enfermeria/page.tsx`
- `src/app/(internal)/sigeco/(app)/enfermeria/[workItemId]/page.tsx`
- `src/app/(internal)/sigeco/(app)/consultas/[visitId]/page.tsx`
- `src/app/(internal)/sigeco/(app)/pacientes/[id]/page.tsx`
- `docs/project/task-reports/2026-05-30-v3-3-estudios-enfermeria.md`

## Decisiones Tecnicas

- Los adjuntos clinicos y de estudios quedaron modelados, pero la UI no sube archivos hasta definir storage seguro y politica operativa de privacidad.
- Las tareas de enfermeria se ejecutan desde `VisitWorkItem` y sincronizan estado con `ClinicalOrder` cuando corresponde.
- Registrar una aplicacion clinica desde una tarea marca la tarea y la orden asociada como completadas.
- Los estudios quedan asociados a paciente y opcionalmente a visita, orden clinica y tarea de enfermeria.
- Enfermeria puede registrar estudios por necesidad operativa, pero no puede leer ni escribir diagnosticos clinicos.

## Validacion

- `pnpm test`: paso. 15 archivos, 43 tests.
- `pnpm lint`: paso.
- `pnpm typecheck`: paso.
- `pnpm test:integration`: paso fuera del sandbox. 5 archivos, 5 tests.
- `pnpm run build`: paso.
- `pnpm db:migrate`: paso fuera del sandbox y aplico `20260530003000_v3_3_studies_nursing` en la base local.

## Pendientes

- Probar manualmente `/sigeco/enfermeria` y `/sigeco/enfermeria/[workItemId]` en mobile.
- Definir storage seguro antes de habilitar carga real de adjuntos clinicos.
- Considerar una vista dedicada de estudios por paciente cuando el volumen de registros crezca.
