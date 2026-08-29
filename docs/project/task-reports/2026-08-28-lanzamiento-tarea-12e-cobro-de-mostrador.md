# Tarea 12E: el cobro que se teclea de nuevo

## Fecha

2026-08-28

## Objetivo

Que cobrar en el mostrador no obligue a copiar cifras de una parte de la
pantalla a otra, y que quien elige un producto vea si queda.

Plan: [Lanzamiento por etapas](../sigeco-lanzamiento-por-etapas/tasks.md).

## De Dónde Sale

Revisión de Dirección sobre `/sigeco/administracion/ventas/{id}` con saldo
pendiente. Los tres puntos son de interfaz: ninguno impide operar, y los tres
hacen lento lo que se repite treinta veces al día.

## El Monto Que Ya Estaba En Pantalla

El campo «Monto Bs» de «Registrar nuevo cobro» llevaba el saldo como
`placeholder`. Un `placeholder` no se envía: quien cobra leía el saldo dos
bloques más arriba y lo tecleaba. En el cobro completo —el caso normal— eran
tres pasos para un dato que el servidor ya tenía.

Pasó a `defaultValue`, así que llega escrito y se corrige solo para un pago
parcial. El saldo cubre los dos casos que pidió Dirección: en una venta sin
pagos es igual al total; en una con pagos parciales es lo que falta.

**Un detalle que costaba una línea y habría sido un error de caja:** el input
no es controlado, así que React conserva el valor del DOM aunque el
`defaultValue` cambie. Sin ayuda, después de un pago parcial o de un descuento
el campo seguiría mostrando el saldo viejo — y ese número es el que se cobra.
Lleva `key={sale.balanceCents}`, que lo remonta cuando el saldo cambia.

## El Descuento Que Solo Existía En La Otra Pantalla

Rebajar una venta ya emitida se podía únicamente desde la tarea del pedido del
médico (`/sigeco/administracion/{workItemId}`). En una venta de mostrador no
había dónde: había que crearla de nuevo con otro precio.

No hizo falta lógica nueva. `applySaleDiscountAction` y
`applyAdminDiscountToSale` ya existían, ya auditan como `sale.discount.apply` y
ya acotan el descuento al saldo para no dejar un total negativo. Lo que faltaba
era ofrecerlos. Se reutilizó `SaleDiscountForm` tal cual, con dos ajustes:

- `workItemId` pasó a opcional. La venta de mostrador no nace de una tarea, y
  la acción ya devolvía al detalle de la venta cuando ese campo llega vacío.
- La pantalla ahora muestra el aviso `descuento-aplicado`, que la acción venía
  poniendo en la URL sin que nadie lo leyera.

**La condición que pidió Dirección** —«solo cuando el módulo de Administración
o Caja está activo»— es `canUse(role, moduleAccess, "sales_write",
"administracion")`. Con el módulo suspendido, `resolveModuleAccess` devuelve
`blocked` para todo permiso de escritura, así que el descuento desaparece y la
venta queda en solo lectura, que es la regla del plan.

El formulario va **antes** del de cobro y separado por una línea, no dentro:
son dos `<form>` y anidarlos es HTML inválido. Es el mismo arreglo que ya usa
la pantalla del pedido del médico.

## El Catálogo Que No Decía Cuánto Queda

Al armar un cobro se elegían productos sin ver existencias. La venta se creaba
y **rebotaba después** con `insufficient-stock`: el error llegaba al final, no
al elegir.

`OrderPickerItem` ganó un `stock` opcional. Los cortes son los que fijó
Dirección:

| Existencias | Color | Texto |
| --- | --- | --- |
| 0 | Rojo suave | `Sin stock` |
| 1 a 4 | Rojo suave | `Stock 3 · casi agotado` |
| 5 a 14 | Ámbar suave | `Stock 12 · casi agotado` |
| 15 o más | Sin color | `Stock 40` |

El campo es opcional a propósito: un servicio o un tratamiento no tienen
existencias, y mostrarles `Stock 0` sería afirmar algo falso. Sin `stock`, la
fila no muestra nada.

El tinte de la fila **cede ante el de selección**: una vez elegido el producto,
lo que importa es que se vea elegido. El aviso no se pierde, sigue en su
etiqueta.

El dato ya estaba disponible: `getInventoryItems` devuelve `currentStock` de la
sucursal activa, y la pantalla de venta nueva ya le pasaba `branchCode`. Solo
había que dejarlo llegar hasta el modal.

## Un Control Que Fija Los Cortes

`OrderPickerDialog.test.tsx` (nuevo, 3 pruebas) fija los cortes en 5 y 15,
comprueba los dos bordes exactos —4 va en rojo, 5 en ámbar, 15 ya sin color—,
que un ítem sin stock no muestre nada, y que la selección gane al tinte.

**Se comprobó que puede fallar:** bajando `criticalStock` de 5 a 3, la prueba
del tinte falla con `Expected "bg-error/5" / Received "…bg-warning/5"`. Se
restauró el valor y volvió a verde. Un control que no se ve fallar no prueba
nada.

## Validación

Lint y typecheck sin errores. 24 pruebas en 3 archivos
(`OrderPickerDialog`, `security-boundaries`, `modules/access`), todas en verde.

Verificado contra el servidor local con una sesión de QA y una venta de saldo
`Bs 150,00` creada para la prueba, las dos borradas al terminar:

| Criterio | Resultado |
| --- | --- |
| Monto Bs en una venta con saldo | Llega `value="150.00"`, igual al saldo |
| Bloque de cobro | Ofrece «Aplicar descuento» |
| Venta ya pagada | No ofrece descuento (no hay bloque de cobro) |
| Aviso `descuento-aplicado` | Se muestra |
| `currentStock` hasta el cliente | Llega en el payload de los 20 productos |
| Cortes 0 / 4 / 5 / 12 / 15 / 40 | Los seis, con su color y su texto |
| Servicio sin stock | No muestra etiqueta |

El gate de módulo se apoya en `resolveModuleAccess("super_admin",
suspendedCash, "sales_write") === "blocked"`, que ya cubre `access.test.ts`; no
se suspendió Administración en el entorno local para no cortarle la Caja a
quien lo tiene levantado.

## Lo Que Se Vio Y No Se Tocó

En el detalle de la línea elegida, la cantidad se puede subir por encima del
stock disponible: el tope sigue siendo `maxQuantity`, no las existencias. La
venta rebota igual que antes, con la diferencia de que ahora el aviso está a la
vista al elegir. Cambiarlo es una decisión de negocio —si se permite vender por
encima del stock o no— y no estaba en el alcance de esta tarea.

## Pendientes

- Con esto cierran 12B, 12C, 12D y 12E. Falta lo que la Tarea 12 todavía debe:
  el recorrido operativo completo por navegador contra staging desplegado,
  rotar `STAGING_QA_PASSWORD`, reemplazar el reporte del 2026-08-26 —que sigue
  diciendo que staging no puede arrancar— y el cierre acumulado.
