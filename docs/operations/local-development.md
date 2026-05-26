# Desarrollo Local

## Requisitos

- Node compatible con Next.js 16.
- `pnpm` segun `packageManager` en `package.json`.
- PostgreSQL local o una base Neon de desarrollo.
- Variables locales en `.env`.

## Instalacion

```bash
pnpm install
```

## Configurar entorno

1. Copiar `.env.example` a `.env`.
2. Configurar como maAnimo:

```env
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
PAYLOAD_PUBLIC_SERVER_URL="http://localhost:3000"
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"
PAYLOAD_SECRET="valor-largo-seguro"
PAYLOAD_DB_SCHEMA="payload"
CMS_READS_DURING_BUILD="false"
```

3. Dejar `BLOB_READ_WRITE_TOKEN` vacio en local si se quiere usar storage local en `public/media`.

Mas detalle: [variables de entorno](./environment-variables.md).

## Ejecutar

```bash
pnpm dev
```

Rutas utiles:

- Sitio publico: `http://localhost:3000`
- Admin Payload: `http://localhost:3000/admin`
- API leads: `http://localhost:3000/api/leads`

## Validaciones

```bash
pnpm lint
pnpm test
pnpm typecheck
pnpm run build
```

Si `typecheck` o `build` fallan por `DATABASE_URL`, revisa que `.env` exista y apunte a una base PostgreSQL valida.

## Archivos principales

- Rutas publicas: `src/app/(public)`
- Admin y API Payload: `src/app/(payload)`
- API leads: `src/app/api/leads/route.ts`
- Payload config: `payload.config.ts`
- Prisma schema: `prisma/schema.prisma`
