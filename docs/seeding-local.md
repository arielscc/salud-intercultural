# Seeds Y Reset Local

## Alcance

El proyecto tiene dos capas de seed:

- `prisma/seed.ts`: datos base para modelos Prisma.
- `scripts/seed-payload.ts`: contenido inicial para Payload CMS y panel admin.

Ambos scripts son idempotentes: usan `upsert` o busqueda previa para actualizar registros existentes sin duplicarlos.

## Variables Necesarias

Configura `.env` antes de ejecutar seeds:

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
```

Si `ADMIN_EMAIL` y `ADMIN_PASSWORD` no existen, el seed CMS no crea usuario admin.

## Ejecutar Seeds

Seed completo:

```bash
pnpm seed
```

Solo Prisma:

```bash
pnpm db:seed
```

Solo Payload CMS:

```bash
pnpm payload:seed
```

## Contenido Sembrado

Prisma:

- Servicios.
- Problemas frecuentes / tratamientos generales.
- Equipo.
- Testimonios.
- FAQs.
- Configuracion institucional.
- Contenido base de tratamientos.

Payload CMS:

- Usuario admin opcional desde variables de entorno.
- Servicios.
- Equipo.
- Testimonios.
- FAQs.
- Paginas publicas base para SEO editable.
- Global `site-settings`.
- Global `home-content`.

## Reset Local

Para resetear base local y volver a sembrar:

```bash
pnpm db:migrate
pnpm seed
```

Si necesitas borrar datos y recrear desde cero con Prisma:

```bash
pnpm db:reset
pnpm seed
```

Antes de ejecutar reset confirma que `DATABASE_URL` apunte a una base local o de desarrollo. No ejecutes reset contra produccion.

## Notas De Produccion

- En Vercel no conviene ejecutar seeds automaticamente durante build.
- Para produccion, ejecuta `pnpm payload:seed` manualmente desde un entorno seguro con `DATABASE_URL` de produccion.
- Si usas Neon, revisa que la base y schema existan antes de sembrar.
