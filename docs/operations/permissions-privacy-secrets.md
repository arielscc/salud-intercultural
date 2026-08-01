# Permisos, Privacidad, Logs Y Secretos De SIGECO

Esta guía define qué puede ver y modificar cada rol, qué datos no deben salir
de SIGECO y cómo administrar los secretos de cada ambiente.

## Principios

1. Ocultar un botón no reemplaza la validación del servidor.
2. Cada página y acción de datos exige un permiso en el servidor.
3. Los nombres, teléfonos, emails y datos clínicos no viajan en URLs.
4. Los logs registran resultados técnicos, no contraseñas ni datos de pacientes.
5. SIGECO, Payload Admin y sus API privadas no se indexan ni se almacenan en caché.
6. Payload y marketing administran contenido público y leads; no reciben historia clínica.
7. Los secretos no usan el prefijo `NEXT_PUBLIC_`.

## Matriz De Acceso

Leyenda: `L` lectura, `E` escritura, `F` finalización, `C` corrección,
`A` ajuste sensible y `—` sin acceso.

| Módulo | Super administrador | Dirección | Médico | Recepción | Administración | Enfermería | Seguimiento |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Cuenta y sesiones propias | L/E | L/E | L/E | L/E | L/E | L/E | L/E |
| Pacientes | L/E | L | L | L/E | L | L | L |
| Visitas y recorrido | L/E | L | L/E | L/E | L/E | L | — |
| Consulta clínica | L/E/F/C | L | L/E/F/C | — | — | — | — |
| Enfermería | L/E | L | L | — | — | L/E | — |
| Estudios | L/E | L | L | — | — | L/E | — |
| Ventas y cobros | L/E | L | — | — | L/E | — | — |
| Seguimientos | L/E | L | L/E | L/E | L/E | — | L/E |
| Recordatorios supervisados | L/E | L/E reglas | — | L/E revisión | — | — | — |
| Encuestas y reclamos | L/E | L/E | — | — | — | — | — |
| Inventario | L/E/A | L | — | — | L/E | — | — |
| Reportes | L | L | — | — | — | — | — |
| Auditoría | L | L | — | — | — | — | — |
| Usuarios y roles | L/E | — | — | — | — | — | — |
| Adjuntos clínicos | L/E/A | L | L/E | — | — | L/E | — |
| Consentimientos | L/E | L | L | L/E | L | L | L |
| Abandono y pendientes | L/E | L | L/E | L/E | L/E | L/E | — |
| Tiempos por área | L/E | L | E | E | E | E | — |
| Recetas versionadas | L/E/C | L | L/E/C | — | — | — | — |
| Comprobantes internos | L/E | L | — | — | L/E | — | — |
| Configuración profesional | E | E | — | — | — | — | — |

En Seguimientos, `L/E` no significa que todos puedan trabajar todas las tareas.
Médico atiende la relación clínica y las llamadas médicas; Recepción/Marlen
atiende evolución, retorno y recuperación de tratamiento; Administración y el
rol técnico Seguimiento trabajan únicamente la relación administrativa. Esta
separación también se valida en el servidor.

En Recordatorios, Dirección configura reglas pero no aprueba contactos.
Recepción/Marlen revisa candidatos, pero no cambia reglas. El super
administrador puede realizar ambas acciones para soporte técnico. La aprobación
vuelve a comprobar el consentimiento antes de crear el seguimiento.

En Encuestas y reclamos, Dirección y el super administrador crean enlaces,
leen respuestas, asignan responsables y registran decisiones internas. Los
demás roles no ven la bandeja. El paciente solo accede a una fachada pública
que omite todos los datos internos.

En abandono y pendientes, la escritura solo registra que una visita activa no
continuará. No permite reabrirla ni eliminar órdenes o tareas pendientes.

En consulta clínica, guardar un borrador no concede automáticamente permiso
para finalizar o corregir. Dirección puede revisar el registro vigente y todas
sus versiones, pero no cambiar el contenido clínico.

El rol retirado `captacion` solo conserva acceso a su cuenta hasta ser
reasignado. No puede operar pacientes, leads internos ni módulos clínicos.

## Cómo Se Aplica La Matriz

- La navegación usa la misma matriz que el servidor.
- Las páginas usan `requirePermission` antes de consultar datos.
- Las acciones importantes usan `runAuditedAction`, que valida sesión, cambio
  obligatorio de contraseña y permiso.
- Las consultas Prisma solo se llaman desde páginas o acciones protegidas.
- La búsqueda global de pacientes se oculta cuando el rol no posee
  `patients_read`.
- Los accesos denegados importantes se registran en la auditoría append-only.

Las pruebas automatizadas enumeran las páginas, acciones y rutas privadas de
adjuntos. Si aparece una superficie nueva sin política, la suite debe fallar.

Recepción y el super administrador son los únicos roles que pueden registrar
una decisión de consentimiento. Consultar una decisión no autoriza usarla para
otra finalidad. Ver [Consentimientos y preferencias de contacto](./patient-consents.md).

## Archivos Y Exportaciones

SIGECO entrega adjuntos mediante concesiones de dos minutos y un solo uso
enviadas por `POST`, nunca mediante una URL pública. La collection `media` de
Payload sigue siendo exclusivamente editorial y pública.

Las recetas y comprobantes PDF se generan desde snapshots inmutables. Exigen
sesión y permiso según el tipo, usan `private, no-store` y auditan descarga y
reimpresión. Cualquier ruta futura de descarga, adjunto o exportación también
debe declarar un permiso de servidor.

## Datos Permitidos En URLs

Se permiten:

- identificadores opacos de paciente, visita, venta, tarea o usuario;
- número de página;
- fechas;
- estados y códigos de filtros controlados;
- códigos de aviso o error definidos por la aplicación.

No se permiten:

- nombre, teléfono, email, dirección o documento;
- motivo de consulta, diagnóstico, tratamiento, receta o notas;
- texto escrito en una búsqueda de pacientes;
- nombre de producto, existencia o cantidades internas de un error;
- contraseñas, tokens, cookies o secretos.

La búsqueda de pacientes se realiza mediante una acción autenticada. El texto
permanece en memoria durante la búsqueda y no se agrega al historial del navegador.

## Logs Y Errores

- Prisma no imprime consultas SQL y usa errores mínimos.
- Los scripts muestran el nombre de la operación y un código técnico seguro.
- Los mensajes completos de excepciones no se imprimen porque pueden contener
  URLs de base, emails u otros datos.
- Los errores visibles usan códigos controlados como `invalid` o
  `insufficient-stock`.
- Las contraseñas y tokens nunca forman parte de auditoría.
- Para investigar un fallo, usar el request ID y revisar la operación afectada;
  no copiar datos clínicos a tickets o chats.

## Caché, Referencias E Indexación

Las rutas `/sigeco`, `/admin` y `/api` reciben:

- `Cache-Control: private, no-store`;
- `Referrer-Policy: no-referrer`;
- `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet`;
- `X-Content-Type-Options: nosniff`;
- `X-Frame-Options: DENY`.

Las páginas internas también son dinámicas y SIGECO declara `robots` sin
indexación. Al abrir WhatsApp u otra página externa no se envía la ruta interna
como referencia.

## Separación De Marketing, Payload Y SIGECO

| Superficie | Datos permitidos | Datos prohibidos |
| --- | --- | --- |
| Sitio y analytics | Ruta pública, origen del formulario, fuente y evento | Nombre, teléfono, email, paciente, diagnóstico o tratamiento |
| Payload | Contenido, media editorial, configuración y leads públicos | Pacientes, visitas, consulta, receta, cobros e historia clínica |
| SIGECO | Datos operativos y clínicos según el rol | Envío automático a analytics o collections editoriales |

Los datos de un formulario público pueden permanecer como lead en Payload.
Solo se convierten en paciente dentro del flujo protegido de SIGECO.

## Propiedad Y Rotación De Secretos

Dirección autoriza accesos remotos y el equipo técnico ejecuta la configuración.
Los valores viven en el almacén de variables de Vercel o en archivos locales
ignorados por Git.

| Secreto | Ambientes | Propietario operativo | Cuándo rotar |
| --- | --- | --- | --- |
| `DATABASE_URL` | Local, test, staging y producción | Equipo técnico; Dirección autoriza producción | Incidente, salida de una persona con acceso, cambio de proveedor o revisión semestral |
| `PAYLOAD_SECRET` | Todos; 32+ caracteres en staging y producción | Equipo técnico | Incidente, acceso no autorizado o revisión semestral |
| `BLOB_READ_WRITE_TOKEN` | Producción | Equipo técnico | Incidente, cambio de store o revisión semestral |
| `STAGING_BLOB_READ_WRITE_TOKEN` | Staging | Equipo técnico | Incidente, reinicio del store o revisión semestral |
| `CLINICAL_BLOB_READ_WRITE_TOKEN` | Producción | Equipo técnico; Dirección autoriza acceso | Incidente, cambio del store privado o revisión semestral |
| `STAGING_CLINICAL_BLOB_READ_WRITE_TOKEN` | Staging | Equipo técnico | Incidente, reinicio del store clínico QA o cierre del ciclo de pruebas |
| `ADMIN_PASSWORD` | Seed temporal de Payload | Dirección entrega; equipo técnico ejecuta | En cada uso; eliminar la variable después del seed |
| `INTERNAL_ADMIN_PASSWORD` | Bootstrap temporal de SIGECO | Super administrador | En cada uso; eliminar la variable después del seed |
| `STAGING_QA_PASSWORD` | Staging | Equipo técnico | Al compartirla, cambiar personal QA o cerrar un ciclo de pruebas |
| `BACKUP_DATABASE_URL` | Producción, cuando se active | Equipo técnico; Dirección autoriza producción | Incidente, cambio del runner o revisión semestral |
| `BACKUP_ENCRYPTION_KEY` | Backup y restauración | Dirección custodia recuperación; equipo técnico ejecuta | Incidente, acceso no autorizado o rotación anual comprobada con una restauración |
| Credencial del destino de backup | Producción, cuando se active | Dirección y equipo técnico | Incidente, cambio de proveedor o revisión semestral |
| `RESTORE_DATABASE_URL` | Recuperación autorizada | Equipo técnico; Dirección autoriza | Crear para cada recuperación y revocar al terminar |

Los emails de seed, nombres de schema, duraciones y variables
`NEXT_PUBLIC_*` no son secretos, aunque los emails internos siguen siendo
datos personales.

## Procedimiento De Rotación

1. Confirmar el ambiente y el propietario.
2. Generar un valor nuevo con el proveedor o un generador criptográfico.
3. Guardarlo únicamente en el ambiente correcto.
4. Desplegar y validar ingreso, base, media o seed según corresponda.
5. Revocar el valor anterior.
6. Cerrar sesiones cuando cambie `PAYLOAD_SECRET`.
7. Registrar fecha, responsable, ambiente y resultado; nunca registrar el valor.
8. Revisar logs del proveedor durante la ventana de posible exposición.

Si un secreto apareció en Git, chat o captura, se considera comprometido:
primero se revoca, luego se reemplaza y finalmente se investiga el período de
exposición.

Las credenciales de backup, cifrado, almacenamiento de copias y restauración
deben tener alcances separados. El procedimiento completo está en
[Backup y restauración de SIGECO](./backup-restore.md).

La revocación y rotación durante un incidente se ejecutan en el orden definido
en [Respuesta a incidentes y gate de seguridad](./incident-response.md).
