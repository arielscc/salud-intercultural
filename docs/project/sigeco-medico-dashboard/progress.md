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
| Pendiente | 8 |
| En progreso | 0 |
| Terminada | 0 |

## Estado Por Tarea

| # | Tarea | Prioridad | Estado | Dependencias |
| --- | --- | --- | --- | --- |
| 1 | Catálogo de servicios y tratamientos | P0 | Pendiente | Ninguna |
| 2 | El médico arma el pedido en la consulta | P0 | Pendiente | 1 |
| 3 | Administración confirma, valida descuento y cobra | P0 | Pendiente | 2, Caja (plan integral 18) |
| 4 | Suero y servicio con pago previo antes de Enfermería | P1 | Pendiente | 2-3 |
| 5 | Sesiones de servicio | P1 | Pendiente | 1-4 |
| 6 | Historial del paciente en la consulta | P1 | Pendiente | 1-3 |
| 7 | Seguimiento estricto por compra | P1 | Pendiente | 3, 6 |
| 8 | Catálogo administrable de estudios | P2 | Pendiente | 1 |

## Análisis De Brechas (2026-08-03)

Estado del código al crear el plan:

- 🟢 Ordenar estudios con precio y derivar a pago (existe; catálogo hardcodeado).
- 🟢 Abandono en consulta con motivo (existe).
- 🟢 Indicaciones al derivar a otra área (existe, básico).
- 🔴 El médico elige productos/servicios con precio y descuento (no existe: hoy
  es texto libre y quien elige es Administración).
- 🟠 Suero pagado antes de Enfermería (hoy va directo a Enfermería sin pago).
- 🔴 Historial entre visitas: tratamientos y costos previos y precarga de receta
  (no existe: la consulta solo carga la visita actual).
- 🟠 Seguimiento estricto por compra (existe creación de seguimientos, falta el
  bloqueo por venta registrada).
- 🔴 Catálogo administrable de servicios y tratamientos (no existe).

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

### 2026-08-03 — Reglas Adicionales De Descuento, Sesiones E Historial

- Umbral de descuento máximo **por producto**, editable solo por Dirección y
  Super administrador; el descuento del médico no puede superar la suma de esos
  umbrales (tope duro). Administración valida el descuento aplicado.
- Precios **por paquete** (mayor descuento) y **por sesión individual**
  (descuento similar o menor).
- Una atención puede tener **1 a n reconsultas**, todas registradas, con
  **resumen de cada consulta** disponible para el médico.
