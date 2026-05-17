# Autenticacion Y Proteccion Del Admin

## Estrategia

El panel administrativo usa la autenticacion nativa de Payload CMS.

- Ruta protegida: `/admin`
- Login: `/admin/login`
- Logout: `/admin/logout`
- Usuario autenticable: collection `users`
- Roles iniciales: `admin` y `editor`
- Sesiones: cookies HTTP de Payload con expiracion configurable

No se implementa un login paralelo con Next.js para evitar dos fuentes de sesion. Payload controla la sesion, el refresh, el logout y el estado de sesion expirada dentro del admin.

## Roles

`admin`

- Puede crear, actualizar y eliminar contenido protegido segun las reglas de cada collection.
- Puede administrar usuarios.
- Puede eliminar leads.

`editor`

- Puede crear y actualizar contenido publico.
- Puede leer y actualizar leads.
- No puede administrar usuarios ni eliminar recursos restringidos a admin.

## Proteccion De Rutas

Payload protege `/admin` mediante `admin.user = "users"` en `payload.config.ts`.

Cuando no hay sesion valida, Payload redirige al flujo de login. Si la sesion expira, el admin vuelve a solicitar autenticacion.

## Proteccion De Endpoints

Los endpoints REST y GraphQL de Payload respetan las reglas de acceso declaradas en collections y globals:

- `lead-submissions`: lectura/creacion/actualizacion para `admin` o `editor`; eliminacion solo `admin`.
- `users`: lectura para usuarios autenticados; creacion/actualizacion/eliminacion solo `admin`.
- contenido publico: lectura publica solo de registros activos; lectura completa para usuarios autenticados.
- `site-settings`: lectura publica controlada; actualizacion para `admin` o `editor`.

El GraphQL Playground queda protegido con sesion admin y redirige a `/admin/login` si no hay usuario autenticado.

## Flujos

Login:

1. El usuario entra a `/admin`.
2. Payload detecta ausencia de sesion.
3. Payload muestra `/admin/login`.
4. Si las credenciales son validas, crea sesion y vuelve al panel.

Logout:

1. El usuario usa la accion de logout del admin.
2. Payload revoca la sesion.
3. La siguiente visita a `/admin` solicita login.

Sesion expirada:

1. Payload valida la cookie/JWT en cada request administrativo.
2. Si la sesion expiro, el usuario vuelve al login.
3. La duracion se controla con `ADMIN_SESSION_SECONDS`.

## Variables De Entorno

```env
PAYLOAD_SECRET=""
PAYLOAD_PUBLIC_SERVER_URL="http://localhost:3000"
PAYLOAD_DB_SCHEMA="payload"

ADMIN_EMAIL=""
ADMIN_PASSWORD=""
ADMIN_SESSION_SECONDS="28800"
ADMIN_LOCK_MINUTES="10"
```

Notas:

- `PAYLOAD_SECRET` debe ser largo, privado y distinto por ambiente.
- `ADMIN_EMAIL` y `ADMIN_PASSWORD` se usan para crear o sembrar el primer usuario admin cuando corresponda.
- `ADMIN_SESSION_SECONDS` controla la duracion del token de sesion. El valor recomendado inicial es 8 horas.
- `ADMIN_LOCK_MINUTES` controla el bloqueo temporal tras varios intentos fallidos.

## Archivos Relevantes

- `payload.config.ts`
- `src/payload/collections/Users.ts`
- `src/payload/access.ts`
- `src/modules/auth/admin.ts`
- `src/app/(payload)/api/graphql-playground/route.ts`
