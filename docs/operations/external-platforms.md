# External Platforms

Guia operativa para revisar dominios, proveedores externos y credenciales de Salud Intercultural V2. Este documento reemplaza los checklists sueltos de dominio y servicios externos.

## Estado Actual Verificado

El proyecto esta preparado para operar con:

- Dominio canonico: `https://saludintercultural.com`
- Dominio secundario: `https://www.saludintercultural.com`
- Staging: `https://staging.saludintercultural.com`
- Hosting: Vercel
- Base de datos: PostgreSQL, documentada para Neon o proveedor compatible
- CMS: Payload dentro de Next.js
- Media persistente: Vercel Blob cuando `BLOB_READ_WRITE_TOKEN` existe
- Analytics: GA4 con `NEXT_PUBLIC_GA_ID`
- Meta Pixel: `NEXT_PUBLIC_META_PIXEL_ID`
- Search Console: `GOOGLE_SITE_VERIFICATION`
- Contacto publico: WhatsApp, llamada, email y Google Maps por variables `NEXT_PUBLIC_*`

## Evidencia En El Proyecto

- Variables documentadas en `.env.example` y validadas en `src/lib/env.ts`.
- SEO canonico centralizado en `src/lib/seo.ts`.
- Metadata y verificacion de Google en `src/app/(public)/layout.tsx`.
- `robots.txt` y `sitemap.xml` implementados en `src/app/robots.ts` y `src/app/sitemap.ts`.
- Analytics implementado en `src/features/analytics`.
- Payload configurado en `payload.config.ts`.
- Vercel Blob activado condicionalmente en `payload.config.ts`.
- `next/image` permite media de Blob en `next.config.mjs`.
- Leads publicos entran por `src/app/api/leads/route.ts`.

## DNS Y Dominio

Checklist de produccion:

1. [x] Dominio final definido: `saludintercultural.com`.
2. [x] `www.saludintercultural.com` definido como secundario o redirect.
3. [x] `staging.saludintercultural.com` definido para revision publicada.
4. [x] Variables publicas documentadas para dominio final.
5. [x] Sitemap y canonical preparados para el dominio final.

Validaciones cuando cambie el dominio:

1. Confirmar DNS en Cloudflare o proveedor DNS.
2. Confirmar dominios en Vercel.
3. Confirmar SSL activo.
4. Confirmar `NEXT_PUBLIC_SITE_URL`.
5. Confirmar `PAYLOAD_PUBLIC_SERVER_URL`.
6. Revisar `robots.txt`, `sitemap.xml`, canonical y Open Graph.

## Vercel

Configuracion esperada:

| Item | Valor |
| --- | --- |
| Framework | Next.js |
| Install command | `pnpm install` |
| Build command | `pnpm run build` |
| Production branch | `main` |
| Staging branch | `staging` como Preview Deployment |
| Node | 22.x recomendado |

Variables requeridas en Vercel:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SITE_NAME`
- `NEXT_PUBLIC_WHATSAPP_NUMBER`
- `NEXT_PUBLIC_CALL_PHONE`
- `NEXT_PUBLIC_CONTACT_EMAIL`
- `NEXT_PUBLIC_GOOGLE_MAPS_URL`
- `DATABASE_URL`
- `PAYLOAD_SECRET`
- `PAYLOAD_PUBLIC_SERVER_URL`
- `PAYLOAD_DB_SCHEMA`
- `BLOB_READ_WRITE_TOKEN` si se usara media persistente

Variables opcionales:

- `NEXT_PUBLIC_GA_ID`
- `NEXT_PUBLIC_META_PIXEL_ID`
- `GOOGLE_SITE_VERIFICATION`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_RESET_PASSWORD_ON_SEED`
- `ADMIN_SESSION_SECONDS`
- `ADMIN_LOCK_MINUTES`

Detalle completo: [variables de entorno](./environment-variables.md).

## PostgreSQL / Neon

Checklist:

1. [x] `DATABASE_URL` soportado por Prisma y Payload.
2. [x] Prisma usa PostgreSQL en `prisma/schema.prisma`.
3. [x] Payload usa `@payloadcms/db-postgres`.
4. [x] Schema de Payload controlado por `PAYLOAD_DB_SCHEMA`.
5. [x] Migraciones productivas disponibles con `pnpm db:deploy`.

Reglas operativas:

- Usar bases separadas para local, staging y produccion.
- No ejecutar `pnpm db:reset` contra staging o produccion.
- Rotar cualquier password expuesta por chat, logs o commits.
- Verificar siempre a que base apunta `DATABASE_URL` antes de seeds o migraciones.

Detalle completo: [base de datos y migraciones](./database-migrations.md).

## Payload CMS

Payload no requiere cuenta externa. Requiere variables, base de datos y usuario admin.

Checklist:

1. [x] Collections configuradas: usuarios, media, servicios, testimonios, FAQs, equipo, paginas y leads.
2. [x] Globals configurados: `site-settings` y `home-content`.
3. [x] Admin disponible en `/admin`.
4. [x] API de Payload disponible en `/api`.
5. [x] GraphQL protegido mediante sesion admin para playground.
6. [x] Usuario admin inicial puede crearse por seed con `ADMIN_EMAIL` y `ADMIN_PASSWORD`.

Detalle completo: [admin y CMS](./admin-cms.md).

## Vercel Blob

Checklist:

1. [x] Storage local disponible en desarrollo cuando `BLOB_READ_WRITE_TOKEN` esta vacio.
2. [x] Vercel Blob se activa cuando existe `BLOB_READ_WRITE_TOKEN`.
3. [x] Media de Blob permitida en `next/image`.
4. [x] Collection `media` acepta imagenes y videos.

Recomendacion:

- Usar tokens separados para staging y produccion.
- No mezclar media de prueba con media real.
- Revisar peso, alt text y aspect ratio antes de publicar.

Detalle completo: [media](./media.md).

## Analytics, Meta Y Search Console

Checklist:

1. [x] GA4 soportado por `NEXT_PUBLIC_GA_ID`.
2. [x] Meta Pixel soportado por `NEXT_PUBLIC_META_PIXEL_ID`.
3. [x] Search Console soportado por `GOOGLE_SITE_VERIFICATION`.
4. [x] Eventos no envian nombres, telefonos, emails, mensajes ni query strings.
5. [x] `dataLayer` queda disponible para integraciones futuras.

Eventos implementados:

- `page_view`
- `whatsapp_click`
- `call_click`
- `cta_click`
- `form_submit`

Detalle completo: [analytics y eventos](./analytics.md).

## Contacto Publico

El sitio usa links publicos, no APIs externas pagadas.

Variables:

- `NEXT_PUBLIC_WHATSAPP_NUMBER`
- `NEXT_PUBLIC_CALL_PHONE`
- `NEXT_PUBLIC_CONTACT_EMAIL`
- `NEXT_PUBLIC_GOOGLE_MAPS_URL`

Checklist:

1. [x] WhatsApp principal documentado.
2. [x] Llamada principal documentada.
3. [x] Email publico documentado.
4. [x] Google Maps soportado por URL publica.
5. [x] CTAs trackeados por analytics.

## Revision De Lanzamiento

Antes de publicar o despues de cambiar plataforma/dominio:

1. Abrir home, rutas publicas principales y `/admin`.
2. Revisar login admin.
3. Enviar un lead de prueba.
4. Probar WhatsApp, llamada, email y Maps.
5. Revisar `robots.txt` y `sitemap.xml`.
6. Revisar canonical y Open Graph.
7. Revisar GA4 Realtime si esta activo.
8. Revisar Meta Pixel Helper si esta activo.
9. Revisar logs de build, runtime y functions en Vercel.

## Referencias

- [Deploy](./deploy.md)
- [Variables de entorno](./environment-variables.md)
- [Base de datos y migraciones](./database-migrations.md)
- [Seeds](./seeds.md)
- [Media](./media.md)
- [Analytics](./analytics.md)
- [Troubleshooting](./troubleshooting.md)
