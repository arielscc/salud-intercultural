# Tarea: Compra Múltiple Y Alta De Productos

## Fecha

2026-09-07

## Objetivo

Permitir que Administración registre desde una sola pantalla productos de uno
o varios proveedores y dé de alta productos que todavía no existen en
Inventario.

## Cambios Implementados

- La captura de `/sigeco/compras/nueva` mueve el proveedor a cada línea y
  permite agregar hasta cien productos en una sesión.
- Las líneas se agrupan automáticamente por proveedor y se crean en una única
  transacción de base de datos.
- Cada producto puede conservar varios proveedores asociados; el proveedor de
  la compra queda asociado obligatoriamente.
- Una línea puede seleccionar un producto existente o crear uno nuevo con
  código, SKU, nombre, descripción, categoría, unidad, uso, precio, costo
  referencial y stock mínimo.
- Los productos nuevos aparecen en Inventario con stock cero. Solo la recepción
  aumenta el saldo de la sucursal y crea lotes y movimientos.
- Se conservan las barreras de idempotencia y se migran los borradores locales
  del formato anterior de un proveedor al formato nuevo por línea.
- Los documentos y egresos urgentes comunes se limitan a capturas de un solo
  proveedor para no asignar evidencia o dinero a la compra equivocada.

## Archivos Modificados

- `src/app/(internal)/sigeco/(app)/compras/nueva/page.tsx`
- `src/app/(internal)/sigeco/(app)/compras/page.tsx`
- `src/features/mobile-resilience/purchase-draft.ts`
- `src/features/mobile-resilience/purchase-draft.test.ts`
- `src/features/purchases/actions.ts`
- `src/features/purchases/components/PurchaseDraftForm.tsx`
- `src/features/purchases/components/PurchaseError.tsx`
- `src/features/purchases/schemas/purchase.schema.ts`
- `src/features/purchases/schemas/purchase.schema.test.ts`
- `src/modules/database/queries/inventory.ts`
- `src/modules/database/queries/purchases.ts`
- `src/modules/database/queries/purchases.integration.test.ts`
- `docs/operations/product-catalog-suppliers.md`
- `docs/operations/purchases-receipts-batches-stock.md`
- `docs/project/sigeco-lanzamiento-por-etapas/progress.md`
- `docs/project/task-reports/README.md`

## Decisiones Técnicas

- Se conserva una compra contable por proveedor y se agrupan automáticamente
  las líneas. Esto evita repetir formularios sin perder conciliación de pagos,
  saldos, documentos, lotes y devoluciones.
- El alta de productos, sus asociaciones y todos los borradores de compra se
  realizan dentro de la misma transacción: un error no deja productos sueltos.
- No se aumenta stock al guardar el borrador. La recepción continúa siendo la
  fuente única de entradas compradas.
- No se agregó una tabla nueva ni se modificó el esquema de Prisma.

## Validación

- `pnpm lint`: aprobado.
- `pnpm typecheck`: aprobado.
- `git diff --check`: aprobado.
- Pruebas unitarias, integración, build y QA de navegador: no ejecutados en
  esta tarea; corresponden al cierre acumulado según `CLAUDE.md`.
- El equipo local usa Node 24 y el proyecto declara Node 22; pnpm mantuvo la
  advertencia de engine ya conocida.

## Pendientes

- Activar `inventario` y `compras` en la sucursal donde se vaya a probar.
- Ejecutar las pruebas agregadas y el recorrido de navegador en el cierre
  acumulado.

## Fase Relacionada

V3.6 Inventario y Etapa 1 de Caja y Administración.
