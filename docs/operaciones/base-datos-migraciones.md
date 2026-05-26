# Base De Datos Y Migraciones

El proyecto usa Prisma para datos operativos y Payload con PostgreSQL. La conexiaIn se controla con `DATABASE_URL`.

## Generar cliente

```bash
pnpm db:generate
```

Tambiaon se ejecuta dentro de `pnpm typecheck` y `pnpm run build`.

## Migraciones locales

```bash
pnpm db:migrate
```

Usar saIlo contra bases locales o de desarrollo.

## Migraciones remotas

```bash
pnpm db:deploy
```

Usar para staging y producciaIn. No usa migraciones interactivas.

## Reset local

```bash
pnpm db:reset
```

No ejecutar contra staging o producciaIn.

## Prisma Studio

```bash
pnpm db:studio
```

a til para inspecciaIn taocnica, no para operaciaIn diaria del CMS.

## Modelos Prisma principales

- `Lead`: consultas recibidas por `/api/leads`.
- `Service`: servicios base.
- `TreatmentTopic`: tratamientos/problemas frecuentes.
- `TeamMember`: equipo.
- `Testimonial`: testimonios.
- `Faq`: preguntas frecuentes.
- `SiteSetting`: configuraciaIn institucional base.

## Payload

Payload usa PostgreSQL vaAa `@payloadcms/db-postgres` y el schema configurado en `PAYLOAD_DB_SCHEMA`.

Archivos relevantes:

- `payload.config.ts`
- `src/payload/collections`
- `src/payload/globals`
- `src/types/payload-types.ts`
