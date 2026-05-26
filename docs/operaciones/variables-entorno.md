# Variables De Entorno

Guia operativa para configurar variables locales, staging y produccion.

## Reglas Generales

- No subir archivos `.env` al repositorio.
- Mantener `.env.example` como plantilla sin secretos reales.
- Usar valores distintos para local, staging y produccion.
- Toda variable que empiece con `NEXT_PUBLIC_` queda expuesta al navegador.
- Secretos, credenciales, tokens y URLs privadas deben mantenerse sin prefijo publico.
- En Vercel, configurar variables por ambiente: Production y Preview.
- Operativamente, Preview Deployment desde rama `staging` se trata como staging.
- Flujo de ramas: `develop` para trabajo local, `staging` para revision publicada y `main` para produccion.

## Variables Publicas

Estas variables pueden estar disponibles en el cliente.

| Variable | Requerida operativamente | Ejemplo | Uso |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Si | `http://localhost:3000` | URL canonica para SEO, sitemap, Open Graph y enlaces absolutos. |
| `NEXT_PUBLIC_SITE_NAME` | Si | `Salud Intercultural` | Nombre publico del sitio. |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Si | `+59164175822` | CTA de WhatsApp principal. |
| `NEXT_PUBLIC_CALL_PHONE` | Si | `+59164175822` | CTA de llamada principal. |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Si | `medicina.tradicional.ea@gmail.com` | Email publico de contacto. |
| `NEXT_PUBLIC_GOOGLE_MAPS_URL` | No | `https://maps.google.com/...` | Enlace publico a Google Maps. |
| `NEXT_PUBLIC_GA_ID` | No | `G-XXXXXXXXXX` | Google Analytics 4. |
| `NEXT_PUBLIC_META_PIXEL_ID` | No | `1234567890` | Meta Pixel. |

## Variables Privadas

Estas variables no deben exponerse al navegador.

| Variable | Requerida operativamente | Ejemplo | Uso |
| --- | --- | --- | --- |
| `DATABASE_URL` | Si | `postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require` | Conexion de Prisma y Payload a Postgres. |
| `PAYLOAD_SECRET` | Si | valor aleatorio de 32+ caracteres | Firma de tokens y sesiones de Payload. |
| `PAYLOAD_PUBLIC_SERVER_URL` | Si | `http://localhost:3000` | URL base que Payload usa para resolver servidor/admin. |
| `PAYLOAD_DB_SCHEMA` | Si | `payload` | Schema de Postgres usado por Payload. |
| `BLOB_READ_WRITE_TOKEN` | Si en produccion/staging con media persistente | token generado por Vercel Blob | Almacenamiento persistente de media administrable de Payload. |
| `ADMIN_EMAIL` | No | `admin@example.com` | Email para crear el primer admin con seed. |
| `ADMIN_PASSWORD` | No | clave temporal de seed | Password para crear o resetear el primer admin con seed. |
| `ADMIN_RESET_PASSWORD_ON_SEED` | No | `false` | Permite resetear el password de un admin existente durante seed cuando vale `true`. |
| `ADMIN_SESSION_SECONDS` | No | `28800` | Duracion de sesion admin. |
| `ADMIN_LOCK_MINUTES` | No | `10` | Bloqueo temporal tras intentos fallidos. |
| `GOOGLE_SITE_VERIFICATION` | No | token de Search Console | Verificacion de propiedad en Google. |
| `RATE_LIMIT_MAX` | No | `10` | Limite de envios por ventana para leads. |
| `RATE_LIMIT_WINDOW_SECONDS` | No | `60` | Ventana de rate limit para leads. |
| `CMS_READS_DURING_BUILD` | No | `false` | Permite lecturas CMS durante build si se cambia a `true`. |

Nota de contacto: `+59164175822` es el numero principal. `+59162287251` queda como numero alternativo; ambos pueden recibir WhatsApp y llamadas.

## Local

Local es la computadora de desarrollo sobre la rama `develop`.

1. Copiar `.env.example` a `.env`.
2. Configurar `DATABASE_URL` apuntando a una base local o Neon de desarrollo.
3. Generar `PAYLOAD_SECRET`:

```bash
openssl rand -base64 32
```

4. Configurar como minimo:

```env
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
NEXT_PUBLIC_SITE_NAME="Salud Intercultural"
PAYLOAD_PUBLIC_SERVER_URL="http://localhost:3000"
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"
PAYLOAD_SECRET="valor-largo-seguro"
PAYLOAD_DB_SCHEMA="payload"
CMS_READS_DURING_BUILD="false"
```

5. Dejar `BLOB_READ_WRITE_TOKEN` vacio en local si se quiere usar storage local en `public/media`.
6. Ejecutar seeds cuando corresponda:

```bash
pnpm seed
```

## Staging En Vercel

Staging corre como Preview Deployment desde rama `staging`.

Valores esperados:

```env
NEXT_PUBLIC_SITE_URL="https://staging.saludintercultural.com"
PAYLOAD_PUBLIC_SERVER_URL="https://staging.saludintercultural.com"
DATABASE_URL="postgresql://STAGING_USER:STAGING_PASSWORD@STAGING_HOST/STAGING_DB?sslmode=require"
PAYLOAD_DB_SCHEMA="payload"
CMS_READS_DURING_BUILD="false"
```

Recomendaciones:

- Usar una base de datos separada para staging si se probaran cambios destructivos o seeds.
- Usar un Blob Store/token separado del de produccion para no mezclar media de prueba con media real.

## Produccion En Vercel

Produccion corre desde `main`.

Valores esperados:

```env
NEXT_PUBLIC_SITE_URL="https://saludintercultural.com"
PAYLOAD_PUBLIC_SERVER_URL="https://saludintercultural.com"
DATABASE_URL="postgresql://PROD_USER:PROD_PASSWORD@PROD_HOST/PROD_DB?sslmode=require"
PAYLOAD_DB_SCHEMA="payload"
CMS_READS_DURING_BUILD="false"
```

La URL estable de Vercel queda solo como fallback tecnico para diagnostico o rollback:

```env
NEXT_PUBLIC_SITE_URL="https://salud-intercultural.vercel.app"
PAYLOAD_PUBLIC_SERVER_URL="https://salud-intercultural.vercel.app"
```

Despues de cambiar dominio en Vercel, revisar `robots.ts`, `sitemap.ts`, Search Console, Analytics y Meta Pixel.

## Media

`BLOB_READ_WRITE_TOKEN` activa Vercel Blob para Payload `media`.

- Si existe, Payload guarda imagenes y videos en Vercel Blob.
- Si no existe, local usa `public/media`.
- En produccion y staging debe estar configurado si se subiran imagenes o videos desde Payload.
- La collection `media` acepta `image/*` y `video/*`.
- Las imagenes servidas desde `*.public.blob.vercel-storage.com` estan permitidas en `next/image`.
- Los videos deben insertarse como archivo/media o URL de video, no mediante `next/image`.

## Configuracion Vercel

```txt
Framework preset: Next.js
Install command: pnpm install
Build command: pnpm run build
Output directory: Next.js default
Node.js version: 22.x
Production branch: main
Preview/Staging branch: staging
```

## Checklist De Deploy

1. Verificar `NEXT_PUBLIC_SITE_URL` y `PAYLOAD_PUBLIC_SERVER_URL` con el dominio del ambiente.
2. Verificar `PAYLOAD_SECRET`; usar 32+ caracteres en produccion.
3. Verificar `DATABASE_URL`, `PAYLOAD_DB_SCHEMA` y migraciones.
4. Verificar `BLOB_READ_WRITE_TOKEN` para media persistente en staging y produccion.
5. Verificar `NEXT_PUBLIC_WHATSAPP_NUMBER`, `NEXT_PUBLIC_CALL_PHONE`, email y Maps.
6. Verificar `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_META_PIXEL_ID` y `GOOGLE_SITE_VERIFICATION` si aplican.
7. Ejecutar `pnpm lint`, `pnpm test`, `pnpm typecheck` y `pnpm run build`.
8. Revisar logs de Vercel: Build Logs, Runtime Logs y Function Logs de `/api/leads` y Payload.

## Validacion Con Zod

La validacion esta centralizada en `src/lib/env.ts`.

- `publicEnvSchema` valida variables expuestas al navegador.
- `privateEnvSchema` valida secretos, base de datos, admin y seguridad.
- `envSchema` combina ambas.
- Los strings vacios se tratan como variables no configuradas para evitar errores con campos opcionales.
- `PAYLOAD_SECRET` se valida con minimo tecnico de 12 caracteres; operativamente se recomiendan 32+ en produccion.
- GA4, Meta Pixel, emails, telefonos y URLs tienen validaciones de formato.
- `ADMIN_PASSWORD` se valida operacionalmente en el flujo de seed para no bloquear builds publicos.

## Seguridad

- No commitear `.env`, `.env.staging` ni `.env.production.local`.
- No usar variables con prefijo `NEXT_PUBLIC_` para secretos.
- Rotar cualquier secreto compartido por chat, capturas, correo, tickets o commits.
