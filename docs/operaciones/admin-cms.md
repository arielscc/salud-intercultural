# Admin Y CMS

El admin esta en `/admin` y usa autenticacion nativa de Payload CMS. No existe un login paralelo con Next.js; Payload controla sesion, refresh, logout y expiracion.

Rutas principales:

- Admin protegido: `/admin`
- Login: `/admin/login`
- Logout: `/admin/logout`
- Usuario autenticable: collection `users`

## Roles

- `admin`: administra usuarios, contenido y puede eliminar leads.
- `editor`: administra contenido y puede leer/actualizar leads, sin administrar usuarios.

## Autenticacion Y Sesiones

Payload protege `/admin` con `admin.user = "users"` en `payload.config.ts`.

Si no hay sesion valida, Payload redirige al flujo de login. Si la sesion expira, el admin vuelve a solicitar autenticacion.

La collection `users` configura:

- Sesiones con cookies HTTP de Payload.
- `sameSite="Lax"`.
- Cookies seguras en produccion.
- Maximo de 5 intentos fallidos.
- Bloqueo temporal controlado por `ADMIN_LOCK_MINUTES`.
- Duracion de sesion controlada por `ADMIN_SESSION_SECONDS`.

Variables relacionadas:

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
- `ADMIN_SESSION_SECONDS` recomendado inicial: 8 horas.
- `ADMIN_LOCK_MINUTES` controla el bloqueo temporal tras intentos fallidos.

## Proteccion De Endpoints

Los endpoints REST y GraphQL de Payload respetan las reglas de acceso declaradas en collections y globals:

- `lead-submissions`: lectura, creacion y actualizacion para `admin` o `editor`; eliminacion solo `admin`.
- `users`: lectura para usuarios autenticados; creacion, actualizacion y eliminacion solo `admin`.
- Contenido publico: lectura publica solo de registros activos; lectura completa para usuarios autenticados.
- `site-settings`: lectura publica controlada; actualizacion para `admin` o `editor`.

El GraphQL Playground requiere sesion admin valida y redirige a `/admin/login` cuando no hay usuario autenticado.

## Colecciones principales

- `services`: servicios paUblicos.
- `team-members`: equipo.
- `testimonials`: testimonios.
- `faqs`: preguntas frecuentes.
- `pages`: paginas publicas base y SEO editable.
- `media`: imagenes y videos.
- `lead-submissions`: leads recibidos.
- `users`: usuarios del admin.

## Globals

- `site-settings`: marca, contacto, conversion, redes y SEO global.
- `home-content`: hero, estadisticas, servicios destacados, video y bloques editables de la home.

## Media

La collection `media` acepta:

- `image/*`
- `video/*`

En produccion/staging, Vercel Blob se activa con:

```env
BLOB_READ_WRITE_TOKEN=""
```

Las imagenes pueden usarse en campos CMS y se sirven desde Blob. Los videos se administran como media, pero no se renderizan con `next/image`.

## Fallbacks

El sitio publico usa contenido CMS si esta disponible. Si Payload o PostgreSQL no estan disponibles, usa datos fallback desde `src/data`.

Archivo relevante:

- `src/lib/cms/public-content.ts`

## Archivos Relevantes

- `payload.config.ts`
- `src/payload/collections/Users.ts`
- `src/payload/access.ts`
- `src/modules/auth/admin.ts`
- `src/app/(payload)/api/graphql-playground/route.ts`

## Agregar Servicios

Desde `/admin`:

1. Crear registro en `services`.
2. Completar `slug`, `title`, `description`, imagen, `imageAlt`, beneficios, problemas relacionados y mensaje de WhatsApp.
3. Marcar `active` para hacerlo visible.
4. Marcar `featured` si debe aparecer como destacado.
5. Ajustar `order`.
6. Completar SEO.

El listado publico usa `/servicios`. Actualmente no hay paginas individuales por servicio.

## Agregar Paginas Futuras

Para paginas nuevas reales se requiere codigo y CMS:

1. Agregar ruta en `src/app/(public)`.
2. Agregar entrada en `src/config/routes.ts` si debe aparecer en navegacion.
3. Agregar metadata en `src/lib/seo.ts` si debe entrar en sitemap.
4. Crear o ajustar contenido en `pages` si serae administrable.
5. Validar `SEOJsonLd`, canonical y sitemap.

No basta con crear un documento en Payload `pages`; las rutas publicas principales estan implementadas en Next.
