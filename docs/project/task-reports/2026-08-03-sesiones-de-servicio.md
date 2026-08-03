# Tarea 5 (Dashboard del médico) — Sesiones De Servicio (Sueroterapia, Ozonoterapia)

Fecha: 2026-08-03. Entorno modificado: código en `develop`. Incluye migración
Prisma aditiva **aplicada** en local (`20260803200000_service_session_packages`).
Iniciativa: [Dashboard del médico](../sigeco-medico-dashboard/tasks.md).
Depende de las Tareas 1-4.

Aplica el modo de ejecución vigente: se implementó y se corrieron **lint y
typecheck**; QA de navegador (gstack), pruebas y build quedan pendientes para el
cierre acumulado.

## Objetivo

Manejar servicios de varias sesiones (sueroterapia, ozonoterapia) a lo largo de
varias visitas: definir sesiones y precio, consumirlas cuando el paciente vuelve
y ver cuántas se pagaron, usaron y quedan.

## Resultado

- **Paquete de sesiones (`ServiceSessionPackage` + `ServiceSessionUse`):** se crea
  cuando un servicio por sesiones se **paga y se deriva a Enfermería** (Tarea 4).
  Guarda paciente, servicio, visita de origen, pedido, venta, modo de precio,
  total de sesiones, usadas y **precios en fotografía** (no cambian al editar el
  catálogo).
- **Dos modos de precio en el pedido:** al elegir un servicio con sesiones, el
  médico elige **Paquete** (varias sesiones, el precio se precarga del precio de
  paquete) o **Sesión individual** (precio por sesión). El modo se guarda por
  línea (`DoctorOrderLine.pricingMode`). El total de sesiones = sesiones del
  paquete (modo paquete) o cantidad (modo sesión).
- **Consumo por sesión en Enfermería:** en la tarea de Enfermería aparece
  "Sesiones de servicio del paciente" con las sesiones usadas/restantes y un
  botón "Registrar sesión n/N". Cada registro crea un `ServiceSessionUse` con la
  visita actual (**cada sesión cuenta como una visita**), descuenta del paquete y
  lo marca **completado** al llegar al total. No permite consumir de más.
- **Visibilidad:** la ficha del paciente muestra "Sesiones de servicio" con
  pagadas, usadas y restantes por paquete; Enfermería ve lo mismo al aplicar.
- **Sin cambio retroactivo:** los precios y el total del paquete son una
  fotografía tomada al pagar; editar el catálogo no los altera.

## Criterios de aceptación

- **Un paciente con sueroterapia puede volver y registrar cada sesión:** consumo
  por visita desde Enfermería contra el paquete activo del paciente.
- **Se ve cuántas se pagaron, usaron y quedan:** en Enfermería y en la ficha del
  paciente.
- **El costo no cambia retroactivamente:** precios en fotografía en el paquete.

## Archivos

Esquema y datos:

- `prisma/schema.prisma`: enums `ServiceSessionPricingMode`,
  `ServiceSessionPackageStatus`; `DoctorOrderLine.pricingMode`; modelos
  `ServiceSessionPackage` y `ServiceSessionUse`; relaciones en Patient, Visit,
  ServiceCatalogItem, InternalUser, DoctorOrder y Sale.
- `prisma/migrations/20260803200000_service_session_packages/migration.sql`
  (aplicada).
- `src/modules/database/queries/service-sessions.ts`:
  `getPatientServiceSessionPackages`, `getActivePatientServiceSessionPackages`,
  `consumeServiceSession` y su error tipado.
- `src/modules/database/queries/doctor-orders.ts`: `pricingMode` por línea y por
  opción; creación del paquete en `releaseDoctorOrderToNursing`.

Feature y UI:

- `src/features/service-sessions/labels.ts` y `service-session-actions.ts`
  (`consumeServiceSessionAction`, permiso `nursing_write`).
- `src/features/doctor-orders/...`: `pricingMode` en el schema, el parser y el
  constructor (selector Paquete / Sesión individual con precarga de precio).
- `src/app/(internal)/sigeco/(app)/enfermeria/[workItemId]/page.tsx`: panel de
  sesiones con registro por sesión y avisos.
- `src/app/(internal)/sigeco/(app)/recepcion/pacientes/[id]/page.tsx`: sección
  "Sesiones de servicio" (pagadas/usadas/restantes).
- `src/app/(internal)/sigeco/(app)/consultas/[visitId]/page.tsx`: props del
  constructor con precios de paquete/sesión y `pricingMode`.

## Decisiones técnicas

- El paquete se crea al **derivar a Enfermería** (Tarea 4), donde la venta ya está
  pagada; así "sesiones pagadas" es real y respeta el pago previo.
- El consumo se hace por paciente (paquete activo), no por tarea, para que las
  visitas de retorno puedan registrar la siguiente sesión.
- Precios en fotografía (`packagePriceCents`/`sessionPriceCents`/`totalPaidCents`)
  para no alterar historia al editar el catálogo.

## Validación

- `pnpm lint`: aprobado.
- `pnpm typecheck` / `tsc --noEmit`: aprobado.
- Migración aplicada en local y tablas verificadas.

## Pendientes (cierre acumulado)

- QA de navegador (gstack): comprar un paquete de suero, derivar a Enfermería,
  registrar varias sesiones en visitas distintas, ver restantes llegar a 0 y el
  paquete completarse; modo sesión individual; responsive 390/768/1024/1280/1440.
- Flujo de **retorno del paciente** para sesiones siguientes (Recepción crea la
  visita y deriva a Enfermería): validar el recorrido completo.
- `pnpm test`, `pnpm run build` en el cierre acumulado.

## Commit Sugerido

`feat(sigeco): track service sessions across visits`
