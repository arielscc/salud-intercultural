# Guía Reproducible Del Piloto Completo De SIGECO

Esta guía permite repetir, pantalla por pantalla, el piloto de SIGECO con el
personal de la clínica. Incluye rutas, responsables, datos ficticios, resultados
esperados, documentos, casos de error, emergencias, evidencias y aprobación.

La prueba cubre la operación de **El Alto**. No autoriza producción ni la apertura
de Cochabamba.

## 1. Qué Demuestra Este Piloto

Al terminar, Dirección debe poder comprobar que:

1. cada empleado entra con su propia cuenta y ve solamente lo necesario;
2. un paciente pasa por Recepción, Consulta, Enfermería, Administración y
   Seguimiento sin perder información;
3. el médico registra y cierra la propuesta de tratamiento;
4. Caja, compras, lotes y stock se pueden reconciliar;
5. una corrección crea una nueva versión y no borra la anterior;
6. un abandono conserva el motivo y los trabajos pendientes;
7. los contactos respetan el consentimiento del paciente;
8. el personal sabe actuar ante conexión lenta, caída del sistema, diferencia
   de Caja, falta de stock o una emergencia real;
9. teléfono, tableta y computadora permiten completar las tareas principales;
10. Dirección conserva evidencia suficiente para aprobar o rechazar el piloto.

## 2. Estado Y Límites

- El ensayo técnico local del 2 de agosto de 2026 fue aprobado sin defectos
  críticos.
- El piloto con empleados, dispositivos físicos y red real continúa pendiente.
- El recorrido completo debe ejecutarse primero en `develop`, usando localhost
  y datos ficticios.
- Staging se usa después para repetir la validación antes de producción.
- Cualquier uso en producción exige aviso y autorización expresa previa.
- Cochabamba continúa en preparación. No se activa ni recibe movimientos
  reales durante este piloto.
- Esta guía comprueba el uso de SIGECO. No sustituye protocolos médicos,
  contables, legales, de bioseguridad o de atención de emergencias.

## 3. Regla Para Que Cada Ejecución Sea Identificable

Cada repetición usa un código único llamado **ID de ejecución**.

Formato:

```text
P29-R01
```

- `P29` identifica la Tarea 29.
- `R01` significa primera repetición.
- La siguiente repetición usa `P29-R02`, después `P29-R03`, etc.

Antes de comenzar, reemplazar `P29-R01` en nombres, códigos, documentos y
notas si ese ID ya fue usado.

No reutilizar teléfonos, códigos de producto, números de lote o documentos de
una ejecución anterior.

## 4. Ambiente Y Orden Obligatorio

El orden es:

```text
1. develop + localhost
2. staging, después de aprobar local
3. producción, únicamente con autorización independiente
```

### Primera ejecución obligatoria: desarrollo local

El recorrido completo de los 30 casos se realiza primero en la rama `develop`
y en `localhost`.

El responsable técnico prepara el ambiente:

```bash
git switch develop
pnpm install
docker compose up -d postgres
pnpm env:check
pnpm db:generate
pnpm db:migrate
pnpm seed
pnpm internal:seed
pnpm dev
```

Resultado esperado:

- `git branch --show-current` muestra `develop`;
- `pnpm env:check` confirma el ambiente local;
- PostgreSQL local está disponible;
- las migraciones están aplicadas a la base local;
- Payload y el usuario interno local están preparados;
- SIGECO abre normalmente en `http://localhost:3000/sigeco/login`.

En el mismo computador se usa `localhost`. Un teléfono o tableta física debe
usar la dirección `Network` que muestra `pnpm dev`, por ejemplo
`http://IP-LOCAL:3000`. Ambos siguen siendo desarrollo local. Usar solamente la
red privada de la clínica, no abrir el puerto a internet y volver a `localhost`
si no se necesita probar otro dispositivo.

No ejecutar `pnpm db:reset` para preparar el piloto si la base local contiene
trabajo que debe conservarse. Un reinicio local destructivo requiere una
decisión separada y confirmación del responsable.

### Segunda ejecución: staging

Staging no reemplaza la prueba local. Se usa después de completar y documentar
los 30 casos en localhost.

Cuando llegue ese momento, el responsable técnico ejecuta:

```bash
pnpm staging:check
pnpm staging:migrate
pnpm staging:seed
pnpm staging:verify
```

En staging se usa otro ID, por ejemplo `P29-S01`, para no confundir su evidencia
con `P29-R01` local. Staging debe mostrar:

```text
STAGING · DATOS SINTÉTICOS · CONTACTOS BLOQUEADOS
```

Su reinicio es opcional y elimina los datos de ese ambiente. Solo se ejecuta
con coordinación previa:

```bash
CONFIRM_STAGING_RESET=RESET-SIGECO-STAGING pnpm staging:reset
```

### Importante sobre los datos manuales

Una visita creada desde la pantalla de Recepción no recibe automáticamente la
marca técnica `isTestData=true`. Por tanto, los registros `P29-R01` pueden
aparecer en los reportes locales y los `P29-S01` en los reportes de staging.

Por esa razón:

- nunca ejecutar este juego de datos en producción;
- usar el prefijo `[QA P29-R01]` durante la primera ejecución local;
- guardar los IDs creados;
- no borrar auditoría, movimientos o versiones para limpiar indicadores;
- no afirmar que las pruebas manuales están excluidas de todos los reportes.

## 5. Personal Y Tiempo Necesario

| Participante | Función durante el piloto | Tiempo aproximado |
| --- | --- | ---: |
| Dirección | Dirige, autoriza, revisa Caja, permisos, reclamos y firma | 3 horas |
| Recepción | Paciente, llegada, procedencia, consentimiento y abandono | 90 minutos |
| Médico | Consulta, receta, propuesta, firma y corrección | 75 minutos |
| Enfermería | Tarea clínica, signos vitales y adjunto | 45 minutos |
| Administración | Caja, venta, pago, producto, proveedor, compra, recepción y lote | 2 horas |
| Marlen/Recepción | Seguimiento clínico y recordatorios supervisados | 45 minutos |
| Yazmin/Recepción | Seguimiento administrativo y apoyo a la llegada | 20 minutos |
| Soporte técnico | Ambiente, evidencia, errores y recuperación | Toda la sesión |

Marlen y Yazmin usan el rol **Recepción** (el rol técnico `seguimiento` se
retiró el 2026-08-02). Ambas pueden trabajar seguimientos clínicos y
administrativos; para el piloto, Yazmin ejecuta una coordinación administrativa
que representa una consulta de información o una ayuda para llegar a la clínica.

Si una persona cubre dos funciones, debe cerrar sesión y entrar con la cuenta
del rol que corresponde. No se comparten cuentas.

## 6. Cuentas QA Locales

`pnpm internal:seed` prepara el super administrador local configurado, que por
defecto usa el correo `test@test.si`. Su contraseña depende de `.env` y no se
documenta.

Desde `/sigeco/usuarios`, el super administrador crea estas cuentas locales:

| Nombre | Rol | Correo local |
| --- | --- | --- |
| `[QA P29-R01] Dirección` | Dirección | `p29.direccion@local.invalid` |
| `[QA P29-R01] Médico` | Médico | `p29.medico@local.invalid` |
| `[QA P29-R01] Marlen Recepción` | Recepción | `p29.recepcion@local.invalid` |
| `[QA P29-R01] Administración` | Administración | `p29.administracion@local.invalid` |
| `[QA P29-R01] Enfermería` | Enfermería | `p29.enfermeria@local.invalid` |
| `[QA P29-R01] Yazmin Recepción` | Recepción | `p29.yazmin@local.invalid` |

Para cada cuenta:

1. asignar El Alto como sucursal predeterminada;
2. usar una contraseña temporal diferente de al menos 6 caracteres, con
   mayúsculas, minúsculas y números, que no sea común ni fácil de adivinar;
3. entregar la contraseña directamente a la persona que prueba;
4. cambiarla al primer ingreso si SIGECO lo exige;
5. no copiarla en la guía, capturas, chats, tickets o commits;
6. cerrar sus sesiones al terminar el piloto.

El nombre `Marlen` debe permanecer en una cuenta de Recepción porque SIGECO lo
usa para asignar automáticamente los seguimientos clínicos. Yazmin también usa
el rol Recepción.

Si se hace un ensayo técnico sin todo el personal, se puede cambiar
temporalmente el rol de `test@test.si` mediante `pnpm internal:set-role`. Para
la prueba humana se prefieren cuentas separadas.

## 7. Equipos Y Materiales

Preparar antes de comenzar:

- un teléfono real, ancho aproximado de 390 px;
- una tableta real, ancho aproximado de 820 px;
- una computadora, ancho aproximado de 1440 px;
- la red Wi-Fi que usa la clínica y, si es posible, datos móviles;
- dos hojas impresas desde `/sigeco/contingencia`;
- una hoja para contar Caja;
- una hoja para contar productos físicos ficticios;
- un archivo PDF o imagen de prueba menor a 4 MB;
- esta guía abierta en otro equipo;
- un responsable de tomar capturas sin mostrar contraseñas;
- un cronómetro;
- lapiceros y etiquetas `P29-R01`.

### Archivo de prueba para adjuntos y comprobantes

Crear un documento y guardarlo como `P29-R01-documento-prueba.pdf` con este
contenido:

```text
DOCUMENTO FICTICIO DE PRUEBA SIGECO
Ejecución: P29-R01
Paciente: [QA P29-R01] Julia Mamani Condori
Contenido: SIN INFORMACIÓN CLÍNICA REAL
Fecha: 2026-08-02
```

También se puede fotografiar esa hoja y guardarla como
`P29-R01-documento-prueba.jpg`. No usar estudios, recetas, facturas ni imágenes
de personas reales.

## 8. Juego Maestro De Datos

### 8.1 Paciente principal

| Campo | Valor exacto |
| --- | --- |
| Nombre completo | `[QA P29-R01] Julia Mamani Condori` |
| Teléfono | `00002901` |
| Fecha de nacimiento | `15/03/1979` |
| Género | `Femenino` |
| Ciudad de residencia | `El Alto` |
| Departamento | `La Paz` |
| País | `Bolivia` |
| Procedencia de esta visita | `Igual a residencia` |
| Motivo | `Dolor de rodilla de prueba` |
| Desde cuándo | `3 días` |
| Tipo de visita | `Primera consulta` |
| Ya se atendió antes | `No` |
| Trae estudios | `Sí` |
| Alergias | `Ninguna conocida` |
| Enfermedad de base | `Hipertensión de prueba` |
| Medicación actual | `Enalapril 10 mg de prueba` |
| Fuente principal | `Facebook` |
| Fuente de apoyo | `WhatsApp` |
| Código de formulario o campaña | dejar vacío; la respuesta fue verbal y no existe código verificable |

### 8.2 Consulta

| Campo | Valor exacto |
| --- | --- |
| Diagnóstico principal | `Dolor de rodilla en evaluación (piloto)` |
| Diagnóstico secundario | dejar vacío |
| Hallazgos | `Molestia referida durante la prueba; sin evaluación clínica real.` |
| Observaciones | `Registro completamente ficticio para P29-R01.` |
| Plan de tratamiento | `Plan ficticio de una sesión para comprobar el recorrido.` |
| Indicaciones | `No aplicar a ninguna persona. Dato de prueba.` |
| Medicamento de receta | `Producto ficticio P29-R01` |
| Dosis | `1 unidad` |
| Frecuencia | `Una vez` |
| Duración | `Solo prueba` |
| Nota de evolución | `Evolución ficticia sin valor clínico.` |

### 8.3 Orden de Enfermería

| Campo | Valor exacto |
| --- | --- |
| Tipo | `Signos vitales` |
| Área | `Enfermería` |
| Título o indicación | `Control ficticio de presión arterial P29-R01` |
| Presión sistólica | `150` |
| Presión diastólica | `95` |
| Pulso | `82` |
| Nota | `Valores ficticios; no corresponden a una persona real.` |

### 8.4 Propuesta, venta y pago

| Campo | Valor exacto |
| --- | --- |
| Resultado de propuesta | `Aceptado` |
| Motivo | `Está de acuerdo y quiere empezar` |
| Instrucción a Administración | `Registrar 1 frasco de [QA P29-R01] Suero de prueba por Bs 50. Cobro completo en efectivo.` |
| Producto vendido | `[QA P29-R01] Suero de prueba` |
| Cantidad | `1` |
| Precio unitario | `50.00` |
| Cobro inicial | `50.00` |
| Forma de pago | `Efectivo` |

### 8.5 Productos

| Campo | Suero | Jeringa |
| --- | --- | --- |
| Código interno | `P29-R01-SUERO` | `P29-R01-JERINGA` |
| SKU | `P29-R01-SKU-S` | `P29-R01-SKU-J` |
| Nombre | `[QA P29-R01] Suero de prueba` | `[QA P29-R01] Jeringa de prueba` |
| Categoría | `Sueros` | `Material clínico` |
| Unidad | `frasco` | `unidad` |
| Uso | `Venta y uso interno` | `Uso interno` |
| Stock mínimo | `5` | `5` |
| Precio de venta | `50.00` | `0.00` |
| Costo referencial | `3.00` | `5.00` |
| Stock inicial | `0` | `0` |
| Descripción | `Producto completamente ficticio para P29-R01.` | `Insumo completamente ficticio para P29-R01.` |

### 8.6 Proveedor y compras

| Campo | Valor exacto |
| --- | --- |
| Proveedor | `[QA P29-R01] Proveedor de prueba` |
| Contacto | `[QA] Contacto ficticio` |
| Teléfono | `00002911` |
| WhatsApp | `00002911` |
| Correo | `p29-r01@local.invalid` |
| Dirección | `Dirección ficticia local` |
| Notas | `No contactar. Proveedor ficticio P29-R01.` |

Compra A:

| Campo | Valor exacto |
| --- | --- |
| Documento | `COMPRA-P29-R01-A` |
| Forma de pago | `Crédito` |
| Producto | `[QA P29-R01] Suero de prueba` |
| Cantidad | `2` |
| Costo unitario | `3.00` |
| Total | `6.00` |
| Ubicación | `Almacén piloto EA-01` |
| Documento de recepción | `REC-P29-R01-A` |
| Número de lote | `LOTE-P29-R01-S` |
| Vencimiento | `02/08/2027` |

Compra B, enlazada a la compra urgente de Caja:

| Campo | Valor exacto |
| --- | --- |
| Documento | `COMPRA-P29-R01-B` |
| Forma prevista de pago | `Efectivo desde Caja` |
| Compra urgente vinculada | La de 2 jeringas por Bs 10 creada en esta ejecución |
| Producto | `[QA P29-R01] Jeringa de prueba` |
| Cantidad | `2` |
| Costo unitario | `5.00` |
| Total | `10.00` |
| Ubicación | `Almacén piloto EA-02` |
| Documento de recepción | `REC-P29-R01-B` |
| Número de lote | `LOTE-P29-R01-J` |
| Vencimiento | `02/08/2028` |

### 8.7 Caja

| Campo | Valor exacto |
| --- | --- |
| Caja | `Caja piloto P29-R01` |
| Turno | `Día completo` |
| Efectivo inicial | `100.00` |
| Almuerzo | `10.00` a un empleado QA |
| Compra urgente | 2 jeringas × Bs 5 = `10.00` |
| Cobro de venta | `50.00` en efectivo |
| Efectivo esperado | `130.00` |
| Efectivo contado | `130.00` |
| QR, tarjeta, transferencia y otro | `0.00` |
| Diferencia | `0.00` |

Fórmula:

```text
Bs 100 iniciales + Bs 50 cobrados - Bs 10 almuerzo - Bs 10 compra urgente
= Bs 130 esperados
```

## 9. Mapa De Pantallas Y Rutas

Las rutas con `[id]` reciben el identificador creado por SIGECO. No se escribe
la palabra `[id]` literalmente.

| Pantalla | Ruta | Responsable principal |
| --- | --- | --- |
| Ingreso | `/sigeco/login` | Todo el personal |
| Inicio | `/sigeco` | Todo el personal |
| Mi cuenta y sesiones | `/sigeco/mi-cuenta` | Cada empleado |
| Usuarios | `/sigeco/usuarios` | Super administrador |
| Recepción | `/sigeco/recepcion` | Recepción |
| Registrar llegada | `/sigeco/recepcion/nuevo` | Recepción |
| Pacientes | `/sigeco/recepcion?vista=pacientes` | Roles con lectura |
| Ficha del paciente | `/sigeco/recepcion/pacientes/[patientId]` | Según permiso |
| Editar paciente | `/sigeco/recepcion/pacientes/[patientId]/editar` | Recepción |
| Visita | `/sigeco/recepcion/visitas/[visitId]` | Áreas operativas |
| Duplicados | `/sigeco/recepcion/duplicados` | Recepción y Dirección |
| Comparar duplicado | `/sigeco/recepcion/duplicados/[candidateId]` | Revisión; fusión solo super administrador |
| Abandonos | `/sigeco/recepcion/abandonos` | Operación y Dirección |
| Consultas | `/sigeco/consultas` | Médico |
| Consulta | `/sigeco/consultas/[visitId]` | Médico; Dirección lee |
| Historial clínico | `/sigeco/consultas/[visitId]/historial` | Médico y Dirección |
| Receta emitida | `/sigeco/consultas/[visitId]/recetas/[documentId]` | Médico y autorizados |
| Enfermería | `/sigeco/enfermeria` | Enfermería |
| Tarea de Enfermería | `/sigeco/enfermeria/[workItemId]` | Enfermería |
| Administración | `/sigeco/administracion` | Administración |
| Tarea administrativa | `/sigeco/administracion/[workItemId]` | Administración |
| Venta | `/sigeco/administracion/ventas/[saleId]` | Administración |
| Comprobante | `/sigeco/administracion/ventas/[saleId]/comprobantes/[documentId]` | Administración |
| Control de Caja | `/sigeco/administracion/caja` | Administración y Dirección |
| Cierre imprimible | `/sigeco/administracion/caja/cierres/[sessionId]` | Administración y Dirección |
| Seguimientos | `/sigeco/seguimientos` | Recepción, Médico y Administración según tipo |
| Detalle de seguimiento | `/sigeco/seguimientos/[taskId]` | Responsable autorizado |
| Recordatorios supervisados | `/sigeco/seguimientos/recordatorios` | Recepción/Marlen; reglas de Dirección |
| Productos | `/sigeco/inventario` | Administración; lectura clínica limitada |
| Nuevo producto | `/sigeco/inventario/nuevo` | Administración |
| Detalle de producto | `/sigeco/inventario/[itemId]` | Según permiso |
| Proveedores | `/sigeco/inventario/proveedores` | Administración y Dirección |
| Nuevo proveedor | `/sigeco/inventario/proveedores/nuevo` | Administración |
| Lotes | `/sigeco/inventario/lotes` | Administración y Dirección |
| Traslados | `/sigeco/inventario/traslados` | Bloqueado mientras Cochabamba esté en preparación |
| Compras | `/sigeco/compras` | Administración y Dirección |
| Nueva compra | `/sigeco/compras/nueva` | Administración |
| Detalle de compra | `/sigeco/compras/[purchaseId]` | Administración y Dirección |
| Recibir compra | `/sigeco/compras/[purchaseId]/recibir` | Administración |
| Captación | `/sigeco/atribucion` | Dirección y super administrador |
| Recorrido completo | `/sigeco/reportes/recorrido` | Dirección y super administrador |
| Tiempo por área | `/sigeco/reportes/tiempos` | Dirección y super administrador |
| Opiniones y reclamos | `/sigeco/opiniones` | Dirección y super administrador |
| Encuesta privada | `/encuesta/[token]` | Persona que recibió el enlace QA |
| Auditoría | `/sigeco/auditoria` | Dirección y super administrador |
| Configuración documental | `/sigeco/documentos/configuracion` | Dirección y super administrador |
| Sucursales | `/sigeco/sucursales` | Dirección y super administrador |
| Contingencia imprimible | `/sigeco/contingencia` | Personal autorizado |

## 10. Orden De Ejecución

No cambiar el orden. Las pruebas posteriores usan datos creados antes.

### Caso P29-01 — Ambiente, marca y cuentas

**Responsable:** soporte técnico y Dirección.

1. Confirmar que la rama activa sea `develop`.
2. Ejecutar la preparación local de la sección 4.
3. Abrir `http://localhost:3000/sigeco/login` en la computadora.
4. En teléfono o tableta física, usar la dirección local `Network` que muestra
   `pnpm dev`.
5. Confirmar que ambas direcciones pertenecen al equipo o la red local y no a
   un dominio de staging o producción.
6. Crear las cuentas locales de la sección 6.
7. Intentar una contraseña incorrecta.
8. Entrar después con cada cuenta QA correcta.
9. Abrir `/sigeco/mi-cuenta` y confirmar que la sesión actual aparece.
10. Cerrar una sesión de prueba y volver a entrar.

**Resultado esperado:** el error de ingreso no revela si el correo existe; cada
cuenta entra con su rol; ninguna contraseña aparece en URL, captura o auditoría.

**Evidencia:** rama, salida de `pnpm env:check`, URL localhost, lista de roles
probados y hora. No capturar el formulario con la contraseña visible.

### Caso P29-02 — Producto y proveedor

**Responsable:** Administración.

1. Abrir `/sigeco/inventario/nuevo`.
2. Crear los dos productos de la sección 8.5.
3. Abrir `/sigeco/inventario/proveedores/nuevo`.
4. Crear el proveedor de la sección 8.6.
5. Volver a cada producto y asociar el proveedor cuando la pantalla lo permita.
6. Confirmar que ambos productos tienen stock `0`.

**Resultado esperado:** códigos únicos, productos activos, proveedor activo y
ningún movimiento de stock por editar el catálogo.

**Error controlado:** intentar crear otra vez `P29-R01-SUERO`. SIGECO debe
rechazar el código duplicado.

### Caso P29-03 — Compra a crédito, recepción y lote de Suero

**Responsable:** Administración.

1. Abrir `/sigeco/compras/nueva`.
2. Registrar la Compra A de la sección 8.6.
3. Adjuntar `P29-R01-documento-prueba.pdf` si se desea probar documento privado.
4. Crear y después confirmar la compra.
5. Verificar que el stock siga en `0` antes de recibir.
6. Abrir `/sigeco/compras/[purchaseId]/recibir`.
7. Registrar fecha y hora actual, persona QA que recibe, ubicación, documento,
   cantidad `2`, costo `3.00`, lote y vencimiento indicados.
8. Confirmar la recepción.
9. Abrir `/sigeco/inventario/lotes` y buscar `LOTE-P29-R01-S`.

**Resultado esperado:** compra recibida, 2 frascos disponibles, costo histórico
Bs 3, lote propio, ubicación `Almacén piloto EA-01` y vencimiento 02/08/2027.

**Evidencia:** ID de compra, ID o código interno del lote, stock antes y después.

### Caso P29-04 — Apertura de Caja

**Responsable:** Administración; Dirección autoriza.

1. Abrir `/sigeco/administracion/caja`.
2. Crear `Caja piloto P29-R01`, turno `Día completo` y efectivo `100.00`.
3. Elegir a Administración QA como responsable.
4. Confirmar que el efectivo esperado inicial sea Bs 100.

**Resultado esperado:** una sola Caja abierta para El Alto. Volver a enviar el
mismo formulario no debe crear otra sesión.

### Caso P29-05 — Dinero al personal

**Responsable:** Administración; Dirección autoriza.

En `/sigeco/administracion/caja`, abrir `Dinero al personal`:

| Campo | Valor |
| --- | --- |
| Categoría | `Almuerzo` |
| Beneficiario | Elegir un solo empleado QA |
| Monto individual | `10.00` |
| Entrega | Administración QA |
| Autoriza | Dirección QA |
| Motivo | `Almuerzo ficticio P29-R01` |
| Nota | `No representa entrega real.` |

**Resultado esperado:** movimiento de Bs 10 y una línea que identifica a la
persona beneficiaria y su monto. Efectivo esperado: Bs 90.

### Caso P29-06 — Compra urgente de Jeringas

**Responsable:** Administración; Dirección autoriza.

En la misma Caja, abrir `Compra urgente`:

| Campo | Valor |
| --- | --- |
| Categoría | `Material clínico` |
| Artículo | `[QA P29-R01] Jeringa de prueba` |
| Cantidad | `2` |
| Precio unitario | `5.00` |
| Solicitante | Enfermería QA |
| Recibe el dinero | Administración QA |
| Entrega el dinero | Administración QA |
| Autoriza | Dirección QA |
| Proveedor | `[QA P29-R01] Proveedor de prueba` |
| Motivo de urgencia | `Prueba de insumo faltante P29-R01` |
| Debe ingresar a inventario | marcado |
| Comprobante | archivo ficticio opcional |

**Resultado esperado:** egreso Bs 10, efectivo esperado Bs 80 y pendiente de
ingreso al inventario. Guardar el ID del egreso.

### Caso P29-07 — Compra vinculada sin duplicar el egreso

**Responsable:** Administración.

1. Abrir `/sigeco/compras/nueva`.
2. Registrar la Compra B de la sección 8.6.
3. En `Vincular compra urgente ya pagada`, elegir el egreso P29-R01.
4. Confirmar la compra.
5. Comprobar que Caja continúa en Bs 80 esperados; no debe descontar otros
   Bs 10.
6. Recibir 2 unidades en `Almacén piloto EA-02`, lote
   `LOTE-P29-R01-J`, vencimiento 02/08/2028.

**Resultado esperado:** stock de jeringas 2, una compra y una sola salida de
dinero.

### Caso P29-08 — Llegada, procedencia y captación

**Responsable:** Recepción.

1. Abrir `/sigeco/recepcion/nuevo`.
2. Buscar primero el teléfono `00002901`.
3. Confirmar que no exista y elegir `Es paciente nuevo`.
4. Completar todos los datos de la sección 8.1.
5. En captación, elegir `Facebook` como fuente principal y `WhatsApp` como
   apoyo. No preguntar si fue publicidad u orgánico.
6. Registrar la llegada una sola vez.
7. Guardar `patientId`, código interno y `visitId` de la URL.

**Resultado esperado:** una ficha, una visita en Recepción, procedencia El Alto
y fuente principal Facebook.

**Errores controlados antes de guardar:**

- teléfono `abc`: no debe avanzar;
- duración `3` sin unidad: debe pedir cantidad y unidad;
- doble clic o reintento tras una respuesta lenta: debe existir una sola visita.

### Caso P29-09 — Consentimientos independientes

**Responsable:** Recepción.

Abrir la ficha del paciente en
`/sigeco/recepcion/pacientes/[patientId]`. Registrar por separado:

| Finalidad | Decisión | Canal | Confirmación |
| --- | --- | --- | --- |
| Seguimiento | Sí autoriza | WhatsApp | Verbalmente en clínica |
| Recordatorios | Sí autoriza | WhatsApp | Verbalmente en clínica |
| Encuesta sobre la atención | Sí autoriza | WhatsApp | Verbalmente en clínica |
| Educación | No autoriza | No aplica | Verbalmente en clínica |
| Promociones | No autoriza | No aplica | Verbalmente en clínica |
| Imagen o voz | No autoriza | No aplica | Verbalmente en clínica |

Leer el texto completo que muestra cada sección. No resumirlo. Después de
guardar, la sección debe cerrarse y mostrar el estado actual.

**Resultado esperado:** seis decisiones separadas. Autorizar seguimiento no
autoriza promoción, encuesta ni testimonio.

### Caso P29-10 — Derivación y tiempo de Recepción

**Responsable:** Recepción.

1. Abrir `/sigeco/recepcion/visitas/[visitId]`.
2. Pulsar `Iniciar atención` cuando el empleado realmente empiece.
3. Derivar a `Médico / En consulta`.
4. Abrir `/sigeco/reportes/tiempos` con Dirección en otra sesión.

**Resultado esperado:** la visita sale de la espera de Recepción, llega a la
bandeja `/sigeco/consultas` en un máximo aproximado de 30 segundos y conserva
los eventos de entrada e inicio de atención.

### Caso P29-11 — Consulta, adjunto, receta y firma

**Responsable:** Médico.

1. Abrir `/sigeco/consultas` y elegir a Julia QA.
2. Pulsar `Iniciar atención`.
3. Confirmar que los datos de Recepción aparecen en la cabecera.
4. Completar la consulta con los valores de la sección 8.2.
5. Abrir `Receta rápida` y completar sus cuatro campos.
6. Abrir `Evolución` y registrar la nota ficticia.
7. Guardar borrador.
8. En adjuntos clínicos, subir `P29-R01-documento-prueba.pdf` con una etiqueta
   que diga `Adjunto ficticio P29-R01`.
9. Pulsar `Finalizar y firmar consulta` y confirmar.
10. Crear la orden de signos vitales de la sección 8.3.
11. Emitir la primera versión de la receta.

**Resultado esperado:** consulta finalizada con autor, hora y versión; adjunto
privado; orden en Enfermería; receta versión 1 con vista previa y PDF protegido.

**Error controlado:** otro rol sin permiso clínico escribe directamente
`/sigeco/consultas/[visitId]`. Debe volver a `/sigeco` sin mostrar datos.

### Caso P29-12 — Corrección clínica sin borrar

**Responsable:** Médico.

1. Abrir `Corregir consulta finalizada`.
2. Tipo: `Diagnóstico`.
3. Motivo: `Se completó el texto para comprobar el versionado P29-R01`.
4. Cambiar el diagnóstico a
   `Dolor de rodilla en evaluación (piloto corregido)`.
5. Guardar y abrir `/sigeco/consultas/[visitId]/historial`.

**Resultado esperado:** versión anterior intacta, versión nueva vigente, autor,
fecha, motivo y campo modificado visibles. La receta, orden, venta y pago no se
modifican automáticamente.

### Caso P29-13 — Propuesta aceptada por el médico

**Responsable:** Médico.

1. En la consulta finalizada, abrir `Resultado de la propuesta`.
2. Registrar los valores de la sección 8.4.
3. Confirmar el diálogo de aceptación.

**Resultado esperado:** una decisión aceptada, una instrucción y una tarea para
Administración. SIGECO todavía no crea venta ni pago.

### Caso P29-14 — Enfermería

**Responsable:** Enfermería.

1. Abrir `/sigeco/enfermeria`.
2. Elegir la tarea de Julia QA.
3. Pulsar `Iniciar atención`.
4. Registrar los signos vitales de la sección 8.3.
5. Adjuntar el archivo ficticio si el panel de la tarea lo permite.
6. Completar la tarea y devolver al flujo indicado.

**Resultado esperado:** tarea completada, datos visibles desde la consulta y
ficha, sin acceso a diagnóstico editable, Caja ni costos de proveedor.

### Caso P29-15 — Venta, pago y comprobante

**Responsable:** Administración.

1. Abrir `/sigeco/administracion` y la tarea enviada por el médico.
2. Pulsar `Iniciar atención`.
3. Crear la venta con los datos de la sección 8.4.
4. Confirmar que el stock disponible del Suero era 2.
5. Registrar el cobro completo Bs 50 en efectivo.
6. Abrir el detalle de la venta.
7. Emitir la primera versión del comprobante interno.
8. Abrir la vista del comprobante y comprobar la leyenda `No es factura fiscal`.
9. Cerrar la visita cuando no existan tareas pendientes.

**Resultado esperado:** venta saldada, Caja esperada Bs 130, stock del Suero en
1, comprobante versión 1 y visita finalizada.

**Error controlado antes de la venta válida:** intentar vender 999 frascos.
Debe rechazarse sin crear venta, pago ni movimiento de stock.

### Caso P29-16 — Seguimiento clínico y retorno

**Responsable:** Marlen con rol Recepción.

1. Desde la ficha del paciente, crear un seguimiento.
2. Tipo: `Evolución`.
3. Prioridad: `Normal`.
4. Título: `Control ficticio P29-R01`.
5. Fecha: mañana a las 10:00, hora de Bolivia.
6. Abrir `/sigeco/seguimientos/[taskId]`.
7. Método: `WhatsApp`.
8. Resultado: `Quiere volver`.
9. Nota: `Respuesta ficticia; no se envió mensaje real.`
10. Desde la ficha, pulsar `Registrar llegada` y crear el retorno con motivo
    `Control ficticio P29-R01`, tipo `Control de tratamiento`.

**Resultado esperado:** seguimiento terminado, segunda visita en la misma
ficha y ningún paciente nuevo.

En local se prueba el registro del resultado, no el envío. No pulsar un enlace
externo de WhatsApp o llamada durante el piloto. El teléfono `00002901` es
ficticio y no debe sustituirse por el de un paciente real.

### Caso P29-17 — Tarea administrativa de Yazmin

**Responsable:** Yazmin con rol Recepción.

Crear o asignar una tarea con estos datos:

| Campo | Valor |
| --- | --- |
| Tipo | `Administrativo` |
| Prioridad | `Normal` |
| Título | `Orientar ubicación de la clínica P29-R01` |
| Nota | `Persona ficticia solicita ayuda para llegar.` |
| Resultado | `Gestión completada` |
| Método | `Presencial` u otro método habilitado sin contacto real |

**Resultado esperado:** Yazmin (rol Recepción) completa la coordinación
administrativa. Con Recepción también podría trabajar seguimientos clínicos,
pero no puede registrar una consulta ni cerrar la propuesta médica (eso es del
Médico).

### Caso P29-18 — Recordatorio supervisado

**Responsable:** Marlen; Dirección configura la regla.

1. Abrir `/sigeco/seguimientos/recordatorios`.
2. Revisar las reglas de Control, Retorno y Recuperación.
3. Pulsar `Revisar eventos ahora`.
4. Elegir un candidato QA permitido.
5. Revisar paciente, canal, fecha, texto y responsable antes de aprobar.
6. Ejecutar la revisión de eventos otra vez.

**Resultado esperado:** una sola tarea por regla y evento. Ningún mensaje se
envía automáticamente. Un candidato sin consentimiento queda bloqueado.

### Caso P29-19 — Encuesta y reclamo con posible riesgo

**Responsable:** Dirección.

1. Abrir `/sigeco/opiniones` después de cerrar la visita principal.
2. Crear un enlace para Julia QA.
3. Forma de entrega: `En persona`.
4. Responsable: Dirección QA.
5. Vencimiento: `7 días`.
6. Copiar el enlace una sola vez y abrirlo en una ventana privada.
7. Completar:

| Pregunta | Respuesta de prueba |
| --- | --- |
| Calificación | `1 de 5` |
| Tipo | `Reclamo` |
| Área | `Consulta o tratamiento` |
| Comentario | `Durante esta prueba ficticia se informó una molestia que Dirección debe revisar.` |
| Posible riesgo o daño | `Sí` |
| Aviso de privacidad | aceptado |

8. Volver a `/sigeco/opiniones`.
9. Confirmar que el caso aparece como crítico y con plazo de 4 horas.
10. Cambiar a `En revisión` y registrar:
    `Caso completamente ficticio P29-R01; se verificó el escalamiento.`

**Resultado esperado:** el paciente no ve datos internos; el caso crítico queda
separado de una opinión común; la respuesta no se convierte en testimonio.

Este caso prueba la clasificación. No demuestra que existió un daño ni reemplaza
la revisión profesional de un incidente real.

### Caso P29-20 — Abandono por emergencia y pendientes

**Responsable:** Recepción y Dirección.

Usar la visita de retorno creada en P29-16:

1. Abrir `/sigeco/recepcion/visitas/[visitId-retorno]`.
2. Crear una tarea o derivar a Consulta para que exista un pendiente.
3. Abrir `No continuará`.
4. Motivo: `Emergencia`.
5. Marcar `Consulta` como pendiente.
6. Nota:
   `Escenario ficticio P29-R01; se detuvo el flujo para comprobar derivación externa.`
7. Solicitar recuperación solo porque existe consentimiento vigente.
8. Confirmar.
9. Abrir `/sigeco/recepcion/abandonos`.

**Resultado esperado:** visita cerrada como no continuará, punto de salida,
motivo, responsable y pendiente conservados; tarea abierta bloqueada; seguimiento
de recuperación para Recepción/Marlen.

Si una emergencia real ocurre durante el piloto, se detiene la prueba y se
aplica el protocolo clínico de la clínica. Primero se atiende a la persona;
SIGECO se completa después con información real y autorizada.

### Caso P29-21 — Duplicado y fusión sintética

**Responsable:** Recepción revisa; super administrador fusiona.

Este caso modifica de manera permanente los datos sintéticos de esa ejecución.
Hacerlo al final de la ejecución local. Después puede repetirse en un staging
reiniciable con un ID diferente.

1. Abrir `/sigeco/recepcion/nuevo`.
2. Nombre: `[QA P29-R01] Julia Mamani duplicada`.
3. Teléfono: `0000-2901`.
4. Confirmar que SIGECO muestra la ficha existente.
5. Para probar únicamente prevención, salir sin crear la ficha.
6. Para probar fusión, repetir y elegir conscientemente continuar como persona
   nueva.
7. Abrir `/sigeco/recepcion/duplicados`.
8. Comparar el candidato y ejecutar primero la simulación.
9. Confirmar cuál ficha se conserva.
10. Con super administrador, fusionar solo las dos fichas QA.

**Resultado esperado:** una ficha queda como principal; la duplicada conserva
la referencia a la principal; visitas, consentimientos y registros no se borran.

No fusionar pacientes reales durante un piloto sintético.

### Caso P29-22 — Captación y recorrido completo

**Responsable:** Dirección.

1. Abrir `/sigeco/atribucion`.
2. Filtrar la fecha del piloto y verificar Facebook como fuente declarada.
3. Abrir `/sigeco/reportes/recorrido`.
4. Buscar la visita principal.
5. Confirmar llegada, consulta finalizada, propuesta aceptada, una venta,
   Bs 50 vendidos, Bs 50 cobrados, seguimiento y retorno.
6. Confirmar que la visita no se duplica por pasar entre áreas.

**Resultado esperado:** cada cifra puede abrirse y compararse con su registro
fuente. Recordar que la visita manual QA puede entrar a los indicadores de la
base local.

### Caso P29-23 — Tiempo por área

**Responsable:** Dirección.

En `/sigeco/reportes/tiempos`:

1. filtrar por fecha del piloto y sucursal El Alto;
2. ubicar la visita principal;
3. revisar espera, atención, bloqueo y total;
4. comprobar que el abandono conserva tiempo hasta su salida;
5. anotar si el aviso de 30 minutos resulta útil para el personal.

**Resultado esperado:** los tiempos provienen de eventos de trabajo. Abrir una
pantalla por sí sola no debe contar como inicio de atención.

### Caso P29-24 — Caja y cierre

**Responsable:** Administración; Dirección revisa.

1. Volver a `/sigeco/administracion/caja`.
2. Confirmar movimientos: apertura Bs 100, almuerzo Bs 10, compra urgente
   Bs 10 y venta Bs 50.
3. Registrar:

| Canal | Contado o reportado |
| --- | ---: |
| Efectivo | `130.00` |
| QR | `0.00` |
| Tarjeta | `0.00` |
| Transferencia | `0.00` |
| Otro | `0.00` |

4. Observación: `Cierre ficticio reconciliado P29-R01`.
5. Cerrar y abrir la vista imprimible.

**Resultado esperado:** Caja cerrada, diferencia cero y documento de cierre con
responsables y movimientos.

**Caso de diferencia:** en otra ejecución, contar Bs 100 cuando el esperado es
Bs 130. Si supera el límite configurado, la Caja debe quedar esperando a
Dirección y bloquear movimientos. No borrar movimientos para cuadrar.

### Caso P29-25 — Auditoría importante

**Responsable:** Dirección.

Abrir `/sigeco/auditoria` y buscar por fecha, usuario o entidad. Comprobar que
existan eventos importantes para:

- ingreso o acceso denegado;
- consulta finalizada y corregida;
- propuesta aceptada;
- venta y pago;
- apertura, egresos y cierre de Caja;
- compra, recepción y lote;
- consentimiento;
- fusión, si se ejecutó;
- reclamo y revisión.

**Resultado esperado:** autor, fecha, acción y entidad visibles sin contraseñas,
diagnóstico completo ni notas sensibles copiadas innecesariamente.

### Caso P29-26 — Permisos por rol

Cada participante revisa su menú, abre una ruta permitida y escribe directamente
una ruta prohibida.

| Rol | Debe poder abrir | Ruta que debe rechazarse |
| --- | --- | --- |
| Recepción | `/sigeco/recepcion` | `/sigeco/consultas` |
| Médico | `/sigeco/consultas` | `/sigeco/administracion/caja` |
| Enfermería | `/sigeco/enfermeria` | `/sigeco/compras` |
| Administración | `/sigeco/administracion/caja` | `/sigeco/auditoria` |
| Yazmin (Recepción) | `/sigeco/seguimientos` | `/sigeco/inventario` |
| Dirección | `/sigeco/auditoria` | `/sigeco/usuarios` |

**Resultado esperado:** la ruta permitida abre; la prohibida vuelve a
`/sigeco`; no muestra datos ni botones durante un instante.

El super administrador prueba `/sigeco/usuarios`, pero no participa en tareas
diarias usando permisos superiores.

### Caso P29-27 — El Alto y Cochabamba

**Responsable:** Dirección.

1. Confirmar en la cabecera `El Alto` como sucursal activa.
2. Abrir `/sigeco/sucursales`.
3. Confirmar `El Alto: activa` y `Cochabamba: en preparación`.
4. Intentar seleccionar Cochabamba desde una cuenta que la tenga asignada.
5. Abrir `/sigeco/inventario/traslados`.

**Resultado esperado:** Cochabamba no admite operación ni traslado mientras
esté en preparación; las filas de Caja, compra, visita y stock del piloto
pertenecen a El Alto.

En local puede ejecutarse el dato sintético aislado:

```bash
pnpm branches:seed:synthetic
```

Ese comando se bloquea en staging y producción.

### Caso P29-28 — Móvil, red lenta y doble envío

**Responsable:** cada área y soporte.

Repetir las tareas principales en 390 × 844, 820 × 1180 y 1440 × 900:

- llegada;
- consentimiento;
- consulta;
- Enfermería;
- venta y pago;
- egreso de Caja;
- compra y recepción;
- seguimiento;
- encuesta;
- cierre imprimible.

Después:

1. activar red lenta desde las herramientas del navegador o usar una conexión
   móvil débil controlada;
2. escribir un formulario y cortar la conexión antes de guardar;
3. confirmar el aviso `Sin conexión`;
4. recuperar la conexión y guardar una sola vez;
5. hacer doble clic controlado en llegada, pago, egreso, compra y recepción;
6. revisar que exista una sola fila de cada operación;
7. cerrar sesión y comprobar que el borrador permitido de compra se limpie.

**Resultado esperado:** no hay desplazamiento horizontal de toda la página,
los controles son utilizables, lo escrito permanece cuando corresponde y no
se duplican dinero, visita o stock.

La historia clínica y los adjuntos no deben aparecer en `localStorage`,
`sessionStorage` ni caché offline.

### Caso P29-29 — Corte largo y contingencia

**Responsable:** todo el equipo.

1. Imprimir dos fichas desde `/sigeco/contingencia`.
2. Desconectar un dispositivo durante 10 minutos.
3. Registrar en papel una llegada ficticia con número temporal
   `P29-R01-CONT-01`.
4. Registrar un pago ficticio con el mismo número temporal.
5. Guardar las hojas bajo control de Dirección.
6. Recuperar SIGECO.
7. Una persona transcribe en orden y otra revisa pago y stock.
8. Escribir en la hoja el ID definitivo y marcar `Transcrito y revisado`.

**Resultado esperado:** ninguna hoja se pierde, ninguna operación se transcribe
dos veces y los datos temporales quedan unidos a los IDs definitivos.

### Caso P29-30 — Incidente de seguridad simulado

**Responsable:** Dirección y soporte técnico.

Escenario: `Teléfono de Recepción extraviado durante el piloto`.

1. Anotar hora, cuenta, dispositivo, ambiente y persona que detectó el caso.
2. Desde `/sigeco/usuarios`, el super administrador revoca todas las sesiones
   de la cuenta QA de Recepción.
3. Confirmar que el teléfono simulado vuelve a `/sigeco/login`.
4. Revisar `/sigeco/auditoria`.
5. Registrar causa, contención, resultado y responsable.

**Resultado esperado:** sesión revocada, acceso cortado y evidencia conservada.

El simulacro técnico local complementario es:

```bash
pnpm security:incident:drill:local
pnpm security:gate:local
```

El gate local no aprueba producción.

### Cierre técnico después de los 30 casos

Este bloque lo ejecuta soporte técnico, no los empleados. Primero se detiene
`pnpm dev`; no se corre el build mientras el servidor de desarrollo está
activo.

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm deps:check
pnpm security:gate:local
pnpm backup:drill:local
CI=1 pnpm run build
git diff --check
```

Reglas:

- `pnpm test:integration` reinicia únicamente la base configurada en
  `.env.test`; verificar esa variable antes de ejecutarlo;
- el simulacro de backup usa recursos locales aislados y no restaura encima de
  staging ni producción;
- un gate local aprobado no autoriza producción;
- anotar salida, cantidad de pruebas y errores sin copiar secretos;
- si un comando falla, el piloto queda `Repetir` o `Bloqueado` hasta corregir y
  ejecutar nuevamente.

## 11. Documentos Que Deben Resultar

| Documento o evidencia | Dónde se obtiene | Nombre sugerido |
| --- | --- | --- |
| Receta versión 1 | Consulta del paciente | `P29-R01-receta-v1.pdf` |
| Comprobante interno versión 1 | Detalle de venta | `P29-R01-comprobante-v1.pdf` |
| Cierre de Caja | Vista de cierre | `P29-R01-cierre-caja.pdf` |
| Documento de compra | Detalle de compra | `P29-R01-compra-A.pdf` |
| Documento de recepción | Detalle de compra | `P29-R01-recepcion-A.pdf` |
| Adjunto clínico ficticio | Panel de adjuntos | conservar solo en storage QA |
| Fichas de contingencia | `/sigeco/contingencia` | `P29-R01-contingencia-01/02` |
| Capturas | Pantallas indicadas | carpeta local `P29-R01-evidencia` |
| Registro de incidentes | plantilla de esta guía | `P29-R01-incidente.md` |
| Acta de aprobación | sección 16 | `P29-R01-aprobacion.md` |

Los PDFs internos contienen datos sintéticos, pero siguen siendo privados. No
se publican en redes, Drive abierto o repositorios públicos.

## 12. Evidencia Por Caso

Copiar esta tabla y usar una fila por caso:

| Caso | Fecha/hora | Rol | Dispositivo | Ruta | ID creado | Esperado | Obtenido | Tiempo | Evidencia | Estado | Responsable del defecto |
| --- | --- | --- | --- | --- | --- | --- | --- | ---: | --- | --- | --- |
| P29-01 |  |  |  |  |  |  |  |  |  | Pendiente |  |

Estados permitidos:

- `Aprobado`: coincidió con el resultado esperado sin ayuda;
- `Repetir`: hubo duda, ayuda o error menor;
- `Bloqueado`: no se puede continuar con seguridad;
- `No aplica`: solamente si Dirección explica por escrito por qué.

### Evidencia mínima obligatoria

- commit o versión probada;
- ambiente y URL, sin secretos;
- ID de ejecución;
- cuentas y roles, sin contraseñas;
- `patientId`, visitas, venta, Caja, compras y lotes;
- stock antes y después;
- efectivo esperado y contado;
- receta, comprobante y cierre;
- captura móvil y escritorio;
- acceso permitido y acceso rechazado por rol;
- errores encontrados y repetición después del arreglo;
- firma de cada responsable y Dirección.

## 13. Registro De Defectos

| ID | Caso | Qué hizo la persona | Qué esperaba | Qué ocurrió | Severidad | Evidencia | Responsable | Estado | Revalidación |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DEF-P29-R01-01 |  |  |  |  |  |  |  | Abierto |  |

Severidades:

- `Crítico`: fuga de datos, pérdida clínica o financiera, mezcla de sucursales,
  duplicación de pago/stock o contacto sin permiso;
- `Alto`: una función principal no puede completarse y no existe alternativa
  segura;
- `Medio`: la tarea se completa con dificultad o resultado confuso;
- `Bajo`: texto, alineación o mejora que no bloquea el trabajo.

Un defecto no se cierra porque “ya no apareció”. Se repite el mismo caso y se
adjunta nueva evidencia.

## 14. Cuándo Detener El Piloto

Detenerlo si ocurre cualquiera de estos casos:

- alguien ve información clínica, financiera o administrativa prohibida;
- se duplica una llegada, venta, pago, egreso, compra o movimiento de stock;
- se mezclan El Alto y Cochabamba;
- se pierde una consulta, firma, lote, adjunto o documento;
- Caja o inventario no pueden reconciliarse;
- se intenta contactar sin consentimiento vigente;
- un archivo privado queda disponible sin sesión;
- existe una emergencia real;
- no se puede confirmar si el ambiente es local, staging o producción.

Al detener:

1. no borrar ni corregir apresuradamente;
2. anotar hora y última acción confirmada;
3. conservar pantalla, URL sin datos sensibles e IDs;
4. cerrar o revocar sesiones si existe riesgo;
5. aplicar contingencia;
6. asignar responsable;
7. reanudar solo cuando Dirección y soporte lo autoricen.

## 15. Lista Final De Reconciliación

| Control | Valor esperado | Valor encontrado | Estado |
| --- | ---: | ---: | --- |
| Pacientes principales antes de fusión | 1 |  |  |
| Visita principal | 1 |  |  |
| Retorno en la misma ficha | 1 |  |  |
| Propuestas aceptadas | 1 |  |  |
| Ventas | 1 |  |  |
| Vendido | Bs 50 |  |  |
| Cobrado | Bs 50 |  |  |
| Saldo de la venta | Bs 0 |  |  |
| Suero recibido | 2 |  |  |
| Suero vendido | 1 |  |  |
| Suero disponible | 1 |  |  |
| Jeringas recibidas | 2 |  |  |
| Egresos de compra urgente | 1 de Bs 10 |  |  |
| Egresos de almuerzo | 1 de Bs 10 |  |  |
| Efectivo esperado | Bs 130 |  |  |
| Efectivo contado | Bs 130 |  |  |
| Diferencia de Caja | Bs 0 |  |  |
| Recetas emitidas | versión 1 |  |  |
| Comprobantes emitidos | versión 1 |  |  |
| Seguimientos completados | 1 clínico y 1 administrativo |  |  |
| Abandonos por emergencia ficticia | 1 |  |  |
| Reclamos críticos ficticios | 1 |  |  |

## 16. Aprobación Del Personal Y Dirección

| Área | Persona que probó | Casos | ¿Terminó sin ayuda? | ¿Acceso prohibido bloqueado? | Defectos abiertos | Firma o confirmación | Dirección |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Recepción |  | P29-08 a P29-10, P29-20 a P29-21 |  |  |  |  | Pendiente |
| Médico |  | P29-11 a P29-13 |  |  |  |  | Pendiente |
| Enfermería |  | P29-14 |  |  |  |  | Pendiente |
| Administración |  | P29-02 a P29-07, P29-15, P29-24 |  |  |  |  | Pendiente |
| Marlen/Recepción |  | P29-16, P29-18 |  |  |  |  | Pendiente |
| Yazmin/Recepción |  | P29-17 |  |  |  |  | Pendiente |
| Dirección |  | P29-19, P29-22 a P29-27, P29-30 |  |  |  |  | Pendiente |
| Dispositivos y red |  | P29-28 a P29-29 |  |  |  |  | Pendiente |

La Tarea 29 solo termina cuando:

- todos los casos obligatorios están aprobados;
- cada empleado completa sus tareas principales;
- Caja e inventario cuadran;
- no quedan defectos críticos o altos abiertos;
- los defectos corregidos fueron repetidos;
- Dirección firma cada área;
- se conserva la evidencia;
- producción sigue sin cambios hasta una autorización independiente.

## 17. Cómo Repetir El Piloto

Para una nueva ejecución:

1. aumentar el ID: `P29-R02`;
2. cambiar teléfonos, correos, códigos, documentos y lotes;
3. mantener los mismos montos si se desea comparar resultados;
4. no editar ni borrar la evidencia anterior;
5. confirmar nuevamente la rama `develop`, `.env` local y localhost;
6. decidir si se conserva la base local o se prepara otra base local aislada;
7. repetir primero los casos que fallaron y después el recorrido completo;
8. emitir una nueva acta de aprobación;
9. repetir posteriormente en staging con otro ID si el recorrido local fue
   aprobado.

No se limpia una prueba borrando auditoría, versiones clínicas, movimientos de
Caja o stock. En local o staging autorizado se reinicia el ambiente completo;
en producción las correcciones se hacen con registros compensatorios y bajo un
procedimiento distinto.

## 18. Documentación De Apoyo

Estas guías explican cada módulo con más detalle:

- [Staging aislado](./staging.md)
- [Usuarios, roles y sesiones](./internal-users-sessions.md)
- [Permisos, privacidad, logs y secretos](./permissions-privacy-secrets.md)
- [Auditoría append-only](./audit-events.md)
- [Adjuntos clínicos seguros](./clinical-attachments.md)
- [Backup y restauración comprobada](./backup-restore.md)
- [Respuesta a incidentes](./incident-response.md)
- [Consentimientos](./patient-consents.md)
- [Procedencia geográfica](./geographic-origin.md)
- [Captación y atribución](./capture-attribution.md)
- [Duplicados y fusión](./patient-duplicates.md)
- [Actualización de bandejas](./operational-queue-refresh.md)
- [Resultado de la propuesta](./treatment-proposal-outcomes.md)
- [Tipos y resultados de seguimiento](./follow-up-classification.md)
- [Abandono y pendientes](./visit-discontinuations.md)
- [Correcciones y firma clínica](./clinical-record-versioning.md)
- [Caja, egresos y cierre](./cash-sessions-expenses-close.md)
- [Productos y proveedores](./product-catalog-suppliers.md)
- [Compras, recepciones, lotes y stock](./purchases-receipts-batches-stock.md)
- [Recetas y comprobantes](./versioned-prescriptions-receipts.md)
- [Reporte del recorrido](./patient-journey-report.md)
- [Tiempo por área](./area-service-times.md)
- [Recordatorios supervisados](./supervised-reminders.md)
- [Encuestas y reclamos](./patient-feedback-complaints.md)
- [Móvil y conectividad lenta](./mobile-slow-connectivity.md)
- [Integración Payload-SIGECO](./payload-sigeco-integration.md)
- [Operación multi-sucursal](./multi-branch-operations.md)
- [Pruebas técnicas](./testing.md)

La guía anterior de [prueba manual V3.7](./sigeco-v3-full-flow-testing.md)
permanece como referencia histórica del recorrido base. Para el piloto de las
Tareas 1 a 29, esta guía es la fuente operativa vigente.
