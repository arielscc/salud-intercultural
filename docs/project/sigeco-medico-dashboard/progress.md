# Progress — Dashboard Del Médico

Última actualización: 2026-08-03.

Plan de ejecución: [tasks.md](./tasks.md)

## Estado General

Plan creado el 2026-08-03 a partir de las reglas operativas del médico. Ninguna
tarea implementada todavía; este documento captura el alcance, el análisis de
brechas y las decisiones confirmadas por Dirección.

## Resumen

| Estado | Cantidad |
| --- | ---: |
| Pendiente | 4 |
| En progreso | 4 |
| Terminada | 0 |

## Estado Por Tarea

| # | Tarea | Prioridad | Estado | Dependencias |
| --- | --- | --- | --- | --- |
| 1 | Catálogo de servicios y tratamientos | P0 | En progreso | Ninguna |
| 2 | El médico arma el pedido en la consulta | P0 | En progreso | 1 |
| 3 | Administración confirma, valida descuento y cobra | P0 | En progreso | 2, Caja (plan integral 18) |
| 4 | Suero y servicio con pago previo antes de Enfermería | P1 | En progreso | 2-3 |
| 5 | Sesiones de servicio | P1 | Pendiente | 1-4 |
| 6 | Historial del paciente en la consulta | P1 | Pendiente | 1-3 |
| 7 | Seguimiento estricto por compra | P1 | Pendiente | 3, 6 |
| 8 | Catálogo administrable de estudios | P2 | Pendiente | 1 |

## Análisis De Brechas (2026-08-03)

Estado del código al crear el plan:

- 🟢 Ordenar estudios con precio y derivar a pago (existe; catálogo hardcodeado).
- 🟢 Abandono en consulta con motivo (existe).
- 🟢 Indicaciones al derivar a otra área (existe, básico).
- 🟢 El médico elige productos/servicios con precio y descuento (implementado en
  la Tarea 2, 2026-08-03: pedido estructurado con tope duro de descuento; el cobro
  sigue siendo de Administración en la Tarea 3).
- 🟢 Suero pagado antes de Enfermería (implementado en la Tarea 4, 2026-08-03:
  `requiresNursing` + derivación solo con la venta pagada; `serum` fuera de la
  derivación directa).
- 🔴 Historial entre visitas: tratamientos y costos previos y precarga de receta
  (no existe: la consulta solo carga la visita actual).
- 🟠 Seguimiento estricto por compra (existe creación de seguimientos, falta el
  bloqueo por venta registrada).
- 🟢 Catálogo administrable de servicios y tratamientos (implementado en la
  Tarea 1, 2026-08-03; pendiente el cierre acumulado de QA/pruebas/build).

## Decisiones Vigentes

- **Cobro:** el médico arma el pedido (servicios, tratamientos, productos) con
  precio y descuento; **Administración confirma y cobra** en Caja. El médico no
  maneja dinero.
- **Catálogo:** los servicios (sueroterapia, ozonoterapia, etc.) y los
  tratamientos (conjuntos de productos) viven en un **catálogo nuevo, separado
  de Productos**. Nada hardcodeado; siempre hay opción de texto libre.
- **Descuento:** cada **producto** lleva un **umbral de descuento máximo** que
  **solo Dirección y Super administrador** pueden editar. El descuento que aplica
  el médico **no puede superar la suma** de los umbrales de los productos del
  pedido (tope duro). Un Tratamiento toma como tope la suma de sus productos; un
  Servicio sin productos lleva su propio umbral. Administración **valida**
  (aprueba o rechaza) el descuento aplicado cuando el paciente lo pide, antes de
  cobrar.
- **Sesiones:** los servicios definen número de sesiones y precio; el costo puede
  definirse en el catálogo **o** en la primera visita / al asignar las sesiones.
  Hay **precio por paquete** (mayor descuento) y **por sesión individual**
  (descuento similar o menor). **Cada sesión cuenta como un número de visita.**
- **Suero/servicio:** se paga antes de ejecutarse; Administración deriva a
  Enfermería con la orden e indicaciones después del cobro.
- **Seguimiento (#6):** el médico solo puede agendar seguimiento (fecha, hora y
  motivo, hacia Recepción) si existe una **venta registrada** en la visita.
- **Historial:** una atención puede tener **1 a n reconsultas**, todas
  registradas; el médico ve un **resumen de cada consulta** (diagnóstico,
  tratamiento/servicio, costo, sesiones) y la receta rápida se precarga desde la
  consulta anterior (vacía en la primera visita).

## Decisiones Pendientes De Confirmar

- Resuelto (2026-08-03): el umbral de descuento máximo por producto lo definen
  **Dirección y Super administrador**; el médico no puede superar la suma de esos
  umbrales.
- Resuelto (2026-08-03): existen **precio por paquete** (mayor descuento) y
  **por sesión individual** (descuento similar o menor).
- El usuario seguirá agregando reglas; el plan puede crecer.

## Registro

### 2026-08-03 — Creación Del Plan

- Se definieron 8 tareas para el dashboard del médico a partir del análisis de
  brechas y las reglas de Dirección.
- Decisiones confirmadas vía preguntas: modelo de cobro (médico arma, Admin
  cobra), catálogo nuevo de servicios/tratamientos, descuento máximo por oferta
  con validación de Administración, seguimiento estricto por venta, y manejo de
  sesiones con cada sesión como número de visita.

### 2026-08-03 — Tarea 4 Implementada (Suero Con Pago Previo)

- Catálogo marca `requiresNursing` (suero/ozono); el pedido lo guarda por línea.
- Administración solo puede "Enviar a Enfermería" cuando la venta del pedido está
  pagada; crea la tarea de Enfermería con orden e indicaciones y mueve la visita
  a `in_nursing`. Bloqueo por saldo; derivación idempotente
  (`nursingReleasedAt`/`nursingWorkItemId`).
- Se quitó `serum` de la derivación directa en consulta (reemplazo del camino sin
  pago). Migración `20260803180000_doctor_order_nursing_release` (aplicada).
- Estado: **En progreso** (código + lint + typecheck; QA/pruebas/build al cierre
  acumulado).
- Detalle: [reporte de tarea](../task-reports/2026-08-03-suero-pago-previo-enfermeria.md).

### 2026-08-03 — Tarea 3 Implementada (Administración Confirma Y Cobra)

- Panel "Confirmar pedido del médico" en la tarea administrativa: convierte el
  pedido `submitted` en una `Sale` multi-línea y lo enlaza (`Sale.doctorOrderId`).
- Validación de descuento (aprobar/rechazar) auditada con quién y cuándo; el tope
  se revalida en servidor. Cobro inicial en Caja; el saldo se cobra en la venta.
- Idempotente por pedido (no duplica venta ni cobro). La cola de Administración
  marca "Pedido del médico por confirmar".
- Migración aditiva `20260803160000_doctor_order_confirm_sale` (aplicada en local).
- Estado: **En progreso** (código + lint + typecheck listos; QA/pruebas/build al
  cierre acumulado).
- Detalle: [reporte de tarea](../task-reports/2026-08-03-administracion-confirma-cobra.md).

### 2026-08-03 — Tarea 2 Implementada (El Médico Arma El Pedido)

- Pedido estructurado `DoctorOrder` + `DoctorOrderLine` (uno por visita), estados
  `draft`/`submitted`/`confirmed`/`cancelled`. UI nueva "Pedido para
  Administración" en la consulta.
- Selector de servicios/tratamientos (catálogo) y productos (inventario) o texto
  libre; precio predefinido editable y descuento por línea, cantidad y sesiones.
- Tope de descuento **duro** validado en servidor: el descuento total no supera
  la suma de umbrales por producto (`discount-over-cap`). No crea venta ni cobro:
  "Enviar a Administración" solo marca `submitted` (requiere consulta finalizada).
- Migración aditiva `20260803140000_doctor_order` (aplicada en local).
- Estado: **En progreso** (código + lint + typecheck listos; QA/pruebas/build al
  cierre acumulado). Consumo por Administración = Tarea 3.
- Detalle: [reporte de tarea](../task-reports/2026-08-03-medico-arma-pedido.md).

### 2026-08-03 — Tarea 1 Implementada (Catálogo De Servicios Y Tratamientos)

- Catálogo nuevo separado de Productos: modelos `ServiceCatalogItem`,
  `ServiceCatalogComponent` y `ServiceCatalogItemVersion` (append-only), enum
  `ServiceCatalogKind` (service/treatment) y CRUD en `/sigeco/catalogo`.
- Umbral de descuento por producto (`InventoryItem.maxDiscountCents`) editable
  solo por Dirección/Super admin; el tope de un tratamiento es la suma de los
  umbrales de sus productos; los servicios sin productos usan `ownMaxDiscountCents`.
- Permisos nuevos: `service_catalog_read`, `service_catalog_write` y
  `discount_threshold_manage`, con auditoría en todas las escrituras.
- Migración aditiva `20260803120000_service_treatment_catalog` (no aplicada aún).
- Estado: **En progreso** (código + lint + typecheck listos; QA de navegador,
  pruebas y build pendientes para el cierre acumulado, según el modo vigente).
- Detalle: [reporte de tarea](../task-reports/2026-08-03-catalogo-servicios-tratamientos.md).

### 2026-08-03 — Reglas Adicionales De Descuento, Sesiones E Historial

- Umbral de descuento máximo **por producto**, editable solo por Dirección y
  Super administrador; el descuento del médico no puede superar la suma de esos
  umbrales (tope duro). Administración valida el descuento aplicado.
- Precios **por paquete** (mayor descuento) y **por sesión individual**
  (descuento similar o menor).
- Una atención puede tener **1 a n reconsultas**, todas registradas, con
  **resumen de cada consulta** disponible para el médico.
