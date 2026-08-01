# Móvil Y Conectividad Lenta

Guía operativa de la Tarea 26. El objetivo no es convertir SIGECO en una
aplicación offline, sino evitar pérdida de trabajo y operaciones duplicadas
cuando la conexión falla o responde lentamente.

## Estados Que Ve El Personal

- **En línea:** el navegador informa conexión disponible.
- **Conexión lenta:** se recomienda pulsar una sola vez y esperar.
- **Sin conexión:** los formularios no se envían y lo escrito permanece en la
  pantalla actual.
- **Guardando:** el servidor todavía no confirmó la operación.
- **Guardado:** SIGECO respondió y confirmó el registro.
- **Error:** no existe confirmación; se corrige o reintenta manualmente.

Recuperar conexión no repite automáticamente pagos, egresos o stock. El
empleado revisa la pantalla y vuelve a guardar una sola vez.

## Operaciones Protegidas Contra Reintentos

La misma clave de idempotencia devuelve la operación ya creada en lugar de
crear otra:

| Operación | Protección |
| --- | --- |
| Llegada y visita | `Visit.idempotencyKey` |
| Venta, cobro inicial y salida automática | `Sale.idempotencyKey` |
| Pago posterior | `Payment.idempotencyKey` |
| Apertura, egresos y correcciones de Caja | Claves existentes de Tarea 18 |
| Compra, pago y recepción | Claves existentes de Tarea 20 |
| Entrada o ajuste manual de stock | `InventoryMovement.idempotencyKey` |
| Lotes y sus ajustes | Claves existentes de Tarea 20 |

La clave se crea al mostrar el formulario y permanece mientras esa pantalla
siga abierta. Un doble clic o un reintento después de una respuesta perdida no
debe duplicar la operación.

## Único Borrador Local Permitido

La nueva compra puede conservar en `sessionStorage`:

- proveedor y fecha;
- forma prevista de pago;
- documento escrito, sin archivo;
- productos, cantidades, costos y nota administrativa;
- clave de idempotencia.

No guarda pacientes, teléfonos, diagnósticos, historia clínica, adjuntos,
fotografías o comprobantes. El schema es estricto: cualquier campo no aprobado
invalida el borrador completo.

El mensaje **Borrador local** no significa que la compra exista en SIGECO. Se
borra al recibir la confirmación `compra-creada` o al cerrar la sesión. Las
métricas anónimas de actualización de bandejas también se limpian al logout.

## Historia Clínica Y Adjuntos

SIGECO no instala service worker ni caché offline. Todas las rutas internas
usan `private, no-store`; el contenido de adjuntos clínicos repite esas
cabeceras explícitamente.

Una consulta o adjunto que no alcanzó a guardarse no se considera confirmado.
No se copia información clínica a `localStorage` o `sessionStorage`.

## Corte Largo

La clínica debe mantener fichas vacías impresas desde
`/sigeco/contingencia`. Durante el corte:

1. asignar un número temporal consecutivo a cada operación;
2. usar una hoja por llegada, pago, egreso, compra o movimiento de stock;
3. proteger las hojas bajo llave;
4. al recuperar SIGECO, transcribir en orden y marcar la hoja;
5. pedir segunda revisión para pagos y stock;
6. anotar el ID definitivo y las dos firmas.

La ficha en papel es evidencia temporal; no es una confirmación dentro de
SIGECO.

## Móvil Y Escritorio

- Los controles táctiles principales alcanzan 44 px en móvil.
- Teléfonos, cantidades y dinero abren teclados apropiados.
- Adjuntos y documentos permiten cámara trasera donde corresponde.
- Las tablas permanecen medianas en escritorio y desplazan su propio contenido
  en pantallas estrechas.
- `Ctrl+K` mantiene la búsqueda global de pacientes en escritorio.

## Validación Pendiente En Staging

1. probar doble clic y reintento en llegada, venta, pago, egreso, compra y stock;
2. simular respuesta perdida y confirmar una sola fila en cada tabla;
3. usar red lenta y corte temporal en 390 px;
4. confirmar borrador local y limpieza al logout;
5. verificar que historia clínica y adjuntos no aparezcan en storage ni caché;
6. imprimir y completar una ficha de contingencia;
7. ejecutar integración, build y QA gstack acumulados.

Staging y producción no deben migrarse sin aviso y autorización expresa.
