# Ajuste — Cobro de Enfermería (pago previo) consistente con Administración

Fecha: 2026-08-04. Entorno: código en `develop`. **Sin migración**. Afecta la
pantalla de cobro de estudios/servicios de Enfermería en Administración
(`/sigeco/administracion/[workItemId]`, rama `isPaidStudyOrder`). Continúa el
[Dashboard del médico](../sigeco-medico-dashboard/tasks.md) y el ajuste previo
[Administración: resumen, descuento y recibo](2026-08-03-admin-resumen-descuento-recibo.md).

Aplica el modo de ejecución vigente: se corrieron **lint y typecheck**; QA de
navegador, pruebas y build quedan para el cierre acumulado.

## Motivo (feedback de Dirección)

El cobro del flujo de **Derivar a enfermería (pago previo)** seguía con el
formulario simple: no mostraba el resumen detallado, ni descuento, ni recibo,
mientras que el flujo de **Confirmar pedido del médico** (Administración) ya los
tenía. Se pidió dejar ambas pantallas consistentes.

Nota de diseño del flujo: en Enfermería la **venta ya está creada** en el modal
del médico (`createPaidStudyOrder`), así que el descuento aquí **edita la venta
existente** (total/saldo/estado), no es un descuento previo a crearla.

## Resultado

En la tarjeta "Cobro de estudios / servicios":

- **Resumen detallado**: lista numerada "Estudios y servicios a realizar"
  (descripción, tipo y cantidad `× n`) tomada de los ítems de la venta. Sin costo
  por unidad. Bloque de totales (Total / Pagado / Saldo).
- **Descuento de Administración**: checkbox "Aplicar descuento" + campo (solo
  números con 2 decimales) que, al enviarse, **recalcula la venta** existente. El
  descuento se acota al **saldo pendiente** (no puede dejar el total por debajo de
  lo ya pagado) y es aditivo sobre el descuento previo. Si el total queda en 0, la
  venta pasa a `paid` y se puede enviar a Enfermería sin cobro.
- **Recibo térmico**: botón "Imprimir recibo" (mismo PDF 80 mm: ítems + cantidad +
  total) también en esta pantalla.

## Alcance técnico

- `src/modules/database/queries/sales.ts`: nueva `applyAdminDiscountToSale`
  (transacción; acota al saldo; recalcula total/saldo/estado).
- `src/features/sales/schemas/sale.schema.ts`: `applySaleDiscountSchema`.
- `src/features/sales/actions.ts`: `applySaleDiscountAction` (permiso
  `sales_write`, auditada, revalida y redirige con aviso).
- `src/features/sales/components/SaleDiscountForm.tsx` (nuevo): checkbox + campo +
  "Aplicar descuento" (cliente).
- `src/app/(internal)/sigeco/(app)/administracion/[workItemId]/page.tsx`: resumen
  detallado, totales, `SaleDiscountForm`, botón de recibo y aviso
  `descuento-aplicado`.

Sin cambios de esquema ni migración. El recibo reutiliza la ruta y el generador
térmico ya existentes (`/sigeco/api/sales/[saleId]/recibo`).

## Validación

- `pnpm lint` y `tsc --noEmit`: aprobados.

## Pendientes (cierre acumulado)

- QA de navegador: aplicar descuento (parcial y total) y verificar total/saldo;
  cobrar y enviar a Enfermería; imprimir recibo; responsive.
- `pnpm test`, `pnpm run build`.

## Commit Sugerido

`feat(sigeco): consistent nursing charge screen — summary, discount, receipt`
