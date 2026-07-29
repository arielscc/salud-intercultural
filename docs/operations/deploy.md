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

Confirmar que el workflow [CI](../../.github/workflows/ci.yml) termino correctamente para el commit que se promovera.

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm deps:check
pnpm run build
```

Detener `next dev` antes del build. Confirmar que Git esta limpio y que el commit probado es el que se promovera.

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
4. Validar sitio publico, `/admin`, CMS, media, formulario publico, sitemap y robots.
5. Ejecutar la [prueba completa de Sigeco V3.7](./sigeco-v3-full-flow-testing.md) con usuarios y base exclusivos de staging.

## Produccion

1. Confirmar staging aprobado.
2. Merge de `staging` a `main`.
3. Push a remoto.
4. Vercel despliega produccion.
5. Revisar logs, rutas criticas y salud de la base.
6. Ejecutar un canary no destructivo del sitio publico, CMS y login de Sigeco.

## Logs

Revisar en Vercel:

- Build Logs.
- Runtime Logs.
- Function Logs para `/api/leads`.
- Logs relacionados con Payload.
- Errores de Server Actions y Prisma bajo `/sigeco`.

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
