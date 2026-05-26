# Variables De Entorno

La referencia completa vive en [docs/env-configuration.md](../env-configuration.md). Esta guaAa resume el uso operativo.

## Local

Configurar en `.env`:

```env
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
NEXT_PUBLIC_SITE_NAME="Salud Intercultural"
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"
PAYLOAD_SECRET="valor-largo-seguro"
PAYLOAD_PUBLIC_SERVER_URL="http://localhost:3000"
PAYLOAD_DB_SCHEMA="payload"
CMS_READS_DURING_BUILD="false"
```

Opcional:

```env
ADMIN_EMAIL=""
ADMIN_PASSWORD=""
BLOB_READ_WRITE_TOKEN=""
NEXT_PUBLIC_GA_ID=""
NEXT_PUBLIC_META_PIXEL_ID=""
GOOGLE_SITE_VERIFICATION=""
```

## Staging En Vercel

Staging corre como Preview Deployment desde la rama `staging`.

Valores esperados:

```env
NEXT_PUBLIC_SITE_URL="https://staging.saludintercultural.com"
PAYLOAD_PUBLIC_SERVER_URL="https://staging.saludintercultural.com"
DATABASE_URL="postgresql://STAGING_USER:STAGING_PASSWORD@STAGING_HOST/STAGING_DB?sslmode=require"
PAYLOAD_DB_SCHEMA="payload"
CMS_READS_DURING_BUILD="false"
```

## ProducciaIn En Vercel

ProducciaIn corre desde `main`.

Valores esperados:

```env
NEXT_PUBLIC_SITE_URL="https://saludintercultural.com"
PAYLOAD_PUBLIC_SERVER_URL="https://saludintercultural.com"
DATABASE_URL="postgresql://PROD_USER:PROD_PASSWORD@PROD_HOST/PROD_DB?sslmode=require"
PAYLOAD_DB_SCHEMA="payload"
CMS_READS_DURING_BUILD="false"
```

## Media

`BLOB_READ_WRITE_TOKEN` activa Vercel Blob para Payload `media`.

- Si existe, Payload guarda imaegenes y videos en Vercel Blob.
- Si no existe, local usa `public/media`.
- En producciaIn y staging debe estar configurado si se subiraen imaegenes o videos desde Payload.

## Reglas

- No commitear `.env`, `.env.staging` ni `.env.production.local`.
- No usar variables con prefijo `NEXT_PUBLIC_` para secretos.
- Rotar cualquier secreto compartido por chat, capturas o commits.
