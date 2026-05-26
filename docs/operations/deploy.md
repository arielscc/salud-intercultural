# Deploy

El proyecto corre actualmente en Vercel.

## Ambientes

- Produccion: rama `main`.
- Staging: Preview Deployment desde rama `staging`.
- Desarrollo local: rama `develop`.

Flujo completo de ramas: [flujo de ramas](./branch-flow.md).

## Configuracion Vercel

```txt
Framework preset: Next.js
Install command: pnpm install
Build command: pnpm run build
Node.js version: 22.x
```

## Variables Requeridas

Ver detalle en [variables de entorno](./environment-variables.md).

Claves para deploy:

```env
DATABASE_URL=""
PAYLOAD_SECRET=""
PAYLOAD_PUBLIC_SERVER_URL=""
PAYLOAD_DB_SCHEMA="payload"
BLOB_READ_WRITE_TOKEN=""
NEXT_PUBLIC_SITE_URL=""
NEXT_PUBLIC_SITE_NAME="Salud Intercultural"
CMS_READS_DURING_BUILD="false"
```

## Antes De Deploy

```bash
pnpm lint
pnpm test
pnpm typecheck
pnpm run build
```

## Migraciones

Antes del primer deploy o cuando cambie Prisma:

```bash
pnpm db:deploy
```

Ejecutar contra la base del ambiente correspondiente.

## Staging

1. Merge de `develop` a `staging`.
2. Push a remoto.
3. Vercel genera Preview Deployment.
4. Validar sitio publico, `/admin`, leads, CMS, media, sitemap y robots.

## Produccion

1. Confirmar staging aprobado.
2. Merge de `staging` a `main`.
3. Push a remoto.
4. Vercel despliega produccion.
5. Revisar logs y rutas craAticas.

## Logs

Revisar en Vercel:

- Build Logs.
- Runtime Logs.
- Function Logs para `/api/leads`.
- Logs relacionados con Payload.

## Dominio

Produccion debe usar:

```env
NEXT_PUBLIC_SITE_URL="https://saludintercultural.com"
PAYLOAD_PUBLIC_SERVER_URL="https://saludintercultural.com"
```

Staging debe usar:

```env
NEXT_PUBLIC_SITE_URL="https://staging.saludintercultural.com"
PAYLOAD_PUBLIC_SERVER_URL="https://staging.saludintercultural.com"
```
