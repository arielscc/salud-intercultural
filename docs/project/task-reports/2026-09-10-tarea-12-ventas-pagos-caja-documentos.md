# Tarea 12 — Ventas, pagos, Caja y documentos

Fecha: 2026-09-10  
Estado: implementada; migraciones y diagnóstico preparados, no ejecutados.

## Resultado

Ventas, pagos y evidencia monetaria quedan vinculados de forma directa a la
sucursal activa:

- `Sale`, `SaleItem`, `Payment` y `DeliveredProduct` usan relaciones compuestas
  con expediente, visita, trabajo, pedido, producto y medio de pago locales.
- `CashMovement`, `CashSessionReconciliation`, `CashExpense` y sus beneficiarios
  materializan la sede y se relacionan con la sesión y movimientos de esa misma
  sede.
- Los cobros y descuentos bloquean la venta por `(id, branchCode)` antes de
  calcular saldos. Una sesión de Caja ajena no puede cobrar ni registrar un
  egreso o corrección.
- Cierres, aprobaciones, listados y agregaciones monetarias requieren siempre
  `branchCode`; se retiraron los parámetros opcionales y el valor fijo de El
  Alto.
- Los reintentos idempotentes rechazan una coincidencia perteneciente a otra
  sucursal.

## Documentos y comprobantes

`GeneratedDocument` incorpora `branchCode` obligatorio y relaciones compuestas
con expediente, visita, receta, venta y versión anterior. La numeración nueva
incluye la sede y las unicidades de número, serie/versión y huella de fuente se
particionan por sucursal.

La emisión, anulación, restauración, consulta, impresión y descarga resuelven el
documento dentro de la sucursal autenticada. Un ID válido de otra sede se trata
como no encontrado. El snapshot sigue siendo append-only; la sede también es
inmutable.

## Migraciones y diagnóstico

- `20260911140000_sales_cash_documents_branch_scope` agrega columnas, deriva
  sedes solo desde padres inequívocos y prepara índices y claves compuestas sin
  retirar todavía las relaciones históricas.
- `20260911150000_harden_sales_cash_documents_branch_scope` bloquea nulos,
  fuentes cruzadas y referencias monetarias inconsistentes; luego vuelve las
  columnas obligatorias, retira relaciones simples y protege la propiedad de
  sucursal.
- El cierre tiene una segunda defensa en PostgreSQL: antes de cambiar a cerrado
  o pendiente de aprobación comprueba que la conciliación de efectivo y QR
  coincide con los movimientos de la misma sesión y sucursal.
- `pnpm branch:reconcile:cash` es un diagnóstico de solo lectura. Reporta solo
  IDs técnicos, un checksum, filas sin sede, cruces y totales financieros que no
  concilian. Deliberadamente no ofrece `--apply`: la evidencia monetaria nunca
  se reescribe automáticamente.

No se ejecutó ninguna migración, reconciliación ni escritura sobre datos reales.
Todo hallazgo bloquea el endurecimiento y exige investigación humana.

## Cobertura de aceptación preparada

- Un cobro de Cochabamba no puede usar una venta o Caja de El Alto.
- Un documento de otra sucursal no se obtiene aunque se conozca su ID.
- El cierre solo considera movimientos relacionados con su sesión y sede.
- Las pruebas de integración existentes reciben la sede explícita y contienen
  casos de rechazo entre sucursales. Por política del proyecto no se ejecutaron;
  quedan para la validación acumulada de la Tarea 17.

## Validación

- `pnpm typecheck` ✅
- `pnpm lint` ✅
- Detector: 112 modelos clasificados; deuda temporal de código: 0. Los 11
  modelos todavía pendientes corresponden a tareas posteriores.
