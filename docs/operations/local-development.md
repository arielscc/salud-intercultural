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
CLINICAL_FILES_STORAGE_DRIVER="local"
CLINICAL_FILES_LOCAL_PATH=".data/clinical-files"
CMS_READS_DURING_BUILD="false"
NEXT_PUBLIC_GA_ID=""
NEXT_PUBLIC_META_PIXEL_ID=""
```

4. Dejar `BLOB_READ_WRITE_TOKEN` vacío en local si se quiere usar storage
   editorial en `public/media`. Los adjuntos clínicos se guardan por separado
   en `.data/clinical-files`, fuera de `public/`.

Mas detalle: [variables de entorno](./environment-variables.md).

## Ejecutar

```bash
pnpm dev
```

Rutas utiles:

- Sitio publico: `http://localhost:3000`
- Admin Payload: `http://localhost:3000/admin`
- API leads: `http://localhost:3000/api/leads`
- Adjuntos clínicos: dentro de la ficha del paciente, solo con un rol autorizado.

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
pnpm payload:seed
```

El seed por defecto carga paginas, servicios, tratamientos, equipo, testimonios, FAQs, globals y el admin solo si `ADMIN_EMAIL` y `ADMIN_PASSWORD` estan configurados.

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

Los tests de integracion usan `salud_intercultural_test`:

```bash
pnpm test:integration
```

Mas detalle: [testing](./testing.md).

## Simulacro Local De Recuperación

Con PostgreSQL de Docker saludable:

```bash
pnpm backup:drill:local
```

El comando crea dos bases con nombres controlados, aplica migraciones, genera
datos sintéticos, cifra una copia, la restaura, comprueba los archivos clínicos
y elimina únicamente esas bases temporales. No modifica
`salud_intercultural_dev`. La evidencia privada queda bajo
`.data/backup-evidence/`.

Procedimiento manual y política operativa:
[Backup y restauración de SIGECO](./backup-restore.md).

Si `typecheck` o `build` fallan por `DATABASE_URL`, revisa que `.env` exista y apunte a una base PostgreSQL valida.

## Checklist De Validacion Local

Usar esta checklist para confirmar que el entorno quedo listo para desarrollo diario:

1. `docker compose up -d postgres` levanta PostgreSQL local.
2. `.env` apunta a `salud_intercultural_dev`.
3. `.env.test` apunta a `salud_intercultural_test`.
4. `pnpm db:migrate` funciona contra desarrollo local.
5. `pnpm seed` carga datos locales de Payload.
6. `pnpm dev` abre el sitio publico y el admin local.
7. `pnpm test` corre la suite rapida sin DB real.
8. `pnpm test:integration` usa la DB local de test.
9. `pnpm db:reset` bloquea URLs peligrosas antes de tocar Prisma.
10. La documentacion operativa esta enlazada desde [Operations](./README.md).

## Archivos principales

- Rutas publicas: `src/app/(public)`
- Admin y API Payload: `src/app/(payload)`
- API leads: `src/app/api/leads/route.ts`
- Payload config: `payload.config.ts`
- Prisma schema: `prisma/schema.prisma`
