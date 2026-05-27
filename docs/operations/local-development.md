# Desarrollo Local

## Requisitos

- Node compatible con Next.js 16.
- `pnpm` segun `packageManager` en `package.json`.
- Docker para PostgreSQL local.
- Variables locales en `.env`.

## Instalacion

```bash
pnpm install
```

## Configurar entorno

1. Levantar PostgreSQL local:

```bash
docker compose up -d postgres
```

2. Copiar `.env.local.example` a `.env`.
3. Confirmar que `.env` use estos valores locales:

```env
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
NEXT_PUBLIC_SITE_NAME="Salud Intercultural"
DATABASE_URL="postgresql://salud_intercultural:salud_intercultural@localhost:5432/salud_intercultural_dev?schema=public"
PAYLOAD_SECRET="local-development-secret-change-me"
PAYLOAD_PUBLIC_SERVER_URL="http://localhost:3000"
PAYLOAD_DB_SCHEMA="payload"
BLOB_READ_WRITE_TOKEN=""
CMS_READS_DURING_BUILD="false"
NEXT_PUBLIC_GA_ID=""
NEXT_PUBLIC_META_PIXEL_ID=""
```

4. Dejar `BLOB_READ_WRITE_TOKEN` vacio en local si se quiere usar storage local en `public/media`.

Mas detalle: [variables de entorno](./environment-variables.md).

## Ejecutar

```bash
pnpm dev
```

Rutas utiles:

- Sitio publico: `http://localhost:3000`
- Admin Payload: `http://localhost:3000/admin`
- API leads: `http://localhost:3000/api/leads`

## Migraciones Y Seeds

Flujo inicial para preparar la base local:

```bash
docker compose up -d postgres
pnpm install
pnpm db:migrate
pnpm seed
pnpm dev
```

`pnpm db:migrate` debe leer `.env` y apuntar a:

```env
DATABASE_URL="postgresql://salud_intercultural:salud_intercultural@localhost:5432/salud_intercultural_dev?schema=public"
```

`pnpm seed` ejecuta:

```bash
pnpm db:seed
pnpm payload:seed
```

El seed Prisma carga servicios, tratamientos, equipo, testimonios, FAQs y configuraciones base. El seed Payload carga paginas, servicios, equipo, testimonios, FAQs, globals y el admin solo si `ADMIN_EMAIL` y `ADMIN_PASSWORD` estan configurados.

Para reiniciar datos locales desde cero:

```bash
pnpm db:reset
pnpm seed
```

Advertencia: `pnpm db:reset` es destructivo. El comando esta protegido por safety rails y solo permite bases locales llamadas `salud_intercultural_dev` o `salud_intercultural_test`. Bloquea staging, produccion, Neon remoto, Vercel Postgres y URLs del dominio `saludintercultural.com`.

## Validaciones

```bash
pnpm lint
pnpm test
pnpm typecheck
pnpm run build
```

## Tests Con Base Local

La suite rapida no usa base real:

```bash
pnpm test
```

Los tests de integracion usan `salud_intercultural_test`.

1. Levantar PostgreSQL local:

```bash
docker compose up -d postgres
```

2. Copiar `.env.test.example` a `.env.test`.
3. Confirmar que `DATABASE_URL` apunte a `salud_intercultural_test`.
4. Ejecutar:

```bash
pnpm test:integration
```

`pnpm test:integration` ejecuta primero `pnpm test:db:reset`, que valida que la URL sea local y que la base se llame `salud_intercultural_test` antes de correr `prisma migrate reset --force`.

Si `typecheck` o `build` fallan por `DATABASE_URL`, revisa que `.env` exista y apunte a una base PostgreSQL valida.

## Archivos principales

- Rutas publicas: `src/app/(public)`
- Admin y API Payload: `src/app/(payload)`
- API leads: `src/app/api/leads/route.ts`
- Payload config: `payload.config.ts`
- Prisma schema: `prisma/schema.prisma`
