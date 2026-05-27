# Base De Datos Y Migraciones

El proyecto usa Prisma para datos operativos y Payload con PostgreSQL. La conexion se controla con `DATABASE_URL`.

## Generar cliente

```bash
pnpm db:generate
```

Tambien se ejecuta dentro de `pnpm typecheck` y `pnpm run build`.

## Migraciones locales

```bash
pnpm db:migrate
```

Usar solo contra bases locales o de desarrollo.

## Migraciones remotas

```bash
pnpm db:deploy
```

Usar para staging y produccion. No usa migraciones interactivas.

## Reset local

```bash
pnpm db:reset
```

`pnpm db:reset` es destructivo y esta protegido por `scripts/reset-database.ts`.

Permitido por defecto:

- Host local: `localhost`, `127.0.0.1`, `::1`, `host.docker.internal` o `postgres`.
- Base: `salud_intercultural_dev` o `salud_intercultural_test`.

Bloqueado siempre:

- `NEXT_PUBLIC_SITE_URL` con `saludintercultural.com`.
- `DATABASE_URL` que referencie `saludintercultural.com`.
- Hosts gestionados/remotos conocidos como Neon o Vercel.
- Bases con nombres que parezcan `staging`, `prod` o `production`.

Override:

```bash
ALLOW_REMOTE_DB_RESET=true pnpm db:reset
```

Usar este override solo para una base remota no productiva aprobada explicitamente. No salta los bloqueos de dominio protegido, Neon/Vercel ni nombres staging/produccion.

## Prisma Studio

```bash
pnpm db:studio
```

Util para inspeccion tecnica, no para operacion diaria del CMS.

## Modelos Prisma principales

- `Lead`: consultas recibidas por `/api/leads`.
- `Service`: servicios base.
- `TreatmentTopic`: tratamientos/problemas frecuentes.
- `TeamMember`: equipo.
- `Testimonial`: testimonios.
- `Faq`: preguntas frecuentes.
- `SiteSetting`: configuracion institucional base.

## Payload

Payload usa PostgreSQL via `@payloadcms/db-postgres` y el schema configurado en `PAYLOAD_DB_SCHEMA`.

Archivos relevantes:

- `payload.config.ts`
- `src/payload/collections`
- `src/payload/globals`
- `src/types/payload-types.ts`
