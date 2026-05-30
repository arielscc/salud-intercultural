# Tarea: V3.1A CRM Y Leads Internos

## Fecha

2026-05-30

## Objetivo

Implementar la primera entrega tecnica de V3.1A: base de Sigeco, autenticacion interna separada, roles/permisos iniciales, modelos Prisma para leads internos y UI mobile-first para operar el pipeline comercial.

## Cambios Implementados

- Se agregaron modelos Prisma para usuarios internos, sesiones internas, leads operativos, intentos de contacto, recordatorios e historial de estado.
- Se agrego la migracion `20260530000000_v3_1a_internal_crm`.
- Se implemento autenticacion interna separada de Payload con login, logout, sesiones HTTP-only y hash de password con scrypt.
- Se agrego seed interno `pnpm internal:seed` para crear o actualizar el primer `super_admin` de Sigeco.
- Se agregaron roles y permisos base para V3.1A.
- Se creo la ruta interna `/sigeco` con layout protegido.
- Se creo `/sigeco/login`.
- Se creo dashboard interno `/sigeco` con metricas iniciales de trabajo comercial.
- Se creo `/sigeco/leads` con busqueda y filtros mobile-first.
- Se creo `/sigeco/leads/nuevo` para registrar leads manuales.
- Se creo `/sigeco/leads/[id]` con detalle, cambio de estado, registro de contacto, recordatorio e historial comercial.
- Se agregaron schemas Zod para leads internos.
- Se agregaron labels para estados, fuentes, metodos y resultados de contacto.
- Se agrego cliente Prisma lazy para permitir builds sin inicializar DB al importar modulos operativos.
- Se agregaron variables de entorno internas a `.env.example`, validacion Zod y documentacion operativa.
- Se agregaron tests unitarios para password hashing, permisos y schemas de leads internos.

## Archivos Modificados

- `.env.example`
- `package.json`
- `prisma/schema.prisma`
- `prisma/migrations/20260530000000_v3_1a_internal_crm/migration.sql`
- `scripts/seed-internal-user.ts`
- `src/app/(internal)/sigeco/layout.tsx`
- `src/app/(internal)/sigeco/login/page.tsx`
- `src/app/(internal)/sigeco/(app)/layout.tsx`
- `src/app/(internal)/sigeco/(app)/page.tsx`
- `src/app/(internal)/sigeco/(app)/leads/page.tsx`
- `src/app/(internal)/sigeco/(app)/leads/nuevo/page.tsx`
- `src/app/(internal)/sigeco/(app)/leads/[id]/page.tsx`
- `src/components/internal/Field.tsx`
- `src/components/internal/InternalShell.tsx`
- `src/components/internal/StatusPill.tsx`
- `src/config/internal-design-system.ts`
- `src/features/crm/actions.ts`
- `src/features/crm/labels.ts`
- `src/features/crm/schemas/lead-v3.schema.ts`
- `src/features/crm/schemas/lead-v3.schema.test.ts`
- `src/features/internal-auth/actions.ts`
- `src/features/internal-auth/password.ts`
- `src/features/internal-auth/password.test.ts`
- `src/features/internal-auth/permissions.ts`
- `src/features/internal-auth/permissions.test.ts`
- `src/features/internal-auth/session.ts`
- `src/lib/env.ts`
- `src/modules/database/client.ts`
- `src/modules/database/queries/leads-v3.ts`
- `src/modules/permissions/index.ts`
- `docs/operations/environment-variables.md`

## Decisiones Tecnicas

- La fuente de verdad de leads internos V3.1A es Prisma/PostgreSQL.
- El formulario publico V2 sigue escribiendo en Payload `lead-submissions`; la migracion o cambio de fuente publica queda para una decision posterior.
- La autenticacion interna de Sigeco queda separada de Payload.
- Las rutas `/sigeco` quedan como rutas dinamicas de servidor.
- El cliente Prisma ahora inicializa de forma lazy para evitar fallos de build cuando una ruta importa modulos operativos pero no ejecuta consultas durante build.
- La UI interna usa componentes custom mobile-first y mantiene la marca sin copiar la UI publica tipo landing.

## Validacion

- `pnpm test`: paso. 10 archivos, 30 tests.
- `pnpm lint`: paso.
- `pnpm typecheck`: paso.
- `pnpm run build`: paso.
- `pnpm test:integration`: paso fuera del sandbox. 2 archivos, 2 tests. El primer intento dentro del sandbox fallo porque no podia conectarse al PostgreSQL local en Docker por `localhost:5432`.

## Pendientes

- Ejecutar migraciones en ambiente local/staging antes de probar `/sigeco` contra DB real.
- Configurar `INTERNAL_ADMIN_EMAIL` e `INTERNAL_ADMIN_PASSWORD`, luego correr `pnpm internal:seed`.
- Definir en una entrega posterior la migracion o sincronizacion desde Payload `lead-submissions` hacia Prisma `Lead`.
