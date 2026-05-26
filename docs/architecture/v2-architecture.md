# Arquitectura V2

## Decision

La V2 mantiene el proyecto como un monolito modular sobre Next.js App Router.
No se migra a un monorepo con `apps/web`, `apps/admin` y `packages/*`.

Esta decision reduce complejidad operativa, aprovecha la base existente y deja una estructura suficiente para sitio publico, Payload CMS, admin, leads, SEO, analytics y contenido administrable.

El monorepo queda como opcion futura si aparecen aplicaciones separadas, equipos paralelos o dominios clinicos mas grandes.

## Arquitectura

```txt
Modular Monolith Escalable
```

Responsabilidades principales:

- `src/app`: rutas App Router, layouts, route handlers, sitemap y robots.
- `src/components`: componentes visuales compartidos, publicos y de landing.
- `src/features`: dominios de producto con UI cliente, schemas y tracking.
- `src/modules`: integraciones transversales de backend como auth y database.
- `src/lib`: utilidades tecnicas, SEO, entorno, CMS/fallback, imagenes y WhatsApp.
- `src/config`: configuracion tipada de marca, rutas, stack y sitio.
- `src/payload`: colecciones, globals, access rules y componentes admin de Payload.
- `src/data`: datos fallback y seeds de contenido publico.
- `src/types`: contratos compartidos.

## Estructura Actual

```txt
src/
├── app/
│   ├── (public)/
│   ├── (payload)/
│   ├── api/leads/
│   ├── globals.css
│   ├── robots.ts
│   └── sitemap.ts
├── components/
│   ├── landing/
│   ├── public/
│   ├── shared/
│   └── ui/
├── features/
│   ├── analytics/
│   └── leads/
├── lib/
│   ├── cms/
│   ├── env.ts
│   ├── images.ts
│   ├── seo.ts
│   └── whatsapp.ts
├── modules/
│   ├── auth/
│   └── database/
├── payload/
│   ├── admin/
│   ├── collections/
│   ├── globals/
│   ├── access.ts
│   └── fields.ts
├── config/
├── data/
├── hooks/
├── styles/
└── types/
```

Fuera de `src`:

```txt
prisma/
├── schema.prisma
├── seed.ts
└── migrations/

scripts/
└── seed-payload.ts

payload.config.ts
next.config.mjs
.env.example
```

## Sitio Publico

Ubicacion:

```txt
src/app/(public)
src/components/public
src/components/landing
src/components/shared
src/data
src/lib/cms/public-content.ts
```

Responsabilidades:

- Paginas institucionales.
- CTAs de WhatsApp, llamada y formulario.
- Contenido desde Payload CMS cuando esta disponible.
- Fallback local desde `src/data` cuando CMS o PostgreSQL no estan disponibles.
- Metadata por pagina.
- Experiencia responsive y mobile-first.

Rutas publicas:

```txt
/
/nosotros
/servicios
/tratamientos
/equipo
/testimonios
/preguntas-frecuentes
/contacto
/politica-privacidad
/terminos-condiciones
```

Queda fuera de V2:

```txt
/servicios/[slug]
/tratamientos/[slug]
/blog
/enfermedades/[slug]
```

## Admin Y CMS

Ubicacion:

```txt
src/app/(payload)/admin
src/app/(payload)/api
src/payload
payload.config.ts
```

La V2 usa Payload como panel base en `/admin`. No existe un admin paralelo en `src/app/admin`.

Rutas principales:

```txt
/admin
/admin/login
/admin/logout
/admin/collections/*
/admin/globals/*
```

Payload API:

```txt
/api/[...slug]
/api/graphql
/api/graphql-playground
```

Collections:

```txt
services
team-members
testimonials
faqs
pages
media
lead-submissions
users
```

Globals:

```txt
site-settings
home-content
```

## Leads

Ubicacion:

```txt
src/app/api/leads/route.ts
src/features/leads/schemas/lead.schema.ts
src/modules/database/queries/leads.ts
src/payload/collections/LeadSubmissions.ts
```

Responsabilidades:

- Capturar consultas desde formulario publico.
- Validar con Zod en cliente y servidor.
- Aplicar honeypot y rate limit basico.
- Sanitizar datos en servidor.
- Persistir en PostgreSQL.
- Exponer leads en Payload dentro de `lead-submissions`.
- Emitir evento de conversion despues de envio exitoso.

Endpoint publico implementado:

```txt
POST /api/leads
```

Estados:

```txt
new
contacted
scheduled
closed
lost
```

Fuentes:

```txt
website
whatsapp
facebook
tiktok
google
call
```

## Database

Ubicacion:

```txt
src/modules/database
prisma/schema.prisma
prisma/migrations
```

Responsabilidades:

- Cliente Prisma con adapter PostgreSQL.
- Queries agrupadas por dominio.
- Paginacion y manejo de errores.
- Migraciones.
- Seeds Prisma.

Payload tambien usa PostgreSQL mediante `@payloadcms/db-postgres` y el schema `PAYLOAD_DB_SCHEMA`.

## CMS Y Fallback

Ubicacion:

```txt
src/lib/cms/public-content.ts
src/payload
src/data
```

Responsabilidades:

- Leer contenido publico desde Payload cuando existe.
- Resolver contenido fallback desde `src/data`.
- Evitar fallos publicos cuando CMS o PostgreSQL no estan disponibles.
- Omitir lecturas CMS durante production build si `CMS_READS_DURING_BUILD` no es `"true"`.

## SEO

Ubicacion:

```txt
src/lib/seo.ts
src/lib/structured-data.ts
src/components/shared/SEOJsonLd.tsx
src/app/sitemap.ts
src/app/robots.ts
```

Responsabilidades:

- Metadata por pagina.
- Open Graph y Twitter Cards.
- Canonicals.
- Sitemap y robots.
- Schema.org institucional, local, servicios y FAQ.

## Analytics

Ubicacion:

```txt
src/features/analytics
src/components/public/PublicLayout.tsx
```

Eventos:

```txt
page_view
whatsapp_click
call_click
cta_click
form_submit
```

GA4 y Meta Pixel se activan con variables publicas. `dataLayer` queda disponible como capa comun.

## Configuracion Y Entorno

Ubicacion:

```txt
src/lib/env.ts
src/config
.env.example
docs/operations/environment-variables.md
```

Reglas:

- Variables publicas con prefijo `NEXT_PUBLIC_`.
- Secretos, credenciales y conexiones solo del lado servidor.
- Validacion centralizada con Zod en `src/lib/env.ts`.
- Strings vacios se tratan como variables no configuradas para opcionales.

## Documentacion

```txt
docs/architecture/   referencias tecnicas
docs/design/         sistema visual y referencias UI
docs/operations/    procedimientos operativos y QA
docs/project/       estado de version, backlog y preparacion V3
```

## Convenciones

- Server Components por defecto.
- Client Components solo para interaccion real.
- Componentes React en `PascalCase.tsx`.
- Utilidades, configs y schemas en `kebab-case.ts`.
- No colocar logica de negocio pesada dentro de componentes visuales.
- Validaciones de formulario cerca del dominio correspondiente.
- Datos estaticos actuales se tratan como seed temporal o fallback.
- No hardcodear datos institucionales nuevos en UI.
- SEO por pagina publica con title, description, canonical y Open Graph.
- Admin con UI densa, sobria y orientada a tareas.
- Eliminaciones administrativas deben estar restringidas por access rules y, cuando haya acciones propias, pedir confirmacion.
