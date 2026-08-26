# Tarea 4 (Dashboard del médico) — Suero Y Servicio Con Pago Previo Antes De Enfermería

Fecha: 2026-08-03. Entorno modificado: código en `develop`. Incluye migración
Prisma aditiva **aplicada** en local (`20260803180000_doctor_order_nursing_release`).
Iniciativa: [Dashboard del médico](../sigeco-medico-dashboard/tasks.md).
Depende de las Tareas [2](./2026-08-03-medico-arma-pedido.md) y
[3](./2026-08-03-administracion-confirma-cobra.md).

Aplica el modo de ejecución vigente: se implementó y se corrieron **lint y
typecheck**; QA de navegador (gstack), pruebas y build quedan pendientes para el
cierre acumulado.

## Objetivo

Que el suero y los servicios ejecutados en Enfermería (sueroterapia,
ozonoterapia) se **paguen antes** de derivarse a Enfermería, con la orden e
indicaciones del médico.

## Resultado

- **Marca de "se ejecuta en Enfermería":** el catálogo (Tarea 1) gana el campo
  `requiresNursing` (checkbox en el formulario de la oferta). Los servicios como
  suero/ozono se marcan así.
- **Snapshot por línea:** al armar el pedido (Tarea 2), cada línea guarda
  `requiresNursing` resuelto **desde la base** (no del cliente).
- **Pago previo:** el pedido pasa por Administración (Tarea 3) que confirma y
  cobra. Solo cuando la venta del pedido está **totalmente pagada** aparece
  "Pago confirmado · Enviar a Enfermería".
- **Derivación con orden e indicaciones:** al enviar, se crea la tarea de
  Enfermería y una `ClinicalOrder` (`nursing_application`) por cada línea de
  suero/servicio, con el título y las **indicaciones del médico** (nota de línea
  o indicaciones generales), y la visita pasa a `in_nursing`. Enfermería lo ve en
  su bandeja.
- **No llega sin pago:** si la venta tiene saldo, el envío se bloquea
  (`payment-required` → aviso "Cobra el saldo antes de enviar a Enfermería") y se
  ofrece el cobro del saldo en la misma tarjeta.
- **Trazabilidad orden → cobro → ejecución:** el pedido enlaza con la venta
  (Tarea 3) y guarda `nursingReleasedAt` + `nursingWorkItemId`; la derivación es
  **idempotente** (reintentar no duplica la tarea de Enfermería).
- **Reemplazo del camino directo:** en la consulta se quitó `serum` de la
  derivación directa a Enfermería; el suero se ordena por el pedido con pago
  previo. Las tareas de Enfermería no facturables (signos, aplicaciones) siguen
  disponibles.
- Al confirmar un pedido con suero/servicio, la tarea administrativa **no se
  cierra** hasta la derivación, y se vuelve a la tarea (no a la venta) para cobrar
  el saldo y enviar a Enfermería.

## Criterios de aceptación

- **Un suero/servicio no llega a Enfermería sin estar pagado:** bloqueo por saldo
  y derivación solo con balance 0.
- **Enfermería ve las indicaciones del médico:** órdenes clínicas con título y
  detalle en la tarea de Enfermería.
- **Trazabilidad orden → cobro → ejecución:** pedido ↔ venta ↔ tarea de
  Enfermería, con marca de derivación e idempotencia.

## Archivos

Esquema y datos:

- `prisma/schema.prisma`: `requiresNursing` en `ServiceCatalogItem` (+ versión) y
  `DoctorOrderLine`; `nursingReleasedAt` y `nursingWorkItemId` en `DoctorOrder`.
- `prisma/migrations/20260803180000_doctor_order_nursing_release/migration.sql`
  (aplicada).
- `src/modules/database/queries/service-catalog.ts`: `requiresNursing` en
  create/update y snapshot de versión.
- `src/modules/database/queries/doctor-orders.ts`: `requiresNursing` en las
  opciones y snapshot por línea; `releaseDoctorOrderToNursing` (idempotente, exige
  pago) y su error tipado.
- `src/modules/database/queries/sales.ts`: `confirmDoctorOrderSale` devuelve
  `requiresNursing` y no cierra la tarea si el pedido va a Enfermería.

Feature y UI:

- `src/features/service-catalog/...`: schema, action y formulario con el checkbox
  "Se ejecuta en Enfermería".
- `src/features/doctor-orders/doctor-order-actions.ts`:
  `releaseDoctorOrderToNursingAction` (permiso `visits_update`).
- `src/features/sales/actions.ts`: redirección según `requiresNursing`.
- `src/app/(internal)/sigeco/(app)/administracion/[workItemId]/page.tsx`: tarjeta
  "Suero / servicio a Enfermería" (cobro de saldo o envío) y avisos.
- `src/app/(internal)/sigeco/(app)/consultas/[visitId]/page.tsx`: `serum` fuera de
  la derivación directa.

## Validación

- `pnpm lint`: aprobado.
- `pnpm typecheck` / `tsc --noEmit`: aprobado.
- Migración aplicada en local y columnas verificadas.

## Pendientes (cierre acumulado)

- QA de navegador (gstack): marcar una oferta como de Enfermería, armar pedido con
  suero, confirmar/cobrar, intentar enviar con saldo (bloqueo), cobrar el resto y
  enviar; verificar que Enfermería recibe orden e indicaciones; reintento
  idempotente; responsive 390/768/1024/1280/1440.
- Prueba de permisos (`visits_update`) y casos límite (pedido sin líneas de
  Enfermería).
- `pnpm test`, `pnpm run build` en el cierre acumulado.

## Commit Sugerido

`feat(sigeco): require payment before nursing serum`
