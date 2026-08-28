# Tarea 12B: listas invisibles en escritorio

## Fecha

2026-08-28

## Objetivo

Que las dos pantallas nacidas en las Tareas 7 y 8 muestren sus registros en
escritorio, no solo en móvil.

Plan: [Lanzamiento por etapas](../sigeco-lanzamiento-por-etapas/tasks.md).

## El Defecto

`RecordList` lleva `sm:hidden`: existe solo debajo de 640 px. Su par de
escritorio es `RecordTable`, con `hidden sm:block`. Veintiuna pantallas usaban
las dos; **dos usaban solo la primera**, así que desde 640 px no mostraban nada
—ni los registros ni el mensaje de vacío— y sin ningún error que lo delatara.

| Pantalla | Qué desaparecía |
| --- | --- |
| `administracion/ventas/nueva` | El buscador de cliente entero |
| `administracion/clientes/[id]` | La lista de ventas y su mensaje de vacío |

No era estético. En la Etapa 1, Administración vende desde una computadora: con
el buscador vacío, **una venta no se podía iniciar**.

Se descartó que fuera de datos antes de tocar la interfaz: `getPatients` devuelve
el paciente por nombre, teléfono o código interno en las cuatro consultas
probadas. El fallo era de render.

### Por qué nadie lo vio

El patrón lo definieron las Tareas 1 y 2 del plan móvil, cerrado el 2026-07-15;
el plan desktop cerró el 2026-07-16. Estas dos pantallas se escribieron el
2026-08-24, más de un mes después, y ninguna iniciativa cerrada iba a volver a
pasar por ellas. Tampoco había forma automática de notarlo.

## Cambios Implementados

### `administracion/ventas/nueva/page.tsx`

Tabla de escritorio con Cliente, Teléfono y Código. Cada nombre es el enlace que
selecciona al cliente, igual que la card móvil. El estado vacío se repite en la
fila con `colSpan={3}`, reutilizando el `emptySearchMessage` que ya existía.

### `administracion/clientes/[id]/page.tsx`

Tabla de escritorio con Total, Pagado, Saldo, Estado y Fecha; los importes van
alineados a la derecha con `tabular-nums`. El mensaje de vacío estaba escrito
dos veces en JSX suelto: se extrajo a `emptySalesMessage` para que la card y la
tabla no puedan divergir.

Las dos siguen el molde de `administracion/clientes/page.tsx`, que ya tenía el
par completo.

### El control que faltaba

`src/components/internal/ui/record-list-pairing.test.ts` recorre
`src/app/(internal)` y falla nombrando cualquier archivo que use `<RecordList`
sin `<RecordTable`. Distingue `<RecordListEmpty>` con `/<RecordList[\s>]/`.

Una segunda prueba exige al menos veinte pantallas con el par completo, para que
la primera no pase por vacía si algún día el recorrido deja de encontrar
archivos.

**Se verificó que el control falla de verdad:** quitando el bloque
`RecordTable` de `ventas/nueva`, la prueba falla y nombra ese archivo. Restaurado
el bloque, vuelve a pasar.

## Validación

Lint y typecheck sin errores.

Las dos pruebas nuevas pasan. Los cuatro casos, medidos en 390, 768, 1024, 1280
y 1440 px contra la base local:

| Caso | Resultado |
| --- | --- |
| Buscador con coincidencia | El cliente aparece en los cinco anchos |
| Buscador sin coincidencias | El mensaje de vacío se lee en los cinco |
| Ficha con una venta | La venta aparece en los cinco |
| Ficha sin ventas | El mensaje de vacío se lee en los cinco |

Ninguna pantalla tiene desplazamiento lateral en ningún ancho.

**Venta completa desde escritorio a 1440 px:** buscar `Mostrador`, abrir el
cliente desde la tabla, asignar el cobro, crear la venta y registrar 50 Bs en
efectivo. La Caja del día estaba cerrada y el sistema pidió una apertura
excepcional con motivo, que es el comportamiento correcto. Antes de este cambio
el recorrido no pasaba del primer paso.

## Pendientes

- La apertura excepcional de Caja quedó abierta en la base local, con 50 Bs de
  ingreso y el motivo `Verificacion de la Tarea 12B desde escritorio`. Es dato
  sintético local; se cierra o se reinicia con `pnpm db:reset` cuando estorbe.
- Quedan las Tareas 12C y 12D del mismo QA. La Tarea 12 no cierra hasta que las
  dos cierren.
