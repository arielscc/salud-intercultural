# Tarea: V3.2 Atencion Medica

## Fecha

2026-05-30

## Objetivo

Implementar la fase V3.2 para registrar consulta medica, diagnosticos, plan de tratamiento, receta, evolucion e indicaciones clinicas asociadas a una visita activa.

## Cambios Implementados

- Se agregaron modelos Prisma para consulta clinica, diagnosticos, planes de tratamiento, recetas, items de receta, evolucion, notas clinicas y ordenes clinicas.
- Se agrego la migracion `20260530002000_v3_2_clinical_care`.
- Se ampliaron permisos internos con `clinical_read` y `clinical_write`.
- Se habilito al rol `medico` para leer visitas, actualizar ruta y registrar atencion clinica.
- Se agregaron labels para tipos y estados de orden clinica.
- Se agregaron schemas Zod para consulta medica y orden clinica.
- Se agregaron queries para listar visitas en consulta, obtener expediente de una visita, guardar consulta y crear orden clinica.
- Se agregaron Server Actions para guardar consulta y crear indicaciones para otras areas.
- Se agregaron pantallas mobile-first:
  - `/sigeco/consultas`
  - `/sigeco/consultas/[visitId]`
- Se actualizo la navegacion interna de Sigeco para incluir consultas.
- Se agrego receta rapida de un item dentro de la pantalla de consulta.
- Se agrego creacion de orden clinica que genera tambien una tarea de visita para el area destino.
- Se agregaron tests unitarios para schemas clinicos.
- Se agrego prueba de integracion para consulta, diagnosticos, receta, evolucion y orden clinica.
- Se aplico la migracion en la base local `salud_intercultural_dev`.

## Archivos Modificados

- `prisma/schema.prisma`
- `prisma/migrations/20260530002000_v3_2_clinical_care/migration.sql`
- `src/components/internal/InternalShell.tsx`
- `src/features/internal-auth/permissions.ts`
- `src/features/clinical-care/actions.ts`
- `src/features/clinical-care/labels.ts`
- `src/features/clinical-care/schemas/clinical-care.schema.ts`
- `src/features/clinical-care/schemas/clinical-care.schema.test.ts`
- `src/modules/database/queries/clinical-care.ts`
- `src/modules/database/queries/clinical-care.integration.test.ts`
- `src/app/(internal)/sigeco/(app)/consultas/page.tsx`
- `src/app/(internal)/sigeco/(app)/consultas/[visitId]/page.tsx`
- `docs/project/task-reports/2026-05-30-v3-2-atencion-medica.md`

## Decisiones Tecnicas

- La consulta clinica queda asociada uno a uno con una visita mediante `ClinicalConsultation.visitId`.
- Los diagnosticos se almacenan como registros separados para distinguir diagnostico principal y secundarios.
- La receta se modela como `Prescription` con `PrescriptionItem`, aunque la UI inicial solo permite un item rapido.
- Las ordenes clinicas se almacenan en `ClinicalOrder` y crean un `VisitWorkItem` para que el area destino pueda ver la tarea.
- La fase no implementa aun ejecucion de enfermeria ni cierre de ordenes; eso corresponde a V3.3.
- La auditoria clinica detallada queda pendiente para una fase transversal de auditoria.

## Validacion

- `pnpm test`: paso. 13 archivos, 37 tests.
- `pnpm lint`: paso.
- `pnpm typecheck`: paso.
- `pnpm test:integration`: paso fuera del sandbox. 4 archivos, 4 tests.
- `pnpm run build`: paso.
- `pnpm db:migrate`: paso fuera del sandbox y aplico `20260530002000_v3_2_clinical_care` en la base local.

## Pendientes

- Probar manualmente `/sigeco/consultas` y `/sigeco/consultas/[visitId]` en mobile.
- Derivar una visita a `in_consultation` desde `/sigeco/visitas/[id]` antes de abrir consulta.
- Implementar V3.3 para que enfermeria reciba, tome y ejecute las ordenes clinicas.
- Agregar impresion/exportacion de receta cuando se defina el formato operativo.
- Agregar auditoria clinica append-only en una entrega transversal.
