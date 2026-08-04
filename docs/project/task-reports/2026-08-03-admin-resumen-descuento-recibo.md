# Ajuste — Administración: resumen detallado, descuento y recibo térmico

Fecha: 2026-08-03. Entorno: código en `develop`. **Sin migración**. Afecta la
confirmación del pedido del médico en Administración
(`/sigeco/administracion/[workItemId]`), la venta
(`/sigeco/administracion/ventas/[saleId]`) y el cobro
(`confirmDoctorOrderSale`). Parte del [Dashboard del médico](../sigeco-medico-dashboard/tasks.md).

Aplica el modo de ejecución vigente: se corrieron **lint y typecheck**; QA de
navegador, pruebas y build quedan para el cierre acumulado.

## Motivo (feedback de Dirección)

Administración debe recibir un **resumen completo y detallado** de los productos y
servicios que se entregan al paciente (bien presentado, con el total, pero **sin el
costo por unidad**, que es exclusivo del médico). Además pidió: un **campo de
descuento** al final del total (checkbox, 0 Bs por defecto) que aplica
Administración, y poder **generar un recibo pequeño en PDF** ideal para
**impresora térmica** para entregarlo al paciente.

Decisiones confirmadas: el descuento de Administración **se resta del total del
médico**; el recibo muestra **ítems + cantidad + total** (sin precio por unidad) y
se genera **después de cobrar**. La opción de **eliminar productos** del pedido
(con registro en la ficha) queda **para una tarea aparte**.

## Resultado

- **Resumen detallado** en el panel de confirmación (`DoctorOrderConfirmPanel`):
  lista numerada "Productos y servicios a entregar" con nombre, tipo y cantidad
  (`× n`), pensada para que Administración sepa qué entregar. Sin costo por
  producto. Bloque de totales: total del pedido, descuento (si aplica) y **total a
  cobrar**.
- **Descuento de Administración**: checkbox "Aplicar descuento" que muestra un
  campo (0 Bs por defecto, sólo números con 2 decimales). Se **resta del total del
  médico** y nunca deja el total en negativo. Se envía al confirmar.
- **Recibo térmico (PDF 80 mm)**: botón "Imprimir recibo" en la venta que abre un
  PDF generado con `pdf-lib`, de ancho fijo 80 mm y alto según el contenido:
  encabezado de la clínica, fecha, paciente, **detalle a entregar (ítem +
  cantidad)**, **TOTAL**, pagado y saldo. Sin precio por unidad. Se puede imprimir
  directo en térmica o guardar como PDF (`?purpose=download`).

## Alcance técnico

- `src/features/sales/schemas/sale.schema.ts`: `confirmDoctorOrderSchema` acepta
  `discount` (opcional, dinero).
- `src/features/sales/actions.ts`: `confirmDoctorOrderSaleAction` pasa
  `adminDiscountCents`.
- `src/modules/database/queries/sales.ts`: `confirmDoctorOrderSale` combina
  descuento del médico + descuento de Administración (acotados al subtotal;
  `discountCents = médico + admin`).
- `src/features/doctor-orders/components/DoctorOrderConfirmPanel.tsx`: rediseño del
  resumen + checkbox de descuento + totales (cliente).
- `src/app/(internal)/sigeco/(app)/administracion/[workItemId]/page.tsx`: se
  corrigió el cálculo de `doctorOrderTotalCents` (ya no depende del tope, que se
  eliminó antes) y se actualizó el texto del panel.
- `src/modules/sales/thermal-receipt.ts` (nuevo): generador del PDF térmico.
- `src/app/(internal)/sigeco/api/sales/[saleId]/recibo/route.ts` (nuevo): ruta que
  emite el PDF (permiso `sales_read`, auditada, `inline`/`attachment`).
- `src/app/(internal)/sigeco/(app)/administracion/ventas/[saleId]/page.tsx`: botón
  "Imprimir recibo".

Sin cambios de esquema ni migración.

## Validación

- `pnpm lint` y `tsc --noEmit`: aprobados.

## Pendientes (cierre acumulado)

- QA de navegador: confirmar pedido con y sin descuento de Administración; imprimir
  recibo térmico (impresora/`Guardar como PDF`); responsive.
- `pnpm test`, `pnpm run build`.
- **Tarea aparte**: eliminar productos del pedido en Administración (paciente no
  los quiere) con registro en la ficha del paciente para que el médico lo vea.

## Commit Sugerido

`feat(sigeco): admin order summary, discount and thermal receipt`
