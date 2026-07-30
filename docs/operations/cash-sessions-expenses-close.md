# Caja, Egresos Y Cierre Diario

Esta guía explica cómo funciona el control de Caja implementado en la Tarea 18.
No reemplaza las reglas contables o fiscales que Dirección defina después.

## Responsables Y Permisos

- **Administración** abre Caja, registra cobros y egresos y solicita el cierre.
- **Dirección** consulta Caja, registra devoluciones o reintegros y aprueba una
  diferencia que supera el límite.
- **Super administrador** conserva todos los permisos para soporte controlado.
- Médico, Enfermería, Recepción, Seguimiento y Comunicación no pueden consultar
  ni modificar Caja.

Los permisos están separados en apertura, lectura, movimiento, corrección,
cierre y aprobación. Tener acceso a ventas no concede por sí solo permiso para
crear un egreso.

## Apertura

La pantalla se encuentra en:

```text
/sigeco/administracion/caja
```

Antes del primer cobro, Administración registra:

- sucursal;
- nombre de la caja física;
- fecha de trabajo y turno;
- responsable;
- efectivo inicial.

Una caja física no puede tener dos sesiones abiertas o esperando aprobación.
Crear una venta sin cobro sigue permitido, pero cualquier cobro exige una
sesión abierta. Si no existe, toda la transacción se revierte y no se guarda
un pago incompleto.

## Dinero Entregado Al Personal

Administración elige la categoría, quién entrega, quién autorizó y el motivo.
Después escribe un monto en la línea de cada empleado beneficiario.

SIGECO calcula el total sumando las líneas. Por ejemplo:

```text
Empleado A: Bs 20
Empleado B: Bs 25
Total del egreso: Bs 45
```

No se guarda solamente una descripción general: cada persona y cada monto
quedan consultables.

## Compra Urgente

La compra registra categoría, artículo, cantidad, precio unitario, solicitante,
persona que recibe el dinero, persona que entrega, autorizador, motivo de
urgencia y proveedor opcional.

El total siempre se calcula como:

```text
cantidad × precio unitario
```

El comprobante es opcional mientras Dirección define qué categorías lo
requieren. Desde un teléfono se puede tomar una fotografía con la cámara. Se
aceptan PDF, JPG, PNG y WebP de hasta 4 MB.

Los comprobantes usan el almacenamiento privado ya aislado para documentos
sensibles. En local quedan bajo el directorio configurado por
`CLINICAL_FILES_LOCAL_PATH`, con el prefijo `cash-receipts/`; no se sirven como
archivos públicos y su lectura requiere permiso de Caja.
Antes de entregarlo, SIGECO compara su checksum SHA-256 con el guardado al
subirlo; si el archivo cambió, rechaza la lectura.

Marcar “debe ingresar al inventario” crea un pendiente visible. No aumenta el
stock: la recepción e ingreso real pertenecen a la Tarea 20.

## Otro Egreso

Se usa solo cuando la salida no corresponde a personal ni a una compra urgente.
Exige monto, receptor, persona que entrega, autorizador y motivo.

## Cierre Y Conciliación

El efectivo esperado se calcula únicamente desde movimientos confirmados:

```text
efectivo esperado =
  efectivo inicial
  + ingresos en efectivo
  + reintegros en efectivo
  - egresos en efectivo
  - devoluciones en efectivo
```

QR, tarjeta, transferencia y otros medios se concilian por separado. Para cada
medio se conserva:

- monto esperado por SIGECO;
- monto contado o reportado;
- diferencia.

El límite local por defecto es Bs 20:

```env
CASH_CLOSE_APPROVAL_THRESHOLD_CENTS="2000"
```

Si cualquier diferencia supera el límite, la Caja queda
`pending_approval`, no admite movimientos y espera a Dirección. Si no lo
supera, Administración completa el cierre. El cierre tiene una vista
imprimible con responsables, conciliación, observaciones y movimientos.

El límite debe ser aprobado expresamente antes de configurar producción.

## Devoluciones, Anulaciones Y Reintegros

Un movimiento financiero no se borra:

- corregir un ingreso crea una devolución;
- corregir un egreso crea un reintegro;
- la corrección enlaza el movimiento original;
- exige monto, motivo, usuario autenticado y autorización de Dirección;
- la suma de correcciones nunca puede superar el monto original;
- la corrección se registra en la Caja actualmente abierta, aunque el
  movimiento original pertenezca a un día anterior.

Si se devuelve un cobro relacionado con una venta, el saldo de esa venta se
recalcula. El pago original se conserva como evidencia.

## Reintentos Y Concurrencia

- Aperturas y egresos usan claves de idempotencia.
- Reenviar el mismo formulario no crea dos egresos.
- La sesión se bloquea dentro de la transacción antes de mover o cerrar dinero.
- La base de datos rechaza movimientos nuevos sobre una sesión cerrada.
- La base de datos impide borrar movimientos, egresos, beneficiarios y
  conciliaciones.

## Validación Antes De Producción

Esta implementación y su migración están aplicadas solamente en desarrollo
local. Antes de producción se debe:

1. aprobar el límite de diferencia;
2. definir qué gastos exigen comprobante y en qué plazo;
3. validar permisos con Administración y Dirección en staging;
4. probar cámara, archivos y cierre en teléfonos reales;
5. ejecutar integración, build y QA gstack acumulados;
6. autorizar expresamente la migración productiva.
