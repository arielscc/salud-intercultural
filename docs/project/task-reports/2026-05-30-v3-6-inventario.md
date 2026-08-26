# Tarea: V3.6 Inventario

## Fecha

2026-05-30

## Objetivo

Implementar la fase V3.6 para gestionar productos, stock, movimientos append-only, alertas de stock bajo y descuento automatico desde ventas inventariables.

## Cambios Implementados

- Se agregaron modelos Prisma para proveedores, productos de inventario, movimientos, ajustes y alertas.
- Se agrego la migracion `20260530006000_v3_6_inventory`.
- Se ampliaron permisos internos con `inventory_read`, `inventory_write` e `inventory_adjust`.
- Se habilito a administracion para leer/escribir inventario operativo sin ajustes manuales autorizados.
- Se habilito a direccion para leer inventario y reportes de stock bajo.
- Se limito `inventory_adjust` a `super_admin`.
- Se agregaron labels y schemas Zod para productos, entradas y ajustes.
- Se agrego query module `inventory.ts` con creacion de producto, movimientos append-only, entradas, ajustes autorizados, resumen y consulta de stock bajo.
- Se agregaron Server Actions para crear productos, registrar entradas y registrar ajustes autorizados.
- Se crearon pantallas mobile-first:
  - `/sigeco/inventario`
  - `/sigeco/inventario/[itemId]`
- Se actualizo la navegacion interna de Sigeco para incluir inventario.
- Se agrego selector de producto inventariable en ventas administrativas.
- Se conecto `SaleItem.inventoryItemId` con descuento automatico de stock desde venta.
- Se crea `DeliveredProduct` y `InventoryMovement` cuando una venta descuenta inventario.
- Se agrego indicador de productos con stock bajo en el dashboard interno.
- Se agregaron tests unitarios para permisos y schemas de inventario.
- Se agrego prueba de integracion para movimientos, stock calculado, alertas y descuento automatico por venta.
- Se aplico la migracion en la base local `salud_intercultural_dev`.

## Archivos Modificados

- `prisma/schema.prisma`
- `prisma/migrations/20260530006000_v3_6_inventory/migration.sql`
- `src/components/internal/InternalShell.tsx`
- `src/features/internal-auth/permissions.ts`
- `src/features/internal-auth/permissions.test.ts`
- `src/features/inventory/actions.ts`
- `src/features/inventory/labels.ts`
- `src/features/inventory/schemas/inventory.schema.ts`
- `src/features/inventory/schemas/inventory.schema.test.ts`
- `src/features/sales/actions.ts`
- `src/features/sales/schemas/sale.schema.ts`
- `src/modules/database/queries/inventory.ts`
- `src/modules/database/queries/inventory.integration.test.ts`
- `src/modules/database/queries/sales.ts`
- `src/modules/database/queries/clinical-care.integration.test.ts`
- `src/modules/database/queries/follow-ups.integration.test.ts`
- `src/modules/database/queries/nursing-studies.integration.test.ts`
- `src/modules/database/queries/patients-visits.integration.test.ts`
- `src/modules/database/queries/sales.integration.test.ts`
- `src/app/(internal)/sigeco/(app)/page.tsx`
- `src/app/(internal)/sigeco/(app)/administracion/[workItemId]/page.tsx`
- `src/app/(internal)/sigeco/(app)/inventario/page.tsx`
- `src/app/(internal)/sigeco/(app)/inventario/[itemId]/page.tsx`
- `docs/project/task-reports/2026-05-30-v3-6-inventario.md`

## Decisiones Tecnicas

- `InventoryItem.currentStock` se mantiene transaccionalmente, y cada cambio queda respaldado por un `InventoryMovement` append-only.
- Las ventas descuentan stock solo si el item de venta referencia `inventoryItemId`.
- Si una venta excede stock disponible, `applyInventoryMovement` bloquea la transaccion con `INSUFFICIENT_STOCK`.
- Las alertas de stock bajo se abren cuando `currentStock <= minimumStock` y se resuelven automaticamente cuando el stock supera el minimo.
- Los ajustes manuales se registran en `InventoryAdjustment` y tambien generan un `InventoryMovement` de tipo `authorized_manual_adjustment`.
- No se edita historial de movimientos desde UI; todo ajuste se registra como nuevo movimiento.

## Validacion

- `pnpm test`: paso. 18 archivos, 54 tests.
- `pnpm lint`: paso.
- `pnpm typecheck`: paso.
- `pnpm test:integration`: paso fuera del sandbox. 8 archivos, 9 tests.
- `pnpm run build`: paso.
- `pnpm db:migrate`: paso fuera del sandbox y aplico `20260530006000_v3_6_inventory` en la base local.

## Pendientes

- Probar manualmente `/sigeco/inventario` y `/sigeco/inventario/[itemId]` en mobile.
- Agregar proveedores desde UI cuando se defina el flujo de compras.
- Mejorar el manejo visible de error cuando una venta intenta exceder stock disponible.
