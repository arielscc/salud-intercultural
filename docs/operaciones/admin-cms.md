# Admin Y CMS

El admin esta en `/admin` y usa autenticacion nativa de Payload. Detalles de auth: [docs/admin-auth.md](../admin-auth.md).

## Roles

- `admin`: administra usuarios, contenido y puede eliminar leads.
- `editor`: administra contenido y puede leer/actualizar leads, sin administrar usuarios.

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
