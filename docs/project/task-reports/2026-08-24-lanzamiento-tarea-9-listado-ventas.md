# Tarea 9: listado y búsqueda de ventas

## Fecha

2026-08-24

## Objetivo

Encontrar una venta anterior sin conocer su identificador. Hasta ahora solo se
llegaba a una venta desde la ficha del cliente o desde los cobros del día: una
venta de la semana pasada era inalcanzable salvo que alguien tuviera el enlace.

Plan: [Lanzamiento por etapas](../sigeco-lanzamiento-por-etapas/tasks.md).

## Cambios Implementados

### Consultas

`getSalesPage`, `countSales` y `getSalesPageTotals` en
`src/modules/database/queries/sales.ts`, con la misma condición compartida:
cliente, estado, rango de fechas y sucursal.

La búsqueda es **del cliente**, no de la venta: reutiliza `patientSearchWhere`,
así que sirve nombre, teléfono, código interno y alias de una ficha fusionada.
Quien atiende recuerda a la persona, no el número de la venta.

`getSalesPage` trae los primeros tres conceptos de cada venta más la cantidad
total. Alcanza para reconocerla en la fila sin cargar el detalle completo de
cada una.

`getSalesPageTotals` suma sobre el **conjunto filtrado**, no sobre la página
visible. Sumar solo lo que se ve daría un número distinto al pasar de página y
haría dudar del sistema.

### Pantalla

`/sigeco/administracion/ventas`:

- Tres indicadores del conjunto filtrado: vendido, cobrado y saldo, con aviso
  cuando queda algo por cobrar.
- Filtros por cliente, estado y fecha, en un formulario simple que conserva lo
  elegido y viaja en la URL.
- Móvil en tarjetas y escritorio en tabla, con fecha, cliente, conceptos,
  total, saldo, estado y quién la registró.
- Paginación que conserva los filtros activos.

Entrada nueva: "Ventas" en el encabezado de `/sigeco/administracion`.

Una venta sin visita se marca como **Mostrador**, para distinguir de un vistazo
la venta directa de la que vino de una atención.

### Los estados salen del modelo

El plan hablaba de "pendiente, con saldo, pagada". En el modelo eso se traduce a
cuatro estados que conviene no mezclar:

| Filtro | Estado real | Qué significa |
| --- | --- | --- |
| Sin cobrar | `pending` | No se cobró nada todavía |
| Con saldo | `partial` | Se cobró una parte |
| Pagadas | `paid` | Sin saldo |
| Anuladas | `cancelled` | No cuenta como venta |

Juntar "pendiente" y "con saldo" en un solo filtro habría escondido justo la
diferencia que Administración necesita para saber a quién reclamar.

## Decisiones

### Fechas por período, no por rango libre

Hoy, últimos 7 días, últimos 30 días o cualquier fecha, con 30 días por defecto.
Es la misma convención que ya usa Recepción, se opera con un toque en el
teléfono y evita el problema de un rango mal escrito. Si Dirección necesita un
rango exacto para cerrar un mes, conviene resolverlo en el reporte
correspondiente y no en la pantalla operativa.

### Filtrado por sucursal activa

El listado respeta la sucursal del contexto, igual que el resto de
Administración. Una venta de El Alto no aparece mirando Cochabamba.

## Validación

- `pnpm typecheck`: sin errores.
- `npx eslint src scripts --max-warnings=0`: sin errores.
- Pruebas unitarias: 479 en total, 474 aprobadas (los cinco fallos previos de
  siempre).
- **Verificación real contra la base de desarrollo**, con las seis ventas que ya
  existen ahí:
  - la página de cinco listó cinco y el conteo total dio seis
  - los conceptos mostraron los primeros y la cantidad real (`(4)` en una venta
    de cuatro ítems)
  - `totales del listado: {"totalCents":165500,"paidCents":133500,"balanceCents":32000}`
    coincidió exactamente con la suma directa de la tabla
  - la búsqueda por nombre encontró la venta correcta
  - los filtros por estado devolvieron 1 con saldo y 4 pagadas
- Integración escrita y no ejecutada, en `sales.integration.test.ts`: búsqueda
  por nombre y por teléfono, separación entre sin cobrar y pagada, totales del
  conjunto, coincidencia con el detalle de la venta, conceptos resumidos,
  paginación por fecha y aislamiento por sucursal.

## Pendientes

- QA de navegador, en particular que la tabla no desborde a 390 px: cierre
  acumulado (Tarea 12). La tabla ya vive dentro de `RecordTable`, que es el
  contenedor con scroll propio que se usa en el resto del sistema, y en móvil se
  muestran tarjetas en lugar de la tabla; falta confirmarlo mirando.
- Exportar el listado no está en alcance de esta tarea ni del plan.
