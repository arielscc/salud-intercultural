# Seeds Y Datos Iniciales

Guia operativa para cargar datos iniciales locales, staging o produccion.

## Alcance

El seed canonico del proyecto es Payload:

- `scripts/seed-payload.ts`: contenido inicial para Payload CMS y panel admin.

Los scripts son idempotentes: usan `upsert` o busqueda previa para actualizar registros existentes sin duplicarlos.

## Variables Necesarias

Configurar `.env` antes de ejecutar seeds:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require"
PAYLOAD_SECRET="un-string-largo-seguro"
PAYLOAD_PUBLIC_SERVER_URL="http://localhost:3000"
PAYLOAD_DB_SCHEMA="payload"
```

Opcional para crear el primer admin:

```env
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="cambia-esta-clave"
ADMIN_RESET_PASSWORD_ON_SEED="false"
```

Si `ADMIN_EMAIL` y `ADMIN_PASSWORD` no existen, el seed CMS no crea usuario admin.

Usar `ADMIN_RESET_PASSWORD_ON_SEED="true"` solo cuando se quiera resetear intencionalmente el password de un admin existente durante seed.

## Ejecutar Seeds

Seed por defecto:

```bash
pnpm seed
```

Ejecuta solo:

```bash
pnpm payload:seed
```

Solo Payload CMS:

```bash
pnpm payload:seed
```

Seed Payload con variables de staging locales:

```bash
pnpm payload:seed:staging
```

Usa `.env.staging` mediante `DOTENV_CONFIG_PATH`.

## Contenido Sembrado Por Defecto

`pnpm seed` carga en Payload CMS:

- Usuario admin opcional desde variables de entorno.
- Servicios.
- Equipo.
- Testimonios.
- FAQs.
- Paginas publicas base para SEO editable.
- Global `site-settings`.
- Global `home-content`.

## Reset Local

Para aplicar migraciones locales y volver a sembrar:

```bash
pnpm db:migrate
pnpm seed
```

Si necesitas borrar datos y recrear desde cero con Prisma:

```bash
pnpm db:reset
pnpm seed
```

Antes de ejecutar reset, confirmar que `DATABASE_URL` apunte a una base local o de desarrollo.
`pnpm db:reset` valida esto automaticamente y bloquea hosts remotos conocidos, dominios de produccion/staging y nombres de base peligrosos antes de borrar datos.

## Produccion Y Staging

- En Vercel no conviene ejecutar seeds automaticamente durante build.
- Para produccion, ejecutar `pnpm seed` o `pnpm payload:seed` manualmente desde un entorno seguro con `DATABASE_URL` de produccion.
- Para staging, usar `pnpm payload:seed:staging` solo si `.env.staging` apunta al ambiente correcto.
- Si usas Neon, revisar que la base y schema existan antes de sembrar.

## Seguridad

- Confirmar siempre a que base apunta `DATABASE_URL`.
- No ejecutar `db:reset` ni seeds destructivos contra produccion.
- No usar `ALLOW_REMOTE_DB_RESET=true` salvo para una base remota no productiva aprobada explicitamente.
- No commitear `.env`, `.env.staging` ni `.env.production.local`.
- Rotar cualquier credencial real compartida por chat, capturas, correo, tickets o commits.
