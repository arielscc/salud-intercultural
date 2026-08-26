# Tarea 2 (Dashboard del médico) — El Médico Arma El Pedido En La Consulta

Fecha: 2026-08-03. Entorno modificado: código en `develop`. Incluye migración
Prisma aditiva **aplicada** en la base local (`20260803140000_doctor_order`).
Iniciativa: [Dashboard del médico](../sigeco-medico-dashboard/tasks.md).
Depende de la [Tarea 1](./2026-08-03-catalogo-servicios-tratamientos.md).

Aplica el modo de ejecución vigente: se implementó y se corrieron **lint y
typecheck**; QA de navegador (gstack), pruebas y build quedan pendientes para el
cierre acumulado.

## Objetivo

Que el médico seleccione servicios, tratamientos y productos con precio y
descuento y arme un pedido estructurado que se envía a Administración, **sin
crear la venta ni el cobro** (eso es Tarea 3).

## Resultado

- **Pedido estructurado (`DoctorOrder` + `DoctorOrderLine`)**, uno por visita,
  con estados `draft` → `submitted` → `confirmed` (Tarea 3) / `cancelled`.
- **Selector en la consulta:** el médico agrega líneas desde el catálogo
  (Servicios / Tratamientos) o del inventario (Productos), o escribe un ítem de
  **texto libre**. Al elegir del catálogo se precargan descripción, precio y el
  tope de descuento de la línea.
- **Precio predefinido editable y descuento por línea**, con cantidad y, cuando
  el servicio lo admite, número de sesiones.
- **Tope de descuento (regla dura):** el descuento total del pedido **no puede
  superar la suma de los umbrales** de descuento máximo de los productos
  incluidos. El tope por línea se resuelve **en el servidor** desde la base
  (producto: `maxDiscountCents`; tratamiento: suma de sus componentes; servicio:
  `ownMaxDiscountCents`; texto libre: 0). Si el descuento excede el tope, el
  guardado se rechaza (`discount-over-cap`) y la UI ya lo advierte y deshabilita
  los botones. Un descuento dentro del tope sí se permite; su validación cuando
  el paciente lo pide es de Administración (Tarea 3).
- **No cobra:** guardar o enviar el pedido **no crea Sale ni Payment**. "Enviar a
  Administración" solo marca el pedido como `submitted` (requiere la consulta
  finalizada) y lo deja disponible para que Administración lo confirme y cobre.
- **Indicaciones** generales del pedido para Administración / Enfermería.
- La pantalla de consulta muestra el estado del pedido (chip) y, cuando el médico
  ya no puede editar, un resumen de solo lectura de las líneas.

## Alcance y decisiones

- **Reemplazo de la "Instrucción para Administración" de texto libre:** el pedido
  estructurado es el mecanismo nuevo y se ubica en su propia tarjeta en la
  consulta. El flujo actual de "Resultado de la propuesta" (aceptar/derivar) se
  conserva sin cambios en esta tarea; **conectar el consumo del pedido en
  Administración (convertirlo en venta y cobrar) es la Tarea 3**, que también
  decidirá cómo se sustituye del todo la instrucción de texto libre.
- El tope nunca se confía al cliente: se recalcula en servidor con los umbrales
  vigentes al guardar y se guarda como snapshot por línea (`maxDiscountCents`).
- Permiso: `clinical_write` (médico) para armar/enviar; el selector usa el
  catálogo (`service_catalog_read`) y el inventario (`inventory_read`), que el
  médico ya tiene. Todas las escrituras generan auditoría append-only.

## Archivos

Esquema y datos:

- `prisma/schema.prisma`: enums `DoctorOrderStatus`, `DoctorOrderLineSource`;
  modelos `DoctorOrder` y `DoctorOrderLine`; relaciones en `Visit`, `Patient`,
  `InternalUser`, `ServiceCatalogItem` e `InventoryItem`.
- `prisma/migrations/20260803140000_doctor_order/migration.sql` (aplicada).
- `src/modules/database/queries/doctor-orders.ts`: `getDoctorOrderByVisit`,
  `getDoctorOrderOptions`, `saveDoctorOrder` (resuelve topes y valida el
  descuento total) y `DoctorOrderError`.

Feature y UI:

- `src/features/doctor-orders/schemas/doctor-order.schema.ts`.
- `src/features/doctor-orders/doctor-order-actions.ts`.
- `src/features/doctor-orders/labels.ts`.
- `src/features/doctor-orders/components/DoctorOrderBuilder.tsx` (constructor).
- `src/features/doctor-orders/components/DoctorOrderError.tsx`.
- `src/app/(internal)/sigeco/(app)/consultas/[visitId]/page.tsx`: nueva tarjeta
  "Pedido para Administración" (constructor o resumen), mensajes de error/aviso.

## Validación

- `pnpm lint`: aprobado.
- `pnpm typecheck` / `tsc --noEmit`: aprobado.
- Migración aplicada en local (`prisma migrate deploy`) y tablas verificadas.

## Pendientes (cierre acumulado)

- QA de navegador (gstack): armar pedido con varias líneas (catálogo + producto +
  texto libre), editar precio/descuento/cantidad/sesiones, superar el tope y ver
  el bloqueo, guardar borrador y enviar a Administración; responsive 390/768/1024/
  1280/1440.
- Prueba de permisos permitidos y denegados (médico vs. otros roles).
- Semilla de catálogo para probar el selector con datos reales.
- `pnpm test`, `pnpm run build` en el cierre acumulado.
- **Tarea 3:** Administración recibe el pedido `submitted`, valida el descuento,
  crea la venta y cobra.

## Commit Sugerido

`feat(sigeco): let doctor build treatment orders`
