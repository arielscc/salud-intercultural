# Tarea: V3.4 Administracion, Ventas Y Cobros

## Fecha

2026-05-30

## Objetivo

Implementar la fase V3.4 para registrar ventas, cobros, formas de pago, movimientos de caja y pendientes administrativos asociados a paciente y visita.

## Cambios Implementados

- Se agregaron modelos Prisma para ventas, items de venta, pagos, metodos de pago, productos entregados y movimientos de caja.
- Se agrego la migracion `20260530004000_v3_4_admin_sales_payments`.
- Se ampliaron permisos internos con `sales_read`, `sales_write` y `payments_write`.
- Se habilito al rol `administracion` para leer/escribir ventas y cobros sin permisos clinicos ni de estudios.
- Se habilito a `direccion` para leer ventas y reportes.
- Se agregaron labels y schemas Zod para ventas, items, pagos, formas de pago y montos.
- Se agrego query module `sales.ts` con bandeja administrativa, creacion de venta, registro de pago, comprobante y resumen de ventas.
- Se agregaron Server Actions para crear ventas y registrar pagos.
- Se crearon pantallas mobile-first:
  - `/sigeco/administracion`
  - `/sigeco/administracion/[workItemId]`
  - `/sigeco/administracion/ventas/[saleId]`
- Se actualizo la navegacion interna de Sigeco para incluir caja/administracion.
- Se agrego resumen basico de ventas del dia, ventas del mes y saldo pendiente.
- Se agrego comprobante interno simple por venta.
- Se agrego cronologia administrativa dentro del detalle del paciente.
- Se agregaron tests unitarios para permisos y schemas de ventas.
- Se agrego prueba de integracion para totales, estados, pagos, movimientos de caja y cronologia administrativa.
- Se aplico la migracion en la base local `salud_intercultural_dev`.

## Archivos Modificados

- `prisma/schema.prisma`
- `prisma/migrations/20260530004000_v3_4_admin_sales_payments/migration.sql`
- `src/components/internal/InternalShell.tsx`
- `src/features/internal-auth/permissions.ts`
- `src/features/internal-auth/permissions.test.ts`
- `src/features/sales/actions.ts`
- `src/features/sales/labels.ts`
- `src/features/sales/schemas/sale.schema.ts`
- `src/features/sales/schemas/sale.schema.test.ts`
- `src/modules/database/queries/sales.ts`
- `src/modules/database/queries/sales.integration.test.ts`
- `src/modules/database/queries/patients.ts`
- `src/modules/database/queries/clinical-care.integration.test.ts`
- `src/modules/database/queries/nursing-studies.integration.test.ts`
- `src/modules/database/queries/patients-visits.integration.test.ts`
- `src/app/(internal)/sigeco/(app)/administracion/page.tsx`
- `src/app/(internal)/sigeco/(app)/administracion/[workItemId]/page.tsx`
- `src/app/(internal)/sigeco/(app)/administracion/ventas/[saleId]/page.tsx`
- `src/app/(internal)/sigeco/(app)/pacientes/[id]/page.tsx`
- `docs/project/task-reports/2026-05-30-v3-4-administracion-ventas-cobros.md`

## Decisiones Tecnicas

- Los montos se almacenan como enteros en centavos para evitar errores de precision y recalcular totales en servidor.
- La UI envia precio unitario, cantidad, descuento y cobro inicial, pero `createSaleRecord` recalcula subtotal, total, pagado, saldo y estado.
- Los metodos de pago se modelan como tabla `PaymentMethod` y la migracion crea metodos base: efectivo, QR, tarjeta, transferencia y otro.
- Los cobros crean `Payment` y `CashMovement` en la misma transaccion.
- Una venta pagada completamente marca como completada la tarea administrativa asociada.
- La relacion con inventario queda preparada mediante `DeliveredProduct`, pero el descuento real de stock queda para V3.6.

## Validacion

- `pnpm test`: paso. 16 archivos, 47 tests.
- `pnpm lint`: paso.
- `pnpm typecheck`: paso.
- `pnpm test:integration`: paso fuera del sandbox. 6 archivos, 6 tests.
- `pnpm run build`: paso.
- `pnpm db:migrate`: paso fuera del sandbox y aplico `20260530004000_v3_4_admin_sales_payments` en la base local.

## Pendientes

- Probar manualmente `/sigeco/administracion`, `/sigeco/administracion/[workItemId]` y `/sigeco/administracion/ventas/[saleId]` en mobile.
- Definir formato fiscal/externo si se requiere comprobante imprimible formal.
- Conectar `DeliveredProduct` con inventario en V3.6.
