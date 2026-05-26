# Seeds

La referencia completa vive en [docs/seeding-local.md](../seeding-local.md).

## Seed completo

```bash
pnpm seed
```

Ejecuta:

1. `pnpm db:seed`
2. `pnpm payload:seed`

## Seed Prisma

```bash
pnpm db:seed
```

Carga datos base para modelos Prisma.

## Seed Payload

```bash
pnpm payload:seed
```

Carga contenido inicial CMS y puede crear el primer usuario admin si existen:

```env
ADMIN_EMAIL=""
ADMIN_PASSWORD=""
```

## Seed Staging

```bash
pnpm payload:seed:staging
```

Usa `.env.staging` mediante `DOTENV_CONFIG_PATH`.

## Seguridad

- Confirmar siempre a quao base apunta `DATABASE_URL`.
- No ejecutar `db:reset` ni seeds destructivos contra producciaIn.
- Usar `ADMIN_RESET_PASSWORD_ON_SEED="true"` saIlo cuando se quiera resetear intencionalmente el admin.
