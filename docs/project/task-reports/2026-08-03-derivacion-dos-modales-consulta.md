# Ajuste — Consulta: "Derivar al paciente" con dos modales

Fecha: 2026-08-03. Entorno: código en `develop`. **Sin migración**. Afecta la
pantalla de Consulta (`/sigeco/consultas/[visitId]`) y el flujo de derivación de
las Tareas 2, 4 y 8 del [Dashboard del médico](../sigeco-medico-dashboard/tasks.md).

Aplica el modo de ejecución vigente: se corrieron **lint y typecheck**; QA de
navegador, pruebas y build quedan para el cierre acumulado.

## Motivo (feedback de Dirección)

La tarjeta "Pedido para Administración" (constructor grande de líneas) era
demasiada interfaz y su nombre confundía. Se pidió: **dos botones** de derivación
—a Enfermería y a Administración— cada uno con su **modal**, un solo **descuento
total**, y menos elementos en pantalla.

## Resultado

- Se reemplazó el constructor inline por una tarjeta **"Derivar al paciente"** con
  **dos acciones**:
  - **Derivar a enfermería** (modal): lista **estudios + servicios que se
    ejecutan en Enfermería** (resonancia, sueroterapia, ozono, nebulización,
    curación, inyectable). Al enviar crea la **orden de cobro a Administración
    (pago previo)**; tras el pago, Administración lo envía a Enfermería. Los
    servicios con sesiones generan su **paquete de sesiones**.
  - **Derivar a administración** (modal): lista **tratamientos + productos +
    consultas/servicios no clínicos**. Al enviar crea el pedido que
    Administración confirma y cobra.
- **Reparto automático** por regla: Enfermería = estudios + servicios
  `requiresNursing`; Administración = tratamientos (siempre) + servicios no
  clínicos + productos.
- **Un descuento total** por orden, acotado al tope (suma de umbrales por
  producto); en el modal de administración se reparte automáticamente entre las
  líneas respetando el tope de cada una.
- Se quitó el botón suelto de estudios de "Salida del paciente" (ahora vive en la
  tarjeta de derivación). Debajo de los botones se muestra un **resumen compacto**
  del pedido a Administración (estado y líneas), en solo lectura.

## Alcance técnico (reutiliza los backends existentes)

- **Enfermería**: se extendió `createPaidStudyOrder` y `releasePaidStudiesToNursing`
  para aceptar, además de estudios, **servicios `requiresNursing`** (crea órdenes
  clínicas `study`/`nursing_application`, ítems de venta `study`/`service`, y
  **paquetes de sesión** para los servicios con sesiones). La pantalla de
  Administración detecta ambos (estudios y servicios) para el cobro + envío a
  Enfermería.
- **Administración**: nuevo modal `AdministrationOrderDialog` que envía al
  `saveDoctorOrderAction` existente (Tarea 2-3); el confirmar/cobrar de
  Administración (panel de Tarea 3) sigue igual. Se **relajó** el envío del pedido
  para que no exija la consulta finalizada (igual que el flujo de enfermería), de
  modo que ambas derivaciones estén disponibles durante la atención.
- Sin cambios de esquema; los paquetes de sesión se crean al generar la orden de
  enfermería.

## Archivos

- `src/app/(internal)/sigeco/(app)/consultas/[visitId]/page.tsx`: tarjeta
  "Derivar al paciente" con los dos modales y el reparto; se quitó el
  constructor inline y el botón de estudios de "Salida del paciente".
- `src/features/doctor-orders/components/AdministrationOrderDialog.tsx` (nuevo).
- `src/features/doctor-orders/components/DoctorOrderBuilder.tsx` (eliminado).
- `src/modules/database/queries/doctor-orders.ts`: el envío del pedido ya no
  exige consulta finalizada.
- `src/modules/database/queries/paid-studies.ts`: acepta servicios de enfermería
  y crea paquetes de sesión.
- `src/app/(internal)/sigeco/(app)/administracion/[workItemId]/page.tsx`:
  detección y textos de "Cobro de estudios / servicios".
- `src/components/internal/PaidStudyOrderDialog.tsx`: recibe estudios + servicios.

## Validación

- `pnpm lint`: aprobado. `pnpm typecheck` / `tsc --noEmit`: aprobado.
- Reparto verificado con los datos de demostración (enfermería vs. administración).

## Pendientes (cierre acumulado)

- QA de navegador: derivar a enfermería (estudio y suero con sesiones) y a
  administración (tratamiento y productos), verificar cobro y envío a enfermería;
  descuento total con tope; responsive.
- `pnpm test`, `pnpm run build`.

## Mejoras de UX del modal (2ª iteración)

A pedido de Dirección, ambos modales se pulieron:

- **Tarjeta clicable**: se toca cualquier parte del cuadrante (o Tab+Enter/Espacio)
  para seleccionar/agregar el ítem; la tarjeta seleccionada muestra **borde
  primario + check**. Solo los inputs de cantidad/precio no propagan el clic.
- **Layout en fila**: `check → nombre → costo`. El costo se muestra siempre (vista
  del médico/super admin); al seleccionar aparecen **cantidad** y **precio
  editable**. Aplica a ambos modales.
- **Precio por línea editable** (visible solo para el médico) y **Total
  editable**: el total arranca con la suma de productos y se puede **subir o
  bajar**; si se editan las líneas, se recalcula (con opción "recalcular").
- **Descuento con checkbox**: al marcar "Aplicar descuento" aparece el textbox;
  el descuento se **limita a la suma de umbrales** (tope). Total a cobrar = total
  − descuento.
- **Administración no ve costos por producto**: el pedido llega con **detalle +
  cantidad + total**, sin precio por producto. Los costos por línea solo los ve
  el **médico** (y super admin). Se aplicó en el panel de confirmación, en la
  venta (`/administracion/ventas/[saleId]`) y se calcula el total en el servidor.
- El panel de Administración ya **no aprueba/rechaza descuento**: el médico fija
  el total y el descuento (con tope); Administración solo **confirma y cobra**.

Cambios de datos: `DoctorOrder.chargeBaseCents` (total editable) y
`orderDiscountCents` (descuento a nivel de orden, con tope). El flujo de
enfermería (`createPaidStudyOrder`) también acepta total editable y descuento con
tope. Migración `20260803230000_doctor_order_editable_total` (aplicada).

## Commit Sugerido

`feat(sigeco): improve derivation modals — clickable cards, editable total, hidden costs`
