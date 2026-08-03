# Tasks — Dashboard Del Médico

Estado: plan creado el 2026-08-03 a partir de las reglas operativas del médico
definidas por Dirección.

Este plan resuelve, en la pantalla de Consulta del médico
(`/sigeco/consultas/[visitId]`) y su soporte, lo que hoy falta para que el
médico arme el pedido del paciente sin manejar dinero. Numeración = orden
recomendado de implementación.

Control de avance: [progress.md](./progress.md)

## Contexto Y Fuentes

- Análisis de brechas contra el código (2026-08-03): estudios pagados ya
  existen; abandono ya existe; faltan el catálogo de servicios/tratamientos, el
  armado del pedido por el médico, el suero con pago previo, el historial entre
  visitas y el seguimiento estricto por compra.
- Pantalla actual: `src/app/(internal)/sigeco/(app)/consultas/[visitId]/page.tsx`.
- Venta y cobro (Administración): `src/features/sales/` y
  `src/modules/database/queries/sales.ts` (ya soporta `unitPrice`, `discount`,
  `quantity`, tipos `treatment`/`service`/`serum`/`product`, y enlaza `visitId`
  y `inventoryItemId`).
- Estudios pagados: `src/modules/database/queries/paid-studies.ts` (catálogo
  hoy hardcodeado).
- Orden clínica / derivación: `createClinicalOrderRecord` en
  `src/modules/database/queries/clinical-care.ts`.
- Propuesta de tratamiento: `src/features/treatment-proposals/`.
- Catálogo de productos y proveedores (Tarea 19 del plan integral):
  `src/modules/database/queries/product-catalog.ts` y guía
  `docs/operations/product-catalog-suppliers.md`.

## Responsabilidades Que El Sistema Debe Respetar

- **Médico:** evalúa, deriva a estudios/valoración, explica el tratamiento y
  **arma el pedido** (servicios, tratamientos, productos) con precio y descuento
  dentro del máximo permitido. Da indicaciones al derivar. Registra el resultado
  de la propuesta y el abandono. **No maneja Caja ni cobra.**
- **Administración:** recibe el pedido del médico, valida el descuento cuando el
  paciente lo pide, confirma y **cobra** en Caja, y deriva a Enfermería una vez
  pagado el suero/servicio.
- **Enfermería:** ejecuta estudios, sueros y aplicaciones **con la orden e
  indicaciones** recibidas, después del pago cuando corresponde.
- **Recepción:** recibe el seguimiento agendado por el médico (fecha, hora y
  motivo) cuando hubo una venta.
- **Dirección:** revisa costos, descuentos y reportes.

## Reglas Para Todas Las Tareas

1. El médico nunca cobra ni abre Caja; arma el pedido y Administración cobra.
2. El dinero se calcula en servidor y se guarda en centavos.
3. Las migraciones son aditivas; no se borra historia clínica ni financiera.
4. Los permisos se validan en servidor para páginas, queries y actions.
5. Las acciones críticas generan auditoría append-only.
6. El catálogo de servicios y tratamientos es administrable; nada de opciones
   hardcodeadas. Siempre existe la opción de texto libre.
7. El **umbral de descuento máximo por producto** solo lo definen **Dirección y
   Super administrador**. El descuento que aplica el médico **no puede superar la
   suma de los descuentos máximos** de los productos del pedido (tope duro).
   Administración **valida** (aprueba o rechaza) el descuento aplicado cuando el
   paciente lo pide, antes de cobrar.
8. Web y móvil comparten negocio, datos y permisos; se valida en 390, 768,
   1024, 1280 y 1440 px.
9. Cada tarea actualiza [progress.md](./progress.md) y su documentación.
10. Modo de ejecución vigente: por tarea se corren solo lint y typecheck; QA de
    navegador, pruebas y build se hacen en el cierre acumulado (ver el plan
    integral).

---

## Tarea 1 — Catálogo De Servicios Y Tratamientos

**Prioridad:** P0. **Responsable:** Administración (Dirección revisa costos).
**Dependencias:** ninguna.

**Objetivo:** administrar desde SIGECO las ofertas vendibles que el médico puede
elegir, sin hardcodear opciones.

**Alcance:**

- Nuevo catálogo separado de Productos (los Productos siguen siendo insumos con
  stock).
- Dos tipos de oferta: **Servicio** (sueroterapia, ozonoterapia, etc.) y
  **Tratamiento** (conjunto de productos vendidos juntos).
- Campos: nombre, categoría, descripción, precio base, estado activo/inactivo y
  versión (como el catálogo de productos).
- **Descuento máximo por producto:** cada producto lleva un umbral de descuento
  máximo que **solo Dirección y Super administrador** pueden editar. Un
  Tratamiento (conjunto de productos) toma como tope la **suma** de los umbrales
  de sus productos componentes. Un Servicio sin productos componentes lleva su
  propio umbral, también editable solo por Dirección/Super administrador.
- Un Tratamiento puede agrupar productos componentes del catálogo de Productos.
- **Precios por paquete o por sesión** en servicios que aplican: el paquete
  admite **mayor descuento**; la sesión individual tiene un descuento **similar
  o menor** (ver Tarea 5).
- Activar/desactivar sin borrar historia; el precio y el umbral históricos de
  ventas no cambian al editar el catálogo.

**Criterios de aceptación:**

- El médico y Administración eligen servicios/tratamientos desde el catálogo.
- No hay opciones hardcodeadas; se pueden crear y editar desde la UI.
- Desactivar una oferta conserva las ventas históricas.

**Commit sugerido:** `feat(sigeco): add services and treatments catalog`

## Tarea 2 — El Médico Arma El Pedido En La Consulta

**Prioridad:** P0. **Responsable:** Médico. **Dependencias:** Tarea 1.

**Objetivo:** que el médico seleccione servicios, tratamientos y productos con
precio y descuento, sin cobrar.

**Alcance:**

- Selector (modal) en la consulta para elegir del catálogo o escribir un ítem
  de **texto libre**.
- Precio **predefinido editable** por línea y campo de **descuento** por línea.
  El descuento total del pedido **no puede superar** la suma de los umbrales de
  descuento máximo de los productos incluidos; el médico no puede pasar ese tope.
- Cantidad y, cuando aplique, número de sesiones.
- El pedido se arma como líneas y se envía a Administración; **no crea la venta
  ni el cobro**. Reemplaza/estructura la actual "Instrucción para
  Administración" de texto libre de la propuesta aceptada.
- El médico registra indicaciones asociadas al pedido cuando corresponde.

**Criterios de aceptación:**

- El médico arma un pedido con varias líneas, precio y descuento.
- El sistema impide superar el descuento máximo sin marcarlo para validación.
- El pedido llega a Administración con todo el detalle; SIGECO no cobra solo.

**Commit sugerido:** `feat(sigeco): let doctor build treatment orders`

## Tarea 3 — Administración Confirma, Valida Descuento Y Cobra

**Prioridad:** P0. **Responsable:** Administración. **Dependencias:** Tareas 2 y
Caja del plan integral (Tarea 18).

**Objetivo:** convertir el pedido del médico en venta y cobro con control de
descuento.

**Alcance:**

- Administración recibe el pedido, lo revisa y confirma.
- **Validación de descuento:** Administración aprueba o rechaza el descuento que
  aplicó el médico cuando el paciente lo pidió; queda auditado. El descuento
  nunca supera el tope (suma de umbrales por producto), que solo definen
  Dirección/Super administrador.
- Al confirmar se crea la venta con líneas, precio y descuento y se cobra en
  Caja (idempotente).
- El detalle enlaza pedido, venta, pago y visita.

**Criterios de aceptación:**

- No existe cobro sin pedido confirmado.
- El descuento sobre el máximo queda registrado con quién lo aprobó.
- Reintentar no duplica la venta ni el cobro.

**Commit sugerido:** `feat(sigeco): confirm and charge doctor orders`

## Tarea 4 — Suero Y Servicio Con Pago Previo Antes De Enfermería

**Prioridad:** P1. **Responsable:** Médico y Administración. **Dependencias:**
Tareas 2-3.

**Objetivo:** que el suero/servicio se pague antes de ejecutarse en Enfermería.

**Alcance:**

- El médico ordena suero/servicio con **indicaciones**.
- La orden requiere **pago previo**: pasa a Administración a cobrar.
- Después del cobro, **Administración deriva a Enfermería** con la orden e
  indicaciones.
- Reemplaza el camino actual de suero que va directo a Enfermería sin pago.

**Criterios de aceptación:**

- Un suero/servicio no llega a Enfermería sin estar pagado.
- Enfermería ve las indicaciones del médico.
- Se conserva la trazabilidad orden → cobro → ejecución.

**Commit sugerido:** `feat(sigeco): require payment before nursing serum`

## Tarea 5 — Sesiones De Servicio (Sueroterapia, Ozonoterapia)

**Prioridad:** P1. **Responsable:** Médico y Administración. **Dependencias:**
Tareas 1-4.

**Objetivo:** manejar servicios de varias sesiones a lo largo de varias visitas.

**Alcance:**

- El servicio define número de sesiones y precio; el **costo de las sesiones
  puede definirse en el catálogo o en la primera visita / al asignar** las
  sesiones.
- **Dos modos de precio:** por **paquete** (varias sesiones, con **mayor
  descuento**) o por **sesión individual** (descuento **similar o menor** al de
  paquete).
- Cada sesión cuenta como una visita (número de sesión = número de visita del
  servicio).
- Registrar y consumir sesiones cuando el paciente vuelve; ver sesiones usadas y
  restantes.

**Criterios de aceptación:**

- Un paciente con sueroterapia puede volver y registrar cada sesión.
- Se ve cuántas sesiones se pagaron, usaron y quedan.
- El costo definido no cambia retroactivamente al editar el catálogo.

**Commit sugerido:** `feat(sigeco): track service sessions across visits`

## Tarea 6 — Historial Del Paciente En La Consulta

**Prioridad:** P1. **Responsable:** Médico. **Dependencias:** Tareas 1-3.

**Objetivo:** que el médico vea el tratamiento y costo previos y no reescriba
desde cero en una reconsulta.

**Alcance:**

- Cargar en la consulta las **visitas anteriores** del paciente: consultas,
  tratamientos/servicios vendidos y su **costo**.
- Una atención puede tener **1 o muchas reconsultas (hasta n)**; **todas quedan
  registradas** y el médico ve un **resumen de cada una** (fecha, diagnóstico,
  tratamiento/servicio, costo y sesiones cuando aplica).
- **Precargar "Receta rápida"** con los medicamentos de la consulta anterior; en
  blanco si es la primera visita.
- Solo lectura del historial; no altera registros previos.

**Criterios de aceptación:**

- En una 2ª, 3ª o n-ésima visita, el médico ve el resumen de cada consulta
  anterior con lo vendido y su costo.
- La receta rápida llega precargada en reconsultas y vacía en la primera vez.
- No se modifican datos de visitas anteriores.

**Commit sugerido:** `feat(sigeco): show patient history in consultation`

## Tarea 7 — Seguimiento Estricto Por Compra

**Prioridad:** P1. **Responsable:** Médico. **Dependencias:** Tareas 3 y 6.

**Objetivo:** que el médico agende seguimiento solo cuando hubo compra.

**Alcance:**

- El médico puede crear un seguimiento (**fecha, hora y motivo**) dirigido a
  **Recepción** únicamente si existe una **venta registrada** de
  tratamiento/servicio en la visita.
- Respeta el consentimiento de contacto vigente.

**Criterios de aceptación:**

- Sin venta registrada, el médico no puede crear el seguimiento.
- El seguimiento llega a Recepción con fecha, hora y motivo.
- Sin consentimiento, se avisa y no se habilita el contacto.

**Commit sugerido:** `feat(sigeco): gate follow-up creation by sale`

## Tarea 8 — Catálogo Administrable De Estudios

**Prioridad:** P2. **Responsable:** Administración. **Dependencias:** Tarea 1.

**Objetivo:** quitar el catálogo de estudios hardcodeado.

**Alcance:**

- Migrar hemograma, resonancia, orina y sus precios al catálogo administrable.
- El médico ordena estudios eligiendo del catálogo, con precio y descuento.
- Conservar el flujo actual: ordenar → pagar en Administración → ejecutar en
  Enfermería.

**Criterios de aceptación:**

- Los estudios se administran sin tocar código.
- El flujo de pago y ejecución sigue funcionando.

**Commit sugerido:** `feat(sigeco): make study catalog manageable`

---

## Reglas Ya Cubiertas Por El Sistema (No Requieren Tarea Nueva)

- **Abandono en consulta con motivo:** existe ("No continuará" en la consulta).
- **Indicaciones al derivar a otra área:** existe (título + detalle); se
  refuerza en la Tarea 4 para el suero con pago previo.
- **Ordenar estudios con precio y derivar a pago:** existe; la Tarea 8 solo
  quita el hardcode.

## Gate De Cierre Por Tarea

Una tarea pasa a `Terminada` cuando cumple sus criterios, tiene migración y
recuperación documentadas si aplica, pasa lint/tipos y (en el cierre acumulado)
pruebas, build y QA, prueba permisos permitidos y denegados, se valida en web y
móvil, y actualiza la documentación y [progress.md](./progress.md).
