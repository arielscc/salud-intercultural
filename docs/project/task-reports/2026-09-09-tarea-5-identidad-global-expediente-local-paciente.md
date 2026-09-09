# Tarea 5: Identidad Global Y Expediente Local Del Paciente

## Fecha

2026-09-09.

## Objetivo

Conservar una sola identidad de paciente para toda la clínica y hacer que cada
expediente, nota, consentimiento de contacto y atención pertenezca a la
sucursal que lo generó.

## Cambios Implementados

- `Patient` incorpora documento normalizado, revisión e historial append-only
  mediante `PatientIdentityVersion`.
- `PatientBranchRecord` guarda número de ficha, estado, observaciones, alergias,
  antecedentes, medicación y primera/última atención por sucursal.
- `PatientConsent`, `PatientContact` y `PatientNote` exigen sucursal y relación
  compuesta con el expediente local. Solo `clinical_continuity` se calcula de
  forma corporativa; los consentimientos de contacto y marketing son locales.
- Cada visita captura nombre, documento, teléfono y dirección inmutables. Las
  recetas generadas desde una visita usan la fotografía histórica, y una FK
  compuesta impide crear la visita sin expediente en esa misma sucursal.
- Las correcciones en Recepción actualizan una sola identidad global,
  incrementan su versión y conservan el snapshot de visitas anteriores.
- Recepción limita la búsqueda aproximada a la sede activa y permite búsqueda
  global únicamente por teléfono, documento o código exactos. El servidor
  vuelve a comprobar la identidad antes de crear una relación en otra sede.
- Administración solo lista, abre y compara pacientes vinculados a la sede
  activa. La cola global de duplicados queda disponible únicamente para
  Dirección y Super administración; Recepción ve pares completamente locales.
- Documento, teléfonos, alias y reglas de duplicidad operan sobre la identidad
  global. La fusión combina expedientes por sucursal sin mezclar datos locales.
- Seeds, simulacro de backup y contratos de pruebas fueron adaptados para crear
  la relación local y los snapshots obligatorios.

## Reconciliación Y Migración

- La primera migración crea la estructura y mueve solamente filas con una única
  sucursal demostrable.
- `pnpm branch:reconcile:patients` reutiliza el motor de la Tarea 4, reporta solo
  IDs técnicos y permite resolver perfiles, consentimientos, contactos y notas
  ambiguos mediante decisiones explícitas.
- La segunda migración bloquea `NOT NULL` y la eliminación de campos antiguos
  mientras exista cualquier dato sin reconciliar.
- No se ejecutó ninguna migración ni se modificó una base de datos en esta
  tarea.

## Archivos Principales

- `prisma/schema.prisma`
- `prisma/migrations/20260909130000_patient_identity_branch_record/migration.sql`
- `prisma/migrations/20260909140000_harden_patient_branch_record/migration.sql`
- `scripts/reconcile-patient-branch-ownership.ts`
- `src/modules/database/queries/patients.ts`
- `src/modules/database/queries/reception.ts`
- `src/modules/database/queries/visits.ts`
- `src/modules/database/queries/patient-duplicates.ts`
- `docs/architecture/patient-identity-and-branch-records.md`

## Validación

- `pnpm lint`: aprobado sin advertencias de ESLint.
- `pnpm typecheck`: aprobado durante la implementación; incluyó Prisma,
  Payload, rutas Next, TypeScript y el contrato de tenencia para 102 modelos.
- El detector reportó 21 maestros globales, 79 operaciones locales, un evento
  de plataforma y una lectura controlada entre sucursales.
- Se añadieron/actualizaron contratos de pruebas, pero la suite completa y las
  migraciones se reservan para la Tarea 17 según la política del proyecto.
- El entorno usa Node `v24.19.0` aunque el proyecto declara Node 22; la
  advertencia no alteró las verificaciones.

## Pendientes

- Las Tareas 6–13 deben completar la partición de los demás dominios.
- Constraints cruzados adicionales, RLS, migración real y QA acumulado siguen
  reservados para las Tareas 15–17.

**Commit sugerido:** `feat(sigeco): separate patient identity from branch records`
