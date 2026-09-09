# Tarea 4: Herramientas De Backfill Y Reconciliación

## Fecha

2026-09-09.

## Objetivo

Disponer de un mecanismo único, determinista y seguro para asignar tenencia a
datos históricos sin inventar una sucursal ni exponer información sensible en
los reportes.

## Cambios Implementados

- Se creó un motor de reconciliación reutilizable que clasifica cada ID técnico
  como `resuelto`, `ambiguo`, `huérfano` o `inconsistente`.
- La derivación acepta únicamente evidencia tipada desde visita, venta, sesión
  de Caja, compra, lote o membresía.
- Los reportes contienen conteos antes/después, checksums SHA-256 estables,
  cantidad de escrituras y los IDs técnicos pendientes con sus candidatas; la
  estructura no admite nombres, contactos ni contenido clínico.
- Se agregó un formato versionado de decisiones manuales. Valida dominio, IDs
  duplicados, registros existentes y códigos disponibles de `ClinicBranch`.
- El modo predeterminado es `dry-run`. La escritura exige `--apply` y
  `--confirm=APPLY_BRANCH_RECONCILIATION`, y ocurre dentro de una transacción
  serializable con verificación del checksum proyectado.
- Se añadió un gate `--assert-ready` que falla mientras permanezca cualquier
  fila no resuelta; las tareas de dominio deben pasarlo antes de ejecutar `SET
  NOT NULL`.
- El primer adaptador reconcilia asignaciones históricas de usuarios usando
  solo ID, rol y membresías. Puede ejecutarse antes o después de la migración de
  la Tarea 3 y nunca consulta correo, nombre ni credenciales.
- Se documentaron el flujo operativo, el formato de decisiones, la protección
  de escritura y los límites del adaptador.

## Decisiones Técnicas

- No se creó una tabla global de decisiones ni se agregó un default de
  sucursal. Los archivos manuales permanecen fuera de la base hasta que el
  operador ejecuta explícitamente el backfill.
- El reporte no incluye timestamp para que la misma instantánea produzca el
  mismo JSON y checksum en ejecuciones repetidas.
- Los superadministradores quedan fuera del adaptador manual porque su acceso a
  todas las sedes operables es una regla explícita de plataforma de la Tarea 3,
  no una inferencia histórica.
- Los adaptadores de operaciones se incorporarán al expandir cada dominio en
  las Tareas 5–13. La infraestructura no adelantó columnas, permisos ni flujos
  de esos módulos.

## Archivos Principales

- `src/features/branches/reconciliation.ts`
- `src/features/branches/reconciliation.test.ts`
- `scripts/reconcile-branch-ownership.ts`
- `docs/operations/reconciliacion-tenencia-sucursales.md`
- `package.json`

## Validación

- `pnpm lint`: aprobado.
- `pnpm typecheck`: aprobado. Incluyó generación Prisma/Payload/Next,
  TypeScript y detector de tenencia para los 100 modelos.
- Se añadieron pruebas unitarias para clasificación, determinismo, decisiones,
  validación de sucursales y bloqueo de `NOT NULL`; conforme a la política del
  repositorio, no se ejecutaron en esta tarea.
- No se ejecutó el backfill ni se modificó una base de datos.
- El entorno mostró una advertencia porque usa Node `v24.19.0` y el proyecto
  declara Node 22; no afectó las verificaciones.

## Pendientes

- Cada tarea de dominio debe agregar su adaptador con relaciones verificables,
  ejecutar el dry-run sobre el entorno correspondiente y resolver manualmente
  los IDs pendientes antes de endurecer su esquema.
- Las pruebas, migraciones desde cero, build y QA acumulado se reservan para la
  Tarea 17.

**Commit sugerido:** `feat(sigeco): add branch ownership reconciliation tooling`
