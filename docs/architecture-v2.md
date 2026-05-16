# Arquitectura Base V2

## Decision

La V2 mantiene el proyecto actual como un monolito modular sobre Next.js App Router.
No se migra todavia a un monorepo con `apps/web`, `apps/admin` y `packages/*`.

Esta decision reduce complejidad operativa, aprovecha la landing existente y deja una
estructura suficiente para sitio publico, panel administrativo basico, CMS, leads, SEO y
analytics. El monorepo queda como opcion futura si aparecen aplicaciones separadas,
equipos paralelos o dominios clinicos mas grandes.

## Arquitectura

```txt
Modular Monolith Escalable
```

Responsabilidades principales:

- `src/app`: rutas, layouts, route handlers, sitemap y robots.
- `src/components`: componentes visuales compartidos, publicos y administrativos.
- `src/features`: dominios de producto con UI, schemas, servicios y acciones.
- `src/modules`: integraciones transversales como CMS, base de datos, auth, media y settings.
- `src/lib`: utilidades tecnicas de bajo nivel.
- `src/config`: configuracion tipada de marca, rutas, SEO, analytics y navegacion.
- `src/types`: contratos compartidos.
- `src/hooks`: hooks reutilizables.
- `src/styles`: tokens y estilos compartidos fuera de `globals.css`.

## Estructura Propuesta

```txt
src/
├── app/
│   ├── (public)/
│   │   ├── page.tsx
│   │   ├── nosotros/
│   │   ├── servicios/
│   │   ├── tratamientos/
│   │   ├── equipo/
│   │   ├── testimonios/
│   │   ├── preguntas-frecuentes/
│   │   ├── contacto/
│   │   ├── politica-privacidad/
│   │   └── terminos-condiciones/
│   ├── admin/
│   │   ├── page.tsx
│   │   ├── leads/
│   │   ├── servicios/
│   │   ├── testimonios/
│   │   ├── faqs/
│   │   └── configuracion/
│   ├── api/
│   │   ├── leads/
│   │   ├── analytics/
│   │   └── webhooks/
│   ├── layout.tsx
│   ├── globals.css
│   ├── robots.ts
│   └── sitemap.ts
├── components/
│   ├── ui/
│   ├── shared/
│   ├── public/
│   └── admin/
├── features/
│   ├── home/
│   ├── services/
│   ├── treatments/
│   ├── team/
│   ├── testimonials/
│   ├── faq/
│   ├── contact/
│   ├── leads/
│   ├── admin/
│   ├── seo/
│   └── analytics/
├── modules/
│   ├── cms/
│   ├── database/
│   ├── auth/
│   ├── media/
│   └── settings/
├── lib/
├── config/
├── hooks/
├── styles/
├── types/
└── data/
    └── seed/
```

Fuera de `src`, cuando se implementen las siguientes tareas:

```txt
prisma/
├── schema.prisma
└── migrations/

payload.config.ts
.env.example
```

## Mapa De Modulos

### Public

Ubicacion:

```txt
src/app/(public)
src/components/public
src/features/home
src/features/services
src/features/treatments
src/features/team
src/features/testimonials
src/features/faq
src/features/contact
```

Responsabilidades:

- Paginas institucionales.
- CTAs de WhatsApp, llamada y formulario.
- Contenido consumido desde CMS cuando este disponible.
- Metadata por pagina.
- Experiencia responsive y mobile-first.

### Admin

Ubicacion:

```txt
src/app/admin
src/components/admin
src/features/admin
```

Responsabilidades:

- Dashboard.
- Gestion de leads.
- Gestion de servicios.
- Gestion de testimonios.
- Gestion de FAQs.
- Configuracion basica.
- Estados loading, error, empty y disabled.

### Leads

Ubicacion:

```txt
src/features/leads
src/app/api/leads
src/types/lead.ts
```

Responsabilidades:

- Capturar consultas.
- Validar con Zod en cliente y servidor.
- Sanitizar datos en servidor.
- Persistir en PostgreSQL.
- Listar, actualizar estado y eliminar leads desde admin.
- Emitir eventos de conversion.

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

### CMS

Ubicacion:

```txt
src/modules/cms
payload.config.ts
```

Collections previstas:

```txt
services
testimonials
faqs
team
settings
pages
media
leads
```

### Database

Ubicacion:

```txt
src/modules/database
src/lib/prisma.ts
prisma/schema.prisma
```

Responsabilidades:

- Conexion PostgreSQL.
- Cliente Prisma.
- Migraciones.
- Seeds iniciales.
- Contratos compartidos con features.

### SEO

Ubicacion:

```txt
src/features/seo
src/config/seo.ts
src/app/sitemap.ts
src/app/robots.ts
```

Responsabilidades:

- Metadata dinamica.
- Open Graph y Twitter Cards.
- Canonicals.
- Sitemap y robots.
- Schema.org institucional, local, servicios y FAQ.

### Analytics

Ubicacion:

```txt
src/features/analytics
src/config/analytics.ts
src/app/api/analytics
```

Eventos iniciales:

```txt
click_whatsapp
click_call
submit_form
```

### Settings

Ubicacion:

```txt
src/modules/settings
src/types/settings.ts
```

Responsabilidades:

- Telefonos.
- WhatsApp.
- Correo.
- Direccion.
- Horarios.
- Redes sociales.
- CTA principal.
- Hero principal.
- Google Maps.

## Rutas Publicas

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

## Rutas Administrativas

```txt
/admin
/admin/leads
/admin/servicios
/admin/testimonios
/admin/faqs
/admin/configuracion
```

Si Payload CMS necesita ocupar `/admin`, el dashboard propio puede moverse a `/panel`.
Para la V2 se prioriza aprovechar Payload como panel base.

## Rutas API

```txt
POST   /api/leads
GET    /api/leads
PATCH  /api/leads/[id]
DELETE /api/leads/[id]
POST   /api/analytics/events
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
- Eliminaciones en admin deben pedir confirmacion.

## Variables De Entorno

Las variables publicas deben usar prefijo `NEXT_PUBLIC_`. Secretos, credenciales y
conexiones de base de datos deben permanecer solo del lado servidor.

La app debe poder compilar en desarrollo aunque analytics no este configurado. Las
variables criticas de produccion se validaran en `src/lib/env.ts` cuando se implemente
la capa de backend/CMS.

