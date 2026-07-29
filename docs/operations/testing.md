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
| Dependencias | `pnpm deps:check` | No | Peers y vulnerabilidades altas/criticas. |

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

La suite contiene 10 archivos y cubre:

- Leads publicos e internos legacy, preservados sin UI operativa.
- Funnel de recepcion, pacientes, visitas y dashboard.
- Flujo flexible y bloqueo de reapertura de visitas cerradas.
- Consulta clinica, enfermeria y estudios.
- Ventas, pagos y caja.
- Inventario, rollback por stock insuficiente y alertas.
- Seguimientos y cronologia del paciente.

El baseline de cierre V3.7 es 21 tests de integracion. El reset completo ocurre antes de la suite; cada archivo tambien limpia los registros que crea.

## Agregar Tests De Integracion

Convenciones:

- Usar sufijo `.integration.test.ts` o `.integration.test.tsx`.
- Mantener `pnpm test` rapido y mockeado.
- Usar DB real solo para contratos criticos que no se validan bien con mocks.
- Limpiar datos creados por el test con `beforeEach` o `afterAll`.
- Evitar depender de orden de ejecucion entre archivos.

Candidatos recomendados:

- Acciones autenticadas con permisos negativos por rol.
- Backup y restauracion cuando exista el procedimiento operativo.
- Adjuntos clinicos cuando se defina storage seguro.
- Fallbacks CMS criticos si empiezan a depender de DB real.

## Validacion Recomendada

Antes de abrir PR o promover cambios:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm run build
```

Detener `next dev` antes del build; ambos procesos usan `.next`.

## CI En GitHub

`.github/workflows/ci.yml` ejecuta en jobs separados:

- `quality`: lint y typecheck.
- `unit-tests`: suite rapida.
- `integration-tests`: PostgreSQL 16 efimero, migraciones desde cero e integracion.
- `build`: build de produccion sin lecturas CMS.
- `dependency-audit`: peers y auditoria de dependencias.

El workflow usa Node.js 22, la version de pnpm fijada en `package.json`, permisos `contents: read` y variables sinteticas. No usa secretos, bases o archivos de staging/produccion.

## Control De Dependencias

Comandos:

```bash
pnpm peers check
pnpm audit:prod
pnpm audit:high
```

`audit:prod` bloquea vulnerabilidades altas o criticas de produccion. `audit:high` hace lo mismo sobre todo el arbol con una excepcion temporal:

- `GHSA-mh99-v99m-4gvg` afecta `brace-expansion` a traves de ESLint/minimatch.
- Es una ruta exclusiva de desarrollo que procesa patrones del repositorio.
- Forzar `brace-expansion` 5 sobre `minimatch` 3 rompe lint.
- ESLint 10 fue evaluado, pero los plugins actuales todavia no son compatibles.
- La excepcion debe retirarse cuando la cadena de plugins admita ESLint 10 o publique una solucion compatible.

Los overrides de `postcss` y `sharp` viven en `pnpm-workspace.yaml`. No agregar overrides amplios sin ejecutar lint, tipos, tests y build.
