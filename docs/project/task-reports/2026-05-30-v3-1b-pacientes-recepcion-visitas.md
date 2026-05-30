# Tarea: V3.1B Pacientes, Recepcion Y Visitas

## Fecha

2026-05-30

## Objetivo

Implementar la segunda entrega tecnica de V3.1: pacientes, recepcion, visitas y ruta activa del paciente como base para la futura atencion medica.

## Cambios Implementados

- Se agregaron modelos Prisma para pacientes, contactos, notas, visitas, check-in de recepcion, historial de estados, ruta activa, pasos de ruta y tareas de visita.
- Se agrego la migracion `20260530001000_v3_1b_patients_visits`.
- Se ampliaron permisos internos para pacientes, visitas y ruta activa.
- Se agregaron labels de pacientes, fuentes, estados de visita, areas de ruta y tareas.
- Se agregaron schemas Zod para crear pacientes y actualizar visitas.
- Se agregaron queries para crear/listar/detallar pacientes.
- Se agregaron queries para abrir visitas, listar visitas activas y actualizar ruta/estado.
- Se agregaron Server Actions para crear pacientes, abrir visitas y derivar pacientes entre areas.
- Se agrego conversion basica desde un lead interno hacia un paciente nuevo.
- Se agregaron pantallas mobile-first:
  - `/sigeco/pacientes`
  - `/sigeco/pacientes/nuevo`
  - `/sigeco/pacientes/[id]`
  - `/sigeco/visitas`
  - `/sigeco/visitas/[id]`
- Se actualizo la navegacion interna de Sigeco para incluir pacientes y visitas.
- Se agregaron tests unitarios para schemas de pacientes y visitas.
- Se agrego prueba de integracion para crear paciente, abrir visita y actualizar ruta activa.
- Se aplico la migracion en la base local `salud_intercultural_dev`.

## Archivos Modificados

- `prisma/schema.prisma`
- `prisma/migrations/20260530001000_v3_1b_patients_visits/migration.sql`
- `src/components/internal/InternalShell.tsx`
- `src/components/internal/StatusPill.tsx`
- `src/features/internal-auth/permissions.ts`
- `src/features/patients/actions.ts`
- `src/features/patients/labels.ts`
- `src/features/patients/schemas/patient.schema.ts`
- `src/features/patients/schemas/patient.schema.test.ts`
- `src/features/visits/actions.ts`
- `src/features/visits/schemas/visit.schema.ts`
- `src/features/visits/schemas/visit.schema.test.ts`
- `src/modules/database/queries/patients.ts`
- `src/modules/database/queries/visits.ts`
- `src/modules/database/queries/patients-visits.integration.test.ts`
- `src/app/(internal)/sigeco/(app)/leads/[id]/page.tsx`
- `src/app/(internal)/sigeco/(app)/pacientes/page.tsx`
- `src/app/(internal)/sigeco/(app)/pacientes/nuevo/page.tsx`
- `src/app/(internal)/sigeco/(app)/pacientes/[id]/page.tsx`
- `src/app/(internal)/sigeco/(app)/visitas/page.tsx`
- `src/app/(internal)/sigeco/(app)/visitas/[id]/page.tsx`
- `docs/project/task-reports/2026-05-30-v3-1b-pacientes-recepcion-visitas.md`

## Decisiones Tecnicas

- La ruta activa del paciente queda persistida en Prisma con `PatientRoute` y `PatientRouteStep`; la UI solo refleja esa fuente de verdad.
- Abrir una visita crea check-in, historial de estado, ruta inicial en recepcion, paso de ruta y una tarea de visita.
- Derivar un paciente actualiza estado de visita, cierra el paso anterior, crea el nuevo paso y genera una tarea para el area destino.
- La conversion desde lead a paciente se implemento como flujo basico: el lead enlaza al formulario de paciente con datos precargados y `sourceLeadId`.
- V3.1B no implementa todavia atencion medica, diagnosticos ni indicaciones clinicas; deja la visita y ruta listas para V3.2.

## Validacion

- `pnpm test`: paso. 12 archivos, 34 tests.
- `pnpm lint`: paso.
- `pnpm typecheck`: paso.
- `pnpm test:integration`: paso fuera del sandbox. 3 archivos, 3 tests.
- `pnpm run build`: paso.
- `pnpm db:migrate`: paso fuera del sandbox y aplico `20260530001000_v3_1b_patients_visits` en la base local.

## Pendientes

- Probar manualmente `/sigeco/pacientes`, `/sigeco/pacientes/nuevo`, `/sigeco/visitas` y `/sigeco/visitas/[id]` en mobile.
- Agregar edicion de ficha permanente del paciente en una entrega posterior.
- Agregar control mas fino de tareas por area cuando se implemente realtime.
- Implementar V3.2 sobre visitas existentes: consulta, diagnostico, tratamiento, receta e indicaciones.
