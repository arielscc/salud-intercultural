# V2 Implementation Status

Resumen verificado del estado de Salud Intercultural V2. Este documento reemplaza la guia de implementacion extensa y el registro de cambios historico para evitar duplicacion con arquitectura, diseno y operaciones.

## Fuente De Verificacion

Se verifico contra:

- `package.json`
- `.env.example`
- `next.config.mjs`
- `payload.config.ts`
- `prisma/schema.prisma`
- `prisma/migrations`
- `prisma/seed.ts`
- `scripts/seed-payload.ts`
- `src/app`
- `src/features`
- `src/lib`
- `src/modules`
- `src/payload`
- `tests`
- `docs/architecture`
- `docs/design`
- `docs/operations`

## Estado General

La V2 esta implementada como monolito modular sobre Next.js App Router, con sitio publico, Payload CMS, leads, PostgreSQL, SEO, analytics, media, seeds, documentacion operativa y testing base.

Estado por area:

| Area | Estado | Evidencia |
| --- | --- | --- |
| Arquitectura modular | Implementado | `src/app`, `src/features`, `src/modules`, `src/lib`, `docs/architecture/v2-architecture.md` |
| Sistema visual publico | Implementado | `src/components/public`, `src/components/ui`, `docs/design/public-visual-system.md` |
| Rutas publicas | Implementado | `src/app/(public)` |
| Leads | Implementado | `src/features/leads`, `src/app/api/leads/route.ts`, `src/payload/collections/LeadSubmissions.ts` |
| Prisma/PostgreSQL | Implementado | `prisma/schema.prisma`, `prisma/migrations`, `src/modules/database` |
| Payload CMS | Implementado | `payload.config.ts`, `src/payload/collections`, `src/payload/globals` |
| Admin CMS | Implementado | `src/app/(payload)/admin`, `src/payload/admin` |
| Media | Implementado | `src/lib/images.ts`, `src/payload/collections/Media.ts`, Vercel Blob condicional |
| SEO tecnico | Implementado | `src/lib/seo.ts`, `src/app/robots.ts`, `src/app/sitemap.ts` |
| Analytics | Implementado | `src/features/analytics` |
| Accesibilidad responsive | Implementado y documentado | `docs/operations/accessibility-responsive.md` |
| Performance base | Implementado y documentado | `docs/operations/performance.md` |
| Seeds | Implementado | `prisma/seed.ts`, `scripts/seed-payload.ts` |
| Env vars | Implementado | `.env.example`, `src/lib/env.ts` |
| Testing base | Implementado | `tests`, `src/app/api/leads/route.test.ts`, script `pnpm test` |
| Deploy operativo | Documentado | `docs/operations/deploy.md`, `docs/operations/external-platforms.md` |

## Rutas Publicas Verificadas

Existen en `src/app/(public)`:

- `/`
- `/nosotros`
- `/servicios`
- `/tratamientos`
- `/equipo`
- `/testimonios`
- `/preguntas-frecuentes`
- `/contacto`
- `/politica-privacidad`
- `/terminos-condiciones`

Tambien existen:

- `/robots.txt`
- `/sitemap.xml`
- `/api/leads`
- `/admin`
- `/api/graphql`
- `/api/graphql-playground`
- `/api/[...slug]` de Payload

## Datos Y CMS

Prisma contiene modelos para:

- `Lead`
- `Service`
- `TreatmentTopic`
- `TeamMember`
- `Testimonial`
- `Faq`
- `SiteSetting`

Payload contiene collections para:

- `users`
- `media`
- `services`
- `testimonials`
- `faqs`
- `team-members`
- `pages`
- `lead-submissions`

Payload contiene globals para:

- `site-settings`
- `home-content`

## Scripts Operativos Verificados

Disponibles en `package.json`:

- `pnpm dev`
- `pnpm build`
- `pnpm start`
- `pnpm lint`
- `pnpm test`
- `pnpm typecheck`
- `pnpm db:generate`
- `pnpm db:migrate`
- `pnpm db:deploy`
- `pnpm db:reset`
- `pnpm db:seed`
- `pnpm seed`
- `pnpm db:studio`
- `pnpm payload`
- `pnpm payload:seed`
- `pnpm payload:seed:staging`
- `pnpm payload:generate-types`

## Decisiones Vigentes

- Mantener monolito modular; no hay monorepo.
- Usar Vercel como hosting principal.
- Usar `develop -> staging -> main` como flujo de ramas.
- Tratar staging como Vercel Preview Deployment desde rama `staging`.
- Usar PostgreSQL para Prisma y Payload.
- Usar Vercel Blob solo cuando se requiera media persistente fuera de local.
- Mantener datos institucionales sensibles en variables de entorno o CMS, no hardcodeados nuevos en UI.
- No enviar PII en analytics.

## Documentacion Canonica

La documentacion vigente queda separada por responsabilidad:

- Arquitectura: `docs/architecture/v2-architecture.md`
- Diseno visual: `docs/design/public-visual-system.md`
- Operaciones: `docs/operations/README.md`
- Plataformas externas: `docs/operations/external-platforms.md`
- Variables: `docs/operations/environment-variables.md`
- Deploy: `docs/operations/deploy.md`
- Seeds: `docs/operations/seeds.md`
- Admin/CMS: `docs/operations/admin-cms.md`
- Media: `docs/operations/media.md`
- Analytics: `docs/operations/analytics.md`

## Backlog V2.1

Pendientes que no bloquean la V2 actual:

1. Navbar con menus desplegables para subsecciones.
2. Paginas individuales de servicios: `/servicios/[slug]`.
3. Paginas individuales de tratamientos: `/tratamientos/[slug]`.
4. Landing pages por enfermedad o condicion.
5. Blog o articulos.
6. Automatizaciones por email.
7. Integracion CRM.
8. Reportes avanzados.
9. Multiusuario avanzado.
10. Roles y permisos granulares.
11. Auditoria de cambios.
12. Notificaciones internas.
13. Integracion con calendario.

## Investigacion Futura: Netlify

La migracion a Netlify queda como investigacion, no como decision tomada.

Antes de cambiar de hosting:

1. Validar Next.js App Router con SSR, route handlers y Payload.
2. Probar `/admin`, `/api/leads`, `/api/graphql`, `/api/[...slug]`, `robots.txt` y `sitemap.xml`.
3. Revisar compatibilidad de Payload en Netlify Functions con PostgreSQL Neon.
4. Definir reemplazo o continuidad de Vercel Blob.
5. Comparar costos reales considerando sitio publico, admin, APIs, media, logs y branch deploys.
6. Probar una prueba de concepto sin apagar Vercel.

## Definicion De Terminado Para Cambios Futuros

Cada cambio relevante debe cerrar con:

1. Implementacion o documentacion actualizada.
2. Enlaces internos sin rutas rotas.
3. `pnpm lint` cuando aplique.
4. `pnpm test` cuando aplique.
5. `pnpm typecheck` cuando aplique.
6. `pnpm run build` antes de promover a staging o produccion.
7. Registro breve en este documento solo si cambia el alcance de V2 o el backlog.
