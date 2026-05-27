# Base De Datos Y Migraciones

El proyecto usa Prisma para datos operativos y Payload con PostgreSQL. La conexion se controla con `DATABASE_URL`.

## Generar cliente

```bash
pnpm db:generate
```

Tambien se ejecuta dentro de `pnpm typecheck` y `pnpm run build`.

## Ambientes

| Ambiente | Base / schema esperado | Comando principal | Notas |
| --- | --- | --- | --- |
| Local | `salud_intercultural_dev`, schema `public` | `pnpm db:migrate` | Desarrollo diario con `.env`. |
| Test | `salud_intercultural_test`, schema `public` | `pnpm test:integration` | Resetea y aplica migraciones automaticamente. |
| Staging | Base remota separada | `pnpm db:deploy` | Usar variables de staging. No usar reset. |
| Produccion | Base remota de produccion | `pnpm db:deploy` | Ejecutar solo con cambio revisado. No usar reset. |

Payload usa `PAYLOAD_DB_SCHEMA` en la misma base PostgreSQL:

- Local: `payload`.
- Test: `payload_test`.
- Staging/produccion: `payload` salvo decision operativa distinta.

## Migraciones Locales

```bash
pnpm db:migrate
```

Usar solo contra bases locales o de desarrollo. Prisma lee `DATABASE_URL` desde `.env`.

## Migraciones De Test

```bash
pnpm test:integration
```

El flujo ejecuta `pnpm test:db:reset`, aplica migraciones sobre `salud_intercultural_test` y corre los tests de integracion.

## Migraciones Remotas

```bash
pnpm db:deploy
```

Usar para staging y produccion. No usa migraciones interactivas.

Reglas:

- Confirmar `DATABASE_URL` del ambiente antes de ejecutar.
- No usar `pnpm db:migrate` contra staging o produccion.
- No usar `pnpm db:reset` contra staging o produccion.
- Revisar el SQL de migracion antes de desplegar cambios destructivos.

## Reset Local

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

## Seeds

```bash
pnpm seed
```

El seed por defecto ejecuta solo `pnpm payload:seed`, porque Payload es la fuente de verdad del contenido editable y del panel admin.

```bash
pnpm db:seed
```

`pnpm db:seed` queda como seed legacy de modelos Prisma de contenido. No usarlo como flujo normal de desarrollo ni contra produccion salvo decision explicita de mantenimiento.

## Modelos Prisma principales

Los modelos Prisma editoriales existentes son legacy mientras avanza la limpieza de ownership:

- `Lead`.
- `Service`.
- `TreatmentTopic`.
- `TeamMember`.
- `Testimonial`.
- `Faq`.
- `SiteSetting`.

Payload es la fuente de verdad para leads simples, servicios, equipo, testimonios, FAQs, configuracion global, paginas publicas y media. Prisma queda reservado para dominios operativos futuros.

## Payload

Payload usa PostgreSQL via `@payloadcms/db-postgres` y el schema configurado en `PAYLOAD_DB_SCHEMA`.

Archivos relevantes:

- `payload.config.ts`
- `src/payload/collections`
- `src/payload/globals`
- `src/types/payload-types.ts`
