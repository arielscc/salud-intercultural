# Testing

Guia operativa para correr tests locales sin depender de staging ni produccion.

## Tipos De Tests

El proyecto separa la suite rapida de los tests que usan PostgreSQL real.

| Tipo | Comando | Usa DB real | Uso |
| --- | --- | --- | --- |
| Unitarios y componentes | `pnpm test` | No | Validacion rapida por defecto. |
| Unitarios explicitos | `pnpm test:unit` | No | Alias de la suite rapida. |
| Watch local | `pnpm test:watch` | No | Desarrollo iterativo. |
| Integracion DB | `pnpm test:integration` | Si | Flujos criticos contra `salud_intercultural_test`. |

`pnpm test` excluye archivos `*.integration.test.ts` y `*.integration.test.tsx`.

## Base De Test

Los tests de integracion usan la base local `salud_intercultural_test` creada por Docker.

Valores esperados:

```env
NODE_ENV="test"
DATABASE_URL="postgresql://salud_intercultural:salud_intercultural@localhost:5432/salud_intercultural_test?schema=public"
PAYLOAD_DB_SCHEMA="payload_test"
CMS_READS_DURING_BUILD="false"
NEXT_PUBLIC_GA_ID=""
NEXT_PUBLIC_META_PIXEL_ID=""
```

Preparacion:

```bash
docker compose up -d postgres
cp .env.test.example .env.test
pnpm test:integration
```

`pnpm test:integration` ejecuta primero:

```bash
pnpm test:db:reset
```

Ese reset borra `salud_intercultural_test`, aplica migraciones Prisma y luego ejecuta los tests de integracion.

## Safety Rails

`pnpm test:db:reset` usa `scripts/reset-test-database.ts` y solo permite resetear:

- Host local: `localhost`, `127.0.0.1`, `::1`, `host.docker.internal` o `postgres`.
- Base: `salud_intercultural_test`.

Bloquea:

- Bases que no se llamen `salud_intercultural_test`.
- Hosts gestionados/remotos conocidos como Neon o Vercel.
- URLs que referencien `saludintercultural.com`.
- `NEXT_PUBLIC_SITE_URL` apuntando a `saludintercultural.com`.
- Nombres de base que parezcan `staging`, `prod` o `production`.

Los tests nunca deben usar `.env.staging`, `.env.production.local`, Neon remoto ni Vercel Postgres salvo decision explicita documentada.

## Integracion Actual

La cobertura de integracion actual esta en:

- `src/modules/database/queries/leads.integration.test.ts`

Cubre:

- `createLeadRecord`
- `getLeads`
- `updateLeadStatus`

Cada test limpia la tabla `Lead` antes de correr. El reset completo de la base ocurre antes de la suite de integracion.

## Agregar Tests De Integracion

Convenciones:

- Usar sufijo `.integration.test.ts` o `.integration.test.tsx`.
- Mantener `pnpm test` rapido y mockeado.
- Usar DB real solo para contratos criticos que no se validan bien con mocks.
- Limpiar datos creados por el test con `beforeEach` o `afterAll`.
- Evitar depender de orden de ejecucion entre archivos.

Candidatos recomendados:

- `POST /api/leads` contra DB real.
- Queries de leads adicionales.
- Seeds minimos si se vuelven parte de un contrato.
- Fallbacks CMS criticos si empiezan a depender de DB real.

## Validacion Recomendada

Antes de abrir PR o promover cambios:

```bash
pnpm lint
pnpm test
pnpm typecheck
pnpm run build
```

Si el cambio toca queries, migraciones, Prisma o scripts de DB, agregar:

```bash
pnpm test:integration
```
