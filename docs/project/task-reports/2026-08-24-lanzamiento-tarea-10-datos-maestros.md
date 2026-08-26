# Tarea 10: datos maestros reales de la Etapa 1

## Fecha

2026-08-24

## Objetivo

Que el sistema arranque con los datos reales de la clínica y no con los de
demostración.

Plan: [Lanzamiento por etapas](../sigeco-lanzamiento-por-etapas/tasks.md).

## Alcance Real De Esta Entrega

Esta tarea es mitad herramienta y mitad datos. **Los datos no los puede poner el
desarrollo**: los productos, los precios, los proveedores, el conteo físico y el
personal los tiene la clínica. Inventar un precio o un stock sería peor que no
cargarlo, porque un precio inventado se cobra igual que uno real.

Lo que se entrega es todo lo necesario para que la carga sea rápida, auditable y
verificable:

1. Una plantilla que la clínica completa.
2. Un cargador que la lee y falla si falta un dato, en lugar de rellenarlo.
3. Una verificación que dice si la base está lista para lanzar.
4. El procedimiento documentado.

La tarea no se puede dar por cumplida hasta que la clínica complete la plantilla
y la carga se ejecute contra la base que se va a usar.

## Cambios Implementados

### `pnpm stage-one:check`

`scripts/check-stage-one-readiness.ts` revisa y no corrige:

- Módulos de la Etapa 1 encendidos y clínicos todavía apagados.
- Sucursal El Alto activa.
- Sin productos, ofertas, pacientes, proveedores ni usuarios de prueba
  (detecta los prefijos `DEMO-` y `QA-` y los correos de demostración).
- Todos los productos activos con precio de venta, unidad y proveedor.
- **El stock igual a la suma de sus movimientos**: un número que no se pueda
  explicar con movimientos no es stock, es una suposición.
- Super administrador, Administración y Dirección con cuenta activa.
- Efectivo y QR disponibles.

Termina con código de error si falta algo bloqueante. Los avisos no bloquean.

### `pnpm stage-one:load`

`scripts/load-stage-one-master-data.ts` carga proveedores, productos y ofertas
del catálogo desde un archivo que la clínica completa.

- Exige `STAGE_ONE_CONFIRM` con el nombre exacto de la base, escrito a mano. Es
  la barrera contra cargar en el ambiente equivocado.
- Exige `STAGE_ONE_RESPONSIBLE_EMAIL` de un usuario interno activo: el conteo
  físico lo firma una persona.
- Rechaza códigos con prefijo `DEMO-` o `QA-`.
- Falla con un mensaje concreto cuando falta un dato o un monto está mal escrito.
- Es idempotente: se vuelve a correr sin duplicar.

**El stock entra como movimiento de inventario**, con la cantidad contada, el
responsable y el motivo `Conteo físico inicial <fecha> — <responsable>`, y con
clave de idempotencia. No se escribe como número.

### Plantilla y procedimiento

- `docs/operations/plantillas/datos-maestros-etapa-1.example.json`, con
  instrucciones en el propio archivo. El archivo real va en `.data/`, que no se
  versiona: precios y proveedores no viajan al repositorio.
- `docs/operations/stage-one-master-data.md`: qué preparar, quién lo tiene, cómo
  cargar, cómo verificar y qué **no** hace el cargador.

## Hallazgos

### La base de desarrollo no pasaría la verificación

Corriendo `pnpm stage-one:check` contra desarrollo:

```
FALTA  Sin productos ni catálogo de demostración   productos 30, ofertas 13
FALTA  Sin proveedores de demostración             3 proveedores con correo de prueba
FALTA  Sin usuarios de prueba                      1 cuentas de prueba
FALTA  Hay alguien de Administración               nadie puede cobrar
```

Es lo esperado en desarrollo, y confirma que la verificación detecta lo que
tiene que detectar. La base productiva debe partir limpia: el cargador **no
borra** datos de demostración a propósito, porque borrar en masa es exactamente
lo que no se debe automatizar contra una base real.

### Quedan formas de cobro que la interfaz ya no ofrece

La verificación avisó que `card`, `transfer` y `other` siguen activas como
métodos de pago, aunque desde el 2026-08-14 la interfaz solo ofrece efectivo y
QR. Un método activo que nadie puede elegir ensucia la conciliación de Caja.
Conviene desactivarlos antes del lanzamiento; queda como aviso, no como bloqueo,
porque puede haber pagos históricos que los usen.

### La evidencia de stock no se puede borrar, ni siquiera en desarrollo

Al limpiar la prueba del cargador, PostgreSQL rechazó el borrado con
`La evidencia de compras, recepciones y stock no se edita ni elimina`. Es la
garantía funcionando. El producto de prueba se neutralizó como manda el sistema:
un ajuste compensatorio que lo dejó en cero y la desactivación del producto y del
proveedor. Quedan inactivos y renombrados como `Prueba del cargador (anulado)` en
la base de desarrollo.

## Validación

- `pnpm typecheck`: sin errores.
- `npx eslint src scripts --max-warnings=0`: sin errores.
- Pruebas unitarias: 479 en total, 474 aprobadas (los cinco fallos previos).
- **Prueba real del cargador contra la base de desarrollo**, con un archivo de
  un proveedor, un producto y una oferta:
  - producto creado con `salePriceCents 3550`, `maxDiscountCents 500`,
    `unit "caja"`, `currentStock 7`
  - movimiento `entry` de 7 con motivo
    `Conteo físico inicial 2026-08-25 — Prueba Carga` y su clave de idempotencia
  - el reintento no duplicó nada: `Productos nuevos: 0 | ya existían: 1`
- Barreras probadas una por una, todas con mensaje accionable: base sin
  confirmar, responsable ausente, archivo inexistente, código `DEMO-` y monto mal
  escrito.

## Pendientes

Lo que falta **no es código**:

1. Que Administración y Dirección completen la plantilla con productos, precios,
   umbrales de descuento, proveedores, servicios y tratamientos.
2. Que se haga el conteo físico con fecha y responsable.
3. Que se den de alta los usuarios reales en `/sigeco/usuarios`.
4. Que la carga se ejecute contra la base productiva y `pnpm stage-one:check`
   termine sin faltantes.
5. Desactivar las formas de cobro que la interfaz ya no ofrece.

Hasta entonces esta tarea no puede darse por terminada, aunque la herramienta
esté lista.
