# Tarea 15 — Barrido completo de aplicación y constraints

Fecha: 2026-09-11  
Estado: implementada; migración y chequeo sobre datos reales no ejecutados.

## Resultado

El barrido acumulado cerró las rutas estructurales residuales que todavía
permitían relacionar operaciones usando solo un ID global:

- el consentimiento reemplazado debe pertenecer al mismo expediente local;
- un movimiento de inventario y su venta o renglón deben compartir sede;
- un paquete de sesiones y su venta deben compartir sede;
- los accesos residuales de compras, lotes, estudios pagados y el ensayo de
  lanzamiento incluyen la sede tanto al buscar como al modificar.

La migración `20260911200000_close_remaining_branch_access_paths` verifica
primero los datos existentes y solo entonces reemplaza las FKs simples por FKs
compuestas. También sustituye la unicidad global de idempotencia por unicidad
local en ventas, pagos, sesiones y movimientos de Caja, egresos, compras,
pagos y recepciones de compra, ajustes y movimientos de lote. Los traslados
quedan particionados por la sede de origen.

## Detector y scripts

El detector de tenencia ahora valida además que:

- toda relación explícita entre dos modelos operativos transporte un campo de
  sede en ambos lados;
- todo `idempotencyKey` operacional forme una clave única con su sede;
- el análisis incluya `src` y scripts ejecutables, sin excepciones temporales.

Se retiraron las omisiones silenciosas de El Alto y Cochabamba de seeds,
verificaciones, ensayos y simulacros. Esos comandos requieren ahora la sede
mediante `STAGE_ONE_BRANCH`, `INTERNAL_ADMIN_BRANCH`, `STAGING_QA_BRANCH`,
`DEMO_PATIENT_BRANCH`, `SYNTHETIC_BRANCH_CODE`, `BACKUP_DRILL_BRANCH` o
`PAYLOAD_SEED_BRANCH_CODES`, según el caso.

## Chequeo SQL acumulado

`pnpm branch:isolation:sql` ejecuta
`scripts/sql/check-branch-isolation.sql`, muestra cada conteo y falla ante un
valor distinto de cero. Cubre:

- columnas de tenencia obligatorias, incluidas sedes de origen y destino;
- contrato de ámbito de auditoría;
- paciente y visita;
- venta, pago, sesión, movimiento y egreso de Caja;
- compra, recepción, líneas, lotes y movimientos de inventario;
- documentos generados, documentos de compra y sus fuentes.

No se ejecutó contra una base porque las reglas del proyecto reservan
migraciones, integración y comprobación de datos para el cierre acumulado de
la Tarea 17.

## Archivos principales

- `prisma/schema.prisma`
- `prisma/migrations/20260911200000_close_remaining_branch_access_paths/migration.sql`
- `scripts/branch-tenancy-check.ts`
- `scripts/check-branch-isolation.ts`
- `scripts/sql/check-branch-isolation.sql`
- `src/modules/database/queries/cash.ts`
- `src/modules/database/queries/inventory.ts`
- `src/modules/database/queries/purchases.ts`
- `src/modules/database/queries/sales.ts`

## Validación

- `pnpm lint` ✅
- `pnpm typecheck` ✅
- Detector: 112 modelos clasificados, 0 excepciones de modelo y 0 excepciones
  de código.
- Node local: advertencia por versión 24; el proyecto declara Node 22.
