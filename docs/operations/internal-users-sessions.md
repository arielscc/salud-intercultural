# Usuarios, Roles Y Sesiones De SIGECO

Esta guía describe cómo administrar las cuentas del personal sin scripts
manuales y sin compartir usuarios entre empleados.

## Responsabilidades

- Solo `super_admin` tiene el permiso `users_manage`.
- Cada empleado puede cambiar su contraseña y cerrar sus propias sesiones.
- Dirección puede consultar auditoría, pero no administrar accesos.
- `captacion` permanece únicamente para migrar cuentas antiguas y no puede
  asignarse a usuarios nuevos.

## Administración En Escritorio

La ruta `/sigeco/usuarios` permite:

- crear una cuenta con nombre, email, rol vigente y contraseña temporal;
- corregir el nombre visible de la cuenta sin cerrar sus sesiones;
- activar o desactivar una cuenta;
- cambiar su rol;
- exigir cambio de contraseña;
- desbloquear intentos fallidos;
- cerrar todas sus sesiones;
- consultar último acceso y sesiones activas.

La gestión compleja se oculta en móvil. En teléfonos se dirige al empleado a
`/sigeco/mi-cuenta`.

## Reglas De Seguridad

- Una cuenta nueva debe cambiar la contraseña temporal al ingresar.
- Toda contraseña (temporal o de cambio propio) debe tener al menos 6 caracteres
  e incluir mayúsculas, minúsculas y números.
- Además se rechazan contraseñas comunes o con patrones fáciles de adivinar; la
  validación usa la librería `@zxcvbn-ts` (diccionarios común y en español) y
  exige un puntaje mínimo de 2 sobre 4.
- La contraseña nueva debe ser diferente de la anterior.
- Corregir el nombre de una cuenta no cierra sus sesiones; cambiar rol o estado
  sí las cierra.
- Roles retirados (`captacion` y `seguimiento`): no se asignan a cuentas nuevas
  ni aparecen en el selector; conservan solo acceso mínimo hasta reasignarse.
  `seguimiento` se retiró el 2026-08-02 y sus cuentas pasaron a Recepción.
- Mientras el cambio esté pendiente, las páginas y acciones operativas quedan
  bloqueadas.
- Cambiar rol o estado revoca inmediatamente las sesiones del usuario.
- Desactivar una cuenta corta su acceso.
- Un super administrador no puede cambiar su propio rol ni desactivarse.
- Nunca puede desactivarse o degradarse al último super administrador activo.
- La protección del último super administrador también cubre cambios
  simultáneos mediante una transacción serializable.
- Las contraseñas nunca se incluyen en auditoría, URLs o mensajes de éxito.

## Sesiones Propias

`/sigeco/mi-cuenta` muestra:

- dispositivo o navegador resumido;
- inicio y vencimiento de cada sesión;
- identificación de la sesión actual;
- botón para cerrar una sesión reconocida o desconocida;
- formulario para cambiar la contraseña.

Al cambiar la contraseña se conservan únicamente la sesión actual y se cierran
las demás. Si el empleado cierra la sesión actual, vuelve a la pantalla de
ingreso.

El sistema guarda una etiqueta corta como `Chrome en Android`; no almacena el
user-agent completo ni una dirección IP.

## Auditoría

Se registran como eventos importantes:

- creación de usuario;
- cambio de rol o estado;
- exigencia de nueva contraseña;
- desbloqueo;
- revocación de sesiones;
- cambio de contraseña, sin guardar su contenido;
- accesos denegados.

Abrir la lista de usuarios o `Mi cuenta` no genera auditoría.

## Operación Recomendada

1. Crear una cuenta individual para cada empleado.
2. Entregar la contraseña temporal directamente, no en grupos.
3. Confirmar que el empleado realizó el primer cambio.
4. Desactivar la cuenta el mismo día que una persona deja de trabajar.
5. Revocar sesiones ante pérdida de teléfono o actividad desconocida.
6. Revisar periódicamente cuentas inactivas y roles asignados.

Ante un teléfono perdido, acceso sospechoso o cuenta comprometida, seguir
[Respuesta a incidentes y gate de seguridad](./incident-response.md).
