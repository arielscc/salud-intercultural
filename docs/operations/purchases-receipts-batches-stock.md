# Compras, Recepciones, Lotes Y Stock

Guía operativa de la Tarea 20. La fuente de verdad es Prisma y la operación se
realiza desde SIGECO; Payload no administra compras ni inventario.

## Regla Principal

Una compra no significa que el producto ya llegó.

```text
Compra registrada
  -> pago cuando realmente sale el dinero
  -> recepción cuando llega el producto
  -> lote y movimiento que aumentan el stock
```

Los cuatro registros quedan enlazados. Ninguno se crea únicamente para hacer
que los números parezcan completos.

## Responsables Y Permisos

- Administración crea, confirma y paga compras; recibe productos y registra
  ajustes.
- Dirección revisa compras y costos y debe autorizar mermas, daños,
  vencimientos, devoluciones y correcciones de lote.
- Super administrador puede realizar y autorizar estas operaciones.
- Médico y Enfermería pueden consultar existencias y vencimientos sin ver
  costos ni contactos de proveedores.
- Seguimiento y Comunicación no administran compras ni inventario.

## Registrar Y Confirmar Una Compra

La compra empieza como borrador con proveedor, fecha, sucursal, documento,
forma prevista de pago y líneas de producto, cantidad y costo unitario.
El total se calcula en servidor.

Al confirmar:

- efectivo, transferencia u otro medio crean un pago y una salida en la Caja
  abierta exactamente una vez;
- crédito no reduce Caja y conserva el total pendiente;
- una compra urgente ya pagada reutiliza el `CashMovement` del egreso; no crea
  otra salida.

Si Caja reintegra parte de un pago mediante un movimiento compensatorio, el
saldo de la compra vuelve a quedar pendiente sin editar el pago original.

## Registrar Una Recepción

La recepción indica fecha y hora, persona que recibió, ubicación, documento y
las cantidades que realmente llegaron. Cada línea puede incluir lote del
proveedor, vencimiento y costo real.

- Puede recibirse solo una parte.
- La compra permanece `Recibida parcialmente` mientras exista cantidad
  pendiente.
- La clave de idempotencia y la relación única entre recepción y movimiento
  impiden aplicar dos veces la misma entrada.
- Cada línea recibida crea un lote y un movimiento de entrada.
- El costo y la descripción quedan históricos aunque luego cambie el catálogo.

En celular, los campos se apilan, el documento puede capturarse con la cámara y
las fechas usan los componentes globales de SIGECO.

## Lotes, FEFO Y Vencimientos

SIGECO muestra cantidad recibida y disponible, ubicación, costo histórico,
compra, recepción y vencimiento.

FEFO significa utilizar primero el lote vigente que vence antes. Los lotes
vencidos nunca se seleccionan para una salida automática. Cuando un producto
no tiene lote histórico, SIGECO puede consumir el stock anterior sin lote y lo
deja explicado en el kardex.

Se muestran alertas para lotes vencidos y para los que vencen dentro de 60
días. El stock mínimo continúa usando las alertas del producto.

## Ajustes Y Devoluciones

Un ajuste exige cantidad, explicación, usuario que registra y autorización de
Dirección:

- daño, merma, vencimiento y devolución al proveedor restan stock;
- devolución del paciente indica expresamente si la unidad vuelve al lote;
- corrección indica si suma o resta.

El ajuste y el movimiento son append-only. No se eliminan para corregirlos; se
registra otro movimiento compensatorio.

## Documentos Privados

Las fotografías y PDF se validan, se guardan fuera de `public/` y no usan la
biblioteca pública de Payload. La lectura exige `purchases_read`, no usa caché
y verifica SHA-256 antes de entregar el archivo.

## Pantallas

- `/sigeco/compras`: búsqueda, estados, proveedor, saldos y pendientes.
- `/sigeco/compras/nueva`: borrador con líneas y captura móvil.
- `/sigeco/compras/[purchaseId]`: pedido contra recibido, pagos, recepciones,
  documentos y trazabilidad.
- `/sigeco/compras/[purchaseId]/recibir`: recepción parcial y lotes.
- `/sigeco/inventario/lotes`: vencimientos, FEFO y ajustes autorizados.
- `/sigeco/inventario/[itemId]`: kardex con enlace a compra y lote cuando el
  rol puede consultarlos.

## Despliegue

La migración `20260730192059_purchases_receipts_batches_stock` está aplicada
solo en desarrollo local. No ejecutar en staging ni producción hasta completar
integración acumulada, QA por roles, prueba en teléfonos reales y autorización
expresa.

