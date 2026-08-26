# Tarea 3 (Dashboard del médico) — Administración Confirma, Valida Descuento Y Cobra

Fecha: 2026-08-03. Entorno modificado: código en `develop`. Incluye migración
Prisma aditiva **aplicada** en local (`20260803160000_doctor_order_confirm_sale`).
Iniciativa: [Dashboard del médico](../sigeco-medico-dashboard/tasks.md).
Depende de la [Tarea 2](./2026-08-03-medico-arma-pedido.md) y de la Caja del plan
integral (Tarea 18).

Aplica el modo de ejecución vigente: se implementó y se corrieron **lint y
typecheck**; QA de navegador (gstack), pruebas y build quedan pendientes para el
cierre acumulado.

## Objetivo

Convertir el pedido del médico (`DoctorOrder` en estado `submitted`) en una venta
con líneas y su cobro en Caja, con control y auditoría del descuento.

## Resultado

- **Confirmación desde Administración:** en la tarjeta de trabajo administrativo
  (`/sigeco/administracion/[workItemId]`), cuando la visita tiene un pedido
  `submitted`, aparece el panel **"Confirmar pedido del médico"** con las líneas,
  el descuento pedido y el total, en lugar del alta manual de venta.
- **Validación de descuento:** si el médico aplicó descuento, Administración
  **aprueba o rechaza**. Al rechazar se cobra el precio completo. La decisión
  (`discountApproved`, quién y cuándo) se guarda en el pedido y queda **auditada**
  (`sale.doctor_order.confirm`). El descuento nunca supera el tope (suma de
  umbrales por producto); se **revalida en servidor** al confirmar.
- **Venta con varias líneas:** al confirmar se crea **una** `Sale` con un
  `SaleItem` por línea (el descuento total va a nivel de venta), se enlaza
  `Sale.doctorOrderId ↔ DoctorOrder`, visita y tarea, y el pedido pasa a
  `confirmed`. Los productos inventariables descuentan stock y registran
  `DeliveredProduct`, igual que el alta manual.
- **Cobro en Caja idempotente:** admite cobro inicial (requiere Caja abierta) y el
  saldo se cobra luego en la venta. La operación es **idempotente por pedido**
  (`idempotencyKey = doctor-order:<id>`; enlace único `Sale.doctorOrderId`):
  reintentar devuelve la misma venta sin duplicar cobro ni movimientos.
- **Bandeja de Administración:** la cola marca "Pedido del médico por confirmar"
  en las visitas con pedido enviado y aún sin venta.
- Tras confirmar, se redirige a la venta para continuar el cobro del saldo con el
  flujo de pagos existente.

## Criterios de aceptación

- **No existe cobro sin pedido confirmado:** el cobro se hace sobre la venta que
  nace de confirmar el pedido; sin confirmar no hay venta.
- **El descuento queda registrado con quién lo aprobó:** `discountApproved`,
  `discountDecidedById`, `discountDecidedAt` + auditoría append-only.
- **Reintentar no duplica:** idempotencia por pedido y por llaves de pago.

## Archivos

Esquema y datos:

- `prisma/schema.prisma`: `DoctorOrder` gana `discountApproved`,
  `discountDecidedById`/`By`, `discountDecidedAt`, `confirmedAt` y relación
  `sale`; `Sale` gana `doctorOrderId` (único) y relación `doctorOrder`; relación
  inversa en `InternalUser`.
- `prisma/migrations/20260803160000_doctor_order_confirm_sale/migration.sql`
  (aplicada).
- `src/modules/database/queries/sales.ts`: `confirmDoctorOrderSale`
  (idempotente, valida descuento, crea venta multi-línea, cobra), su error
  tipado, y `doctorOrder` incluido en las consultas de la tarea y la cola.

Feature y UI:

- `src/features/sales/schemas/sale.schema.ts`: `confirmDoctorOrderSchema`.
- `src/features/sales/actions.ts`: `confirmDoctorOrderSaleAction` (permiso
  `sales_write`, manejo de errores de Caja/stock/pedido).
- `src/features/doctor-orders/components/DoctorOrderConfirmPanel.tsx`.
- `src/app/(internal)/sigeco/(app)/administracion/[workItemId]/page.tsx`: panel de
  confirmación y mensajes de error nuevos.
- `src/app/(internal)/sigeco/(app)/administracion/page.tsx`: indicador de pedido
  por confirmar en la cola.

## Decisiones técnicas

- El descuento vive a nivel de `Sale` (el modelo `SaleItem` no tiene descuento
  por línea); cada línea se guarda a precio unitario y el descuento total es la
  suma de los descuentos por línea, siempre acotado por el tope.
- La confirmación reutiliza la ruta existente: el pedido se confirma desde la
  tarea administrativa que ya deriva la propuesta aceptada; el saldo se cobra en
  la pantalla de la venta con el flujo de pagos vigente.
- Rechazar el descuento no borra lo que pidió el médico: se conserva en el pedido
  y solo cambia el descuento aplicado a la venta (queda la traza de la decisión).

## Validación

- `pnpm lint`: aprobado.
- `pnpm typecheck` / `tsc --noEmit`: aprobado.
- Migración aplicada en local (`prisma migrate deploy`) y columnas verificadas.

## Pendientes (cierre acumulado)

- QA de navegador (gstack): confirmar pedido con/ sin descuento, aprobar y
  rechazar, cobro inicial con y sin Caja abierta, reintento idempotente, stock
  insuficiente; responsive 390/768/1024/1280/1440.
- Prueba de permisos permitidos y denegados (`sales_write`).
- Caso: pedido enviado sin propuesta aceptada (hoy la tarea administrativa nace de
  la propuesta aceptada). Evaluar en Tarea 4/5 si el envío del pedido debe crear
  también la tarea administrativa.
- `pnpm test`, `pnpm run build` en el cierre acumulado.

## Commit Sugerido

`feat(sigeco): confirm and charge doctor orders`
