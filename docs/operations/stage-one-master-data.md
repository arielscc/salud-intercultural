# Datos Maestros De La Etapa 1

Que la clinica arranque con sus datos reales y no con los de demostracion. Este
documento describe que hay que preparar, como se carga y como se verifica antes
de encender la Etapa 1.

Plan de referencia:
[lanzamiento por etapas](../project/sigeco-lanzamiento-por-etapas/tasks.md).

## Que Hay Que Preparar

La carga la decide la clinica; el sistema no inventa un precio ni un stock. Hace
falta reunir antes:

| Dato | Quien lo tiene | Detalle |
| --- | --- | --- |
| Productos | Administracion | Nombre como se vende, categoria, unidad, precio de venta, costo referencial, stock minimo |
| Umbral de descuento | Direccion | Cuanto se puede rebajar de cada producto, en bolivianos |
| Proveedores | Administracion | Nombre, contacto, telefono, condiciones |
| Servicios y tratamientos | Direccion | Nombre como lo pide el paciente, precio, si lo ejecuta Enfermeria, cuantas sesiones |
| Conteo fisico | Administracion | Cantidad contada de cada producto, con fecha y responsable |
| Personal | Direccion | Quien usa el sistema y con que rol |

El precio va en bolivianos con punto decimal (`35` o `35.50`), nunca en
centavos: el sistema convierte.

## Preparar El Archivo

1. Copiar `docs/operations/plantillas/datos-maestros-etapa-1.example.json`.
2. Guardarlo como `.data/datos-maestros-etapa-1.json`. Esa carpeta no se
   versiona: los precios y proveedores no van al repositorio.
3. Reemplazar todo el contenido de ejemplo por datos reales.
4. Revisar que ningun codigo empiece con `DEMO-` ni `QA-`; el cargador los
   rechaza porque son de los datos de prueba.

## Cargar

```bash
STAGE_ONE_RESPONSIBLE_EMAIL=<correo de quien firma el conteo> \
STAGE_ONE_CONFIRM=<nombre exacto de la base> \
pnpm stage-one:load
```

- `STAGE_ONE_RESPONSIBLE_EMAIL` debe ser un usuario interno activo. Queda como
  responsable de la entrada de stock.
- `STAGE_ONE_CONFIRM` se escribe a mano con el nombre de la base. Sin eso el
  cargador no corre: es la barrera contra cargar en el ambiente equivocado.

El cargador es idempotente: vuelve a correrse sin duplicar. Un producto o una
oferta que ya existe se salta, y la entrada de stock usa una clave unica.

Si falta un dato, falla y dice cual. No completa con un valor por defecto: un
precio inventado se cobra igual que uno real.

## El Stock Entra Como Movimiento

El stock contado no se escribe como numero: entra como una **entrada de
inventario** con su cantidad, su responsable y el motivo
`Conteo fisico inicial <fecha> — <responsable>`.

Eso importa el dia que aparezca una diferencia: el sistema puede mostrar de
donde salio cada unidad. Un numero escrito a mano no se puede explicar.

Los movimientos de stock son evidencia y **PostgreSQL impide editarlos o
borrarlos**. Una carga equivocada no se deshace: se corrige con un ajuste
compensatorio, igual que cualquier diferencia real.

## Verificar Antes De Lanzar

```bash
pnpm stage-one:check
```

Revisa y no corrige:

- Modulos de la Etapa 1 encendidos y clinicos todavia apagados.
- Sucursal El Alto activa.
- Sin productos, ofertas, pacientes, proveedores ni usuarios de prueba.
- Todos los productos activos con precio de venta, unidad y proveedor.
- El stock del sistema igual a la suma de sus movimientos.
- Super administrador, Administracion y Direccion con cuenta activa.
- Efectivo y QR disponibles, y aviso si quedan formas de cobro que la interfaz
  ya no ofrece.

Termina con codigo de error si falta algo que impida lanzar. Los avisos no
bloquean, pero conviene resolverlos.

## Lo Que No Hace El Cargador

- **No crea usuarios.** El personal se da de alta en `/sigeco/usuarios`, con
  contrasena temporal y cambio obligatorio en el primer ingreso.
- **No borra datos de demostracion.** Si la base los tiene, hay que partir de
  una base limpia; `pnpm stage-one:check` los detecta.
- **No define el umbral de descuento por su cuenta.** Lo toma del archivo, y ese
  valor lo decide Direccion.

## Documentacion Relacionada

- [Lanzamiento y suspension de modulos](./module-launch-suspension.md)
- [Catalogo de productos y proveedores](./product-catalog-suppliers.md)
- [Compras, recepciones, lotes y stock](./purchases-receipts-batches-stock.md)
