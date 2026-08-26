# Tarea 8: venta directa sin visita

## Fecha

2026-08-24

## Objetivo

Que Administración inicie una venta por su cuenta, sin esperar la derivación de
un médico. Es el segundo bloqueo de la Etapa 1: la bandeja de Administración se
alimenta solo de `VisitWorkItem`, así que sin médicos derivando arrancaba vacía y
no había otra puerta de entrada.

Plan: [Lanzamiento por etapas](../sigeco-lanzamiento-por-etapas/tasks.md).

## Cambios Implementados

### Casi todo ya existía y no estaba conectado

`createSaleOrderAction`, `createSaleOrderRecord` y `AdministrationChargeDialog`
llegaron en el commit `5668da9` y **no tenían ningún consumidor**. La acción ya
contemplaba el caso sin tarea administrativa y el esquema ya aceptaba `visitId` y
`workItemId` vacíos. El trabajo de esta tarea fue armar el recorrido, no
reescribir la venta.

Tampoco se tocó la Caja: el cobro y el recibo siguen ocurriendo en el detalle de
la venta, con el mismo formulario, el mismo `OpenCashSessionCallout` y la misma
emisión de comprobante que usa cualquier otra venta.

### El recorrido

`/sigeco/administracion/ventas/nueva` en dos pasos:

1. **A quién se le vende:** búsqueda por nombre, teléfono o código, con acceso
   directo a registrar un cliente nuevo (Tarea 7).
2. **Qué se le vende:** el selector de conceptos con el catálogo de servicios y
   tratamientos, los productos del inventario vendibles de la sucursal activa y
   la opción de texto libre, con precio editable y descuento.

La venta queda pendiente y el recorrido sigue en su detalle, donde se cobra en
Caja y se emite el recibo.

Entradas nuevas: "Nueva venta" en el encabezado de `/sigeco/administracion` y en
la ficha del cliente, que abre el paso 2 directamente con ese cliente.

### El error vuelve a donde estaba el trabajo

`createSaleOrderAction` mandaba sus errores a `/sigeco/administracion` cuando no
había tarea administrativa, y esa pantalla no muestra mensajes de error: el
usuario habría vuelto al panel sin saber qué pasó. Ahora el error vuelve a
`/sigeco/administracion/ventas/nueva?cliente=…`, con el cliente ya elegido y el
motivo explicado: conceptos inválidos, stock insuficiente o producto no
disponible.

## Decisiones

### No se duplicó nada de venta ni de Caja

El descuento de stock, el rollback por stock insuficiente, el cálculo del total
en servidor, la idempotencia por clave y el registro en Caja son los mismos de
siempre. Una venta de mostrador y una venta derivada del médico son la misma
`Sale`; lo único que cambia es que una tiene `visitId` y la otra no.

### El cliente se elige antes de armar la venta

Poner el buscador dentro del selector de conceptos habría mezclado dos
decisiones distintas en un solo modal. Separarlo en dos pasos también permite
llegar desde la ficha del cliente sin repetir la búsqueda.

## Validación

- `pnpm typecheck`: sin errores.
- `npx eslint src scripts --max-warnings=0`: sin errores.
- Pruebas unitarias: 479 en total, 474 aprobadas (los cinco fallos previos de
  siempre).
- **Verificación real contra la base de desarrollo**, creando y borrando una
  venta de prueba:
  - `visitId: null | workItemId: null`
  - total `13000` sobre `15000` con `2000` de descuento, calculado en servidor
  - el reintento con la misma clave devolvió la misma venta y quedó una sola
- Integración escrita y no ejecutada, en `sales.integration.test.ts`: la venta se
  registra sin visita ni tarea, el reintento no duplica, y el cobro deja el
  movimiento de Caja con `visitId` nulo.

## Pendientes

- QA de navegador del recorrido completo —elegir cliente, armar conceptos,
  cobrar, imprimir recibo— en móvil y escritorio: cierre acumulado (Tarea 12).
  Es lo que más falta: el recorrido se verificó por consola y por pruebas, no
  usándolo.
- Encontrar una venta anterior sigue siendo la Tarea 9: hoy solo se llega a ella
  desde la ficha del cliente o desde los cobros del día.
- El tope de descuento por producto se valida en el pedido del médico. Una venta
  de mostrador aplica el descuento que Administración escribe, con su propio
  permiso; si Dirección quiere el mismo tope acá, conviene tratarlo aparte.
