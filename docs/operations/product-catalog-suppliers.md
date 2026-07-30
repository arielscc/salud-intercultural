# Catálogo De Productos Y Proveedores

Esta guía explica cómo administrar el catálogo implementado en la Tarea 19.
El stock continúa siendo transaccional: editar la ficha de un producto no crea
una entrada ni corrige existencias.

## Responsables Y Acceso

- **Administración** crea y edita productos, precios, costos referenciales,
  proveedores y asociaciones.
- **Dirección** consulta productos, costos referenciales y proveedores, sin
  modificarlos.
- **Médico y Enfermería** consultan únicamente productos activos y su
  disponibilidad. No ven costos ni contactos de proveedores.
- **Super administrador** conserva acceso completo para soporte.
- Recepción, Seguimiento/Yazmin y Comunicación no acceden al inventario.

Las validaciones se realizan en servidor. Ocultar un botón no sustituye el
permiso de la acción.

## Productos

El catálogo se encuentra en:

```text
/sigeco/inventario
```

Permite buscar por nombre, código interno, SKU o categoría y filtrar por uso y
estado. Administración registra:

- código interno único;
- SKU opcional;
- nombre, descripción, categoría y unidad;
- uso: venta, interno o ambos;
- precio de venta;
- costo referencial;
- stock mínimo;
- stock inicial solamente durante el alta.

El código interno se normaliza en mayúsculas, no puede modificarse y queda
reservado. Un producto se desactiva; no se elimina. Por ello, sus ventas,
movimientos, alertas y versiones continúan asociados.

Una entrada posterior se registra desde el detalle del producto y genera un
movimiento. Los ajustes manuales siguen limitados al permiso especial
`inventory_adjust`.

## Precio Y Costo Referencial

El precio de venta y el costo referencial se guardan en centavos. El costo es
una ayuda para decidir, no el costo histórico de una compra.

Ejemplo:

```text
Costo referencial actual: Bs 80
Compra de junio: Bs 75 por unidad
Compra de julio: Bs 83 por unidad
```

Cambiar el costo referencial a Bs 85 no debe cambiar junio ni julio. La Tarea
20 guardará el costo real en cada línea de compra y recepción.

## Proveedores

La administración se encuentra en:

```text
/sigeco/inventario/proveedores
```

Cada proveedor conserva empresa, persona de contacto, teléfono, WhatsApp,
correo, dirección y notas. Puede asociarse a varios productos. Un producto
puede tener varios proveedores activos y como máximo uno preferido.

Desactivar un proveedor no borra sus asociaciones ni versiones. Un proveedor
inactivo no puede añadirse a una asociación nueva.

## Historial Y Concurrencia

Cada alta, edición, cambio de estado o cambio de proveedores crea una nueva
versión con:

- fotografía de los datos;
- responsable;
- fecha y hora;
- motivo;
- número de versión.

Las versiones son append-only: PostgreSQL rechaza su edición o borrado. Los
formularios envían la revisión que el usuario vio; si otra pestaña guardó
primero, SIGECO rechaza el cambio antiguo para evitar sobrescrituras.

## Uso En Ventas

Administración solo puede elegir productos activos y habilitados para venta.
La salida automática valida nuevamente estas dos condiciones dentro de la
transacción. Si el producto fue desactivado después de abrir la pantalla, la
venta completa se revierte y no deja pago ni movimiento parcial.

## Web Y Móvil

- Escritorio muestra búsqueda, filtros, tabla, costos autorizados e historial.
- Móvil usa formularios divididos en identificación, uso/precio y
  confirmación.
- Código, cantidad y dinero usan controles apropiados para teclado móvil.
- Las acciones que no corresponden al rol no se muestran.

## Antes De Producción

La migración está aplicada únicamente en desarrollo local. Antes de producción:

1. ejecutar integración, build y QA acumulados;
2. validar Administración, Dirección, Médico y Enfermería en staging;
3. revisar categorías, unidades, precios, costos y proveedores reales;
4. comprobar el alta y la edición desde teléfonos reales;
5. realizar backup y autorizar expresamente la migración productiva.
