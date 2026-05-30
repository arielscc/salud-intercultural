# Tarea: V3.5 Seguimiento

## Fecha

2026-05-30

## Objetivo

Implementar la fase V3.5 para crear tareas de seguimiento, registrar contactos, manejar resultados y mostrar vencimientos e historial por paciente.

## Cambios Implementados

- Se agregaron modelos Prisma para tareas de seguimiento, intentos de contacto, historial de estado y plantillas.
- Se agrego la migracion `20260530005000_v3_5_followups`.
- Se ampliaron permisos internos con `followups_read` y `followups_write`.
- Se habilito seguimiento para captacion, administracion, medico, direccion y super_admin segun responsabilidades operativas.
- Se agregaron labels y schemas Zod para tareas, metodos de contacto y resultados.
- Se agrego query module `follow-ups.ts` con creacion de tareas, bandeja filtrable, detalle, registro de contacto, timeline y resumen operativo.
- Se agregaron Server Actions para crear tareas de seguimiento y registrar intentos/contactos.
- Se crearon pantallas mobile-first:
  - `/sigeco/seguimientos`
  - `/sigeco/seguimientos/[taskId]`
- Se agregaron filtros de bandeja: vencidos, hoy y proximos.
- Se agregaron acciones rapidas de llamada y WhatsApp desde el detalle del seguimiento.
- Se agrego formulario para crear seguimiento desde la ficha del paciente.
- Se agrego historial de seguimiento dentro del detalle del paciente.
- Se agrego indicador de seguimientos de hoy en el dashboard interno.
- Se agregaron tests unitarios para permisos y schemas de seguimiento.
- Se agrego prueba de integracion para vencimientos, resolucion de contacto e historial del paciente.
- Se aplico la migracion en la base local `salud_intercultural_dev`.

## Archivos Modificados

- `prisma/schema.prisma`
- `prisma/migrations/20260530005000_v3_5_followups/migration.sql`
- `src/components/internal/InternalShell.tsx`
- `src/features/internal-auth/permissions.ts`
- `src/features/internal-auth/permissions.test.ts`
- `src/features/follow-ups/actions.ts`
- `src/features/follow-ups/labels.ts`
- `src/features/follow-ups/schemas/follow-up.schema.ts`
- `src/features/follow-ups/schemas/follow-up.schema.test.ts`
- `src/modules/database/queries/follow-ups.ts`
- `src/modules/database/queries/follow-ups.integration.test.ts`
- `src/modules/database/queries/patients.ts`
- `src/modules/database/queries/clinical-care.integration.test.ts`
- `src/modules/database/queries/nursing-studies.integration.test.ts`
- `src/modules/database/queries/patients-visits.integration.test.ts`
- `src/modules/database/queries/sales.integration.test.ts`
- `src/app/(internal)/sigeco/(app)/page.tsx`
- `src/app/(internal)/sigeco/(app)/seguimientos/page.tsx`
- `src/app/(internal)/sigeco/(app)/seguimientos/[taskId]/page.tsx`
- `src/app/(internal)/sigeco/(app)/pacientes/[id]/page.tsx`
- `docs/project/task-reports/2026-05-30-v3-5-seguimiento.md`

## Decisiones Tecnicas

- `FollowUpTask` permite origen flexible desde lead, paciente, visita, venta, orden clinica o tarea de ruta.
- Los estados siguen la lista definida en V3.5 y se guardan en `FollowUpStatusHistory` en cada cambio relevante.
- Registrar un intento de contacto actualiza el estado de la tarea en la misma transaccion.
- Los seguimientos pueden asignarse a un usuario; si no se indica responsable desde UI, quedan asignados al creador.
- Captacion puede resolver seguimientos sin permisos de lectura/escritura clinica.
- Las plantillas quedan modeladas y sembradas en migracion, aunque la UI inicial no las selecciona todavia.

## Validacion

- `pnpm test`: paso. 17 archivos, 51 tests.
- `pnpm lint`: paso.
- `pnpm typecheck`: paso.
- `pnpm test:integration`: paso fuera del sandbox. 7 archivos, 7 tests.
- `pnpm run build`: paso.
- `pnpm db:migrate`: paso fuera del sandbox y aplico `20260530005000_v3_5_followups` en la base local.

## Pendientes

- Probar manualmente `/sigeco/seguimientos` y `/sigeco/seguimientos/[taskId]` en mobile.
- Agregar seleccion visual de plantillas cuando se defina el flujo operativo.
- Automatizar creacion de seguimientos desde ventas/consultas especificas si se define una regla de negocio concreta.
