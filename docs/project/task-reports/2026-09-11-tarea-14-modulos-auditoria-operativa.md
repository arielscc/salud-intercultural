# Tarea 14 — Módulos y auditoría operativa

Fecha: 2026-09-11  
Estado: implementada; migraciones y reconciliación preparados, no ejecutados.

## Resultado

La definición técnica de los módulos permanece en código y tanto su estado
como su historial pertenecen a una única sucursal:

- `ModuleActivation` conserva la clave `(code, branchCode)`.
- `ModuleActivationEvent.branchCode` pasa a ser obligatorio y tiene relación
  directa con `ClinicBranch`, además de la relación compuesta con el estado.
- `getModuleActivationHistory` ya no mezcla eventos legacy sin sede en El Alto,
  Cochabamba ni ninguna sucursal futura.
- Encender o apagar un módulo sigue resolviendo la sede activa en servidor y
  produce historial local y un evento operativo local.

`AuditEvent` incorpora `scope = platform | branch` y `branchCode`. La API de
inserción usa una unión discriminada: toda acción operativa debe entregar una
sede; el ámbito global solo acepta la lista cerrada de autenticación, identidad,
membresías, cambio de sede y sincronización corporativa.

Los rechazos que ocurren antes de poder resolver la sede se registran como
`branch.context.denied`, sin copiar el ID solicitado. Las rutas directas de
adjuntos, comprobantes, documentos, recibos, opiniones e integración de
métricas materializan la sede en la columna, no solamente dentro de JSON.

## Lectura y privacidad

`/sigeco/auditoria` consulta por defecto únicamente `(scope=branch,
branchCode=sucursal activa)`. Dirección conserva auditoría operativa local. La
vista de plataforma es separada y solo aparece para una identidad con
`platformRole=super_admin`; tener un rol operativo con `audit_read` no basta.

La consulta de interfaz selecciona únicamente los campos mostrados y excluye
`context`. Por ello sus filtros de personas, acciones y entidades tampoco se
construyen con filas de otra sede.

La continuidad transversal de médicos y enfermería deja un evento especial con
actor, paciente, sede solicitante, sedes de origen y motivo. No se guardan
diagnósticos, tratamientos, notas ni contenido de adjuntos en el log.

## Migraciones y reconciliación

- `20260911180000_module_audit_scope` agrega el enum, las columnas, índices,
  relaciones y el `CHECK`. Clasifica automáticamente solo acciones globales
  definidas o eventos que ya contienen un `branchCode` válido y verificable.
- `20260911190000_harden_module_audit_scope` falla mientras quede un evento
  ambiguo; luego hace obligatorios `AuditEvent.scope` y
  `ModuleActivationEvent.branchCode` y valida relaciones y `CHECK`.
- `pnpm branch:reconcile:audit` es dry-run por defecto, emite checksum y
  plantilla. El `apply` exige que cada hallazgo tenga una decisión exacta.
- Los 13 eventos legacy de módulos pueden atribuirse manualmente a una sede o
  clasificarse como evidencia histórica global. La segunda opción los preserva
  como `module.activation.legacy` antes de retirar la fila operativa sin sede.

No se ejecutó ninguna migración, reconciliación ni escritura sobre datos
reales.

## Archivos principales

- `prisma/schema.prisma`
- `prisma/migrations/20260911180000_module_audit_scope/migration.sql`
- `prisma/migrations/20260911190000_harden_module_audit_scope/migration.sql`
- `scripts/reconcile-module-audit-scope.ts`
- `src/modules/audit/append.ts`
- `src/modules/audit/service.ts`
- `src/modules/audit/queries.ts`
- `src/modules/database/queries/modules.ts`
- `src/app/(internal)/sigeco/(app)/auditoria/page.tsx`

## Validación

- `pnpm typecheck` ✅
- `pnpm lint` ✅
- Detector: todos los modelos clasificados; sin excepción nullable pendiente de
  la Tarea 14.
- Node local: advertencia por versión 24; el proyecto declara Node 22.

