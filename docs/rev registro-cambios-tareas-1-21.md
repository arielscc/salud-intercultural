# Registro De Cambios - Tareas 1 A 31

Este documento resume los cambios implementados hasta la Tarea 31 de la V2 de Salud Intercultural. El registro se basa en los entregables presentes en el repositorio y en las tareas confirmadas durante la sesion.

## Tarea 1: Auditoria Inicial Del Proyecto Actual

- Se reviso la estructura existente del proyecto, rutas, componentes y datos locales.
- Se identifico la necesidad de mantener el proyecto como base V2 y escalarlo por modulos.
- Se separaron responsabilidades entre sitio publico, datos, configuracion, leads, CMS y admin.

## Tarea 2: Definicion De Arquitectura Base V2

- Se documento la arquitectura base en `docs/architecture-v2.md`.
- Se definio un monolito modular sobre Next.js App Router.
- Se establecieron carpetas para `app`, `components`, `features`, `modules`, `lib`, `config`, `types`, `hooks`, `styles` y `data`.
- Se dejo definido el mapa funcional de Public, Admin, Leads, CMS y Database.

## Tarea 3: Configuracion Tecnica Del Stack

- Se configuro el stack con Next.js, React, TypeScript, Tailwind, Prisma, Payload CMS y PostgreSQL.
- Se agregaron scripts de desarrollo, build, lint, typecheck, Prisma y Payload en `package.json`.
- Se incorporaron dependencias para formularios, validacion, UI, animaciones, CMS, base de datos y manejo de imagenes.

## Tarea 4: Diseno Del Sistema Visual Publico

- Se documento el sistema visual en `docs/visual-system-v2.md`.
- Se definieron paleta, tipografia, espaciado, animacion y estados visuales.
- Se crearon componentes base como `Button`, `Badge`, `PremiumCard`, `PublicSection`, `VisualState` y `AnimatedCard`.
- Se establecio una UI publica premium, institucional y mobile-first.

## Tarea 5: Layout General Del Sitio Publico

- Se creo el layout publico en `src/app/(public)/layout.tsx`.
- Se implemento `PublicLayout` con header, footer, tracker de conversion y botones flotantes.
- Se definieron rutas publicas principales y legales.
- Se agregaron fuentes, metadata base, tema claro/oscuro y estilos globales.

## Tarea 6: Pagina Inicio V2

- Se construyo la home con secciones principales: hero, trust bar, estadisticas, problemas, servicios, nosotros, beneficios, bloques editables, proceso, testimonios, video, FAQs, contacto y CTA final.
- Se centralizo contenido inicial en `src/data/home.ts`.
- Se agregaron CTAs de WhatsApp y llamada con tracking.
- Se incorporo JSON-LD para SEO.

## Tarea 7: Pagina Nosotros

- Se creo la pagina `/nosotros`.
- Se agrego contenido institucional: historia, mision, vision, valores, filosofia intercultural, equipo destacado y galeria.
- Se centralizo contenido en `src/data/about.ts`.
- Se configuro metadata SEO para la ruta.

## Tarea 8: Pagina Servicios

- Se creo la pagina `/servicios`.
- Se agrego listado de servicios activos y destacados.
- Cada servicio incluye imagen, icono, descripcion, beneficios, problemas relacionados, CTA y metadata SEO.
- Se centralizo contenido inicial en `src/data/services.ts`.

## Tarea 9: Pagina Tratamientos General

- Se creo la pagina `/tratamientos`.
- Se agrego vista general de problemas frecuentes sin rutas individuales.
- Se incorporo orientacion complementaria, pasos de evaluacion y CTA hacia WhatsApp/contacto.
- Se centralizo contenido en `src/data/treatments.ts` y problemas en `src/data/problems.ts`.

## Tarea 10: Pagina Equipo

- Se creo la pagina `/equipo`.
- Se agregaron perfiles profesionales activos con foto, cargo, especialidad, descripcion, credenciales y areas de enfoque.
- Se preparo estructura para perfiles inactivos y orden administrable.
- Se centralizo contenido inicial en `src/data/team.ts`.

## Tarea 11: Pagina Testimonios

- Se creo la pagina `/testimonios`.
- Se agregaron testimonios activos con autor, motivo, rating, fecha y aviso de privacidad.
- Se incluyeron criterios de publicacion responsable y proteccion de identidad.
- Se centralizo contenido inicial en `src/data/testimonials.ts`.

## Tarea 12: Pagina Preguntas Frecuentes

- Se creo la pagina `/preguntas-frecuentes`.
- Se agrego listado con categorias, busqueda, filtro, preguntas destacadas y estado empty.
- Se genero JSON-LD `FAQPage` para SEO.
- Se centralizo contenido inicial en `src/data/faqs.ts`.

## Tarea 13: Pagina Contacto

- Se creo la pagina `/contacto`.
- Se agregaron canales de WhatsApp, llamada y correo.
- Se integro mapa, direccion, horario y formulario principal de contacto.
- Se conecto el formulario con validacion y API de leads.

## Tarea 14: Paginas Legales

- Se crearon paginas legales para politica de privacidad y terminos/condiciones.
- Se agrego contenido institucional orientativo.
- Se conectaron datos de contacto desde configuracion del sitio.
- Se incluyeron enlaces legales en el footer.

## Tarea 15: Modelo De Datos Base Con Prisma

- Se definio el modelo de datos base en Prisma.
- Se generaron modelos para leads, servicios, FAQs, equipo, testimonios, tratamientos y configuracion.
- Se preparo persistencia en PostgreSQL.
- Se agrego seed inicial basado en datos locales.

## Tarea 16: Capa De Base De Datos

- Se creo cliente de base de datos en `src/modules/database/client.ts`.
- Se agregaron helpers de errores y paginacion.
- Se implementaron queries para contenido publico, leads y settings.
- Se centralizo acceso a datos en `src/modules/database`.

## Tarea 17: Sistema De Leads

- Se creo schema de validacion de leads con Zod.
- Se implemento formulario con React Hook Form, honeypot antispam y estados loading, success y error.
- Se creo endpoint `/api/leads`.
- Se agrego persistencia de consultas con fuente, estado y pagina de origen.

## Tarea 18: Integracion WhatsApp Y Llamadas

- Se crearon helpers para links de WhatsApp y llamada en `src/lib/whatsapp.ts`.
- Se agregaron mensajes contextuales por pagina.
- Se conectaron CTAs del header, hero, paginas, servicios y botones flotantes.
- Se incorporaron atributos de conversion para tracking.

## Tarea 19: Payload CMS Base

- Se configuro Payload CMS en `payload.config.ts`.
- Se crearon collections para usuarios, media, servicios, testimonios, FAQs, equipo, paginas y leads.
- Se creo global `site-settings` para marca, contacto, conversion, redes y SEO.
- Se montaron rutas de admin y API de Payload en `src/app/(payload)`.
- Se corrigio el anidamiento de layouts para evitar errores de hidratacion en `/admin`.

## Tarea 20: Sincronizacion Entre CMS Y Sitio Publico

- Se creo la capa CMS/fallback en `src/lib/cms/public-content.ts`.
- Se conecto home con contenido editable, servicios, testimonios, FAQs y SEO desde CMS o fallback.
- Se conectaron paginas publicas de servicios, equipo, testimonios, preguntas frecuentes y contacto.
- Se conecto configuracion global en layout publico, header, footer y botones flotantes.
- Se agregaron estados empty cuando no hay contenido activo.
- Se actualizo JSON-LD para usar servicios y FAQs dinamicos.
- Se configuro revalidacion publica cada 60 segundos.

## Tarea 21: Panel Admin Base

- Se registro un dashboard base en `/admin` con metricas y accesos a leads, servicios, testimonios, FAQs, equipo y configuracion.
- Se agregaron accesos rapidos en la navegacion lateral del admin.
- Se anadieron estados explicitos de loading, error y empty para el segmento admin.
- La proteccion inicial queda cubierta por la autenticacion de Payload.
- El dashboard contempla el caso sin `user`.
- Se regenero el import map de Payload para cargar los componentes nuevos.

## Tarea 22. Cambios principales:

- Reforcé auth de users en Payload con sesiones, expiración configurable, bloqueo por intentos fallidos y cookies seguras en
  producción.
- Añadí helper reutilizable de sesión admin en src/modules/auth/admin.ts.
- Protegí /api/graphql-playground: sin sesión admin redirige a /admin/login.
- Documenté estrategia, roles, login/logout, sesión expirada, endpoints protegidos y variables en docs/admin-auth.md.
- Actualicé .env.example con:
    - ADMIN_SESSION_SECONDS
    - ADMIN_LOCK_MINUTES

## Tarea 23: Admin De Leads

- Se mejoro la collection `lead-submissions` como modulo admin de leads.
- Se agrego busqueda por nombre, telefono y email.
- Se habilito orden inicial por fecha de creacion descendente.
- Se configuraron columnas de listado con nombre, telefono, fuente, estado, fecha de contacto y fecha de creacion.
- Se mantuvieron filtros nativos por estado y fuente.
- Se configuro paginacion simple de 10, 25 y 50 registros.
- Se agrego intro de gestion comercial antes del listado.
- Se agregaron acciones rapidas de WhatsApp y llamada en la vista detalle del lead.
- Se automatizo `contactedAt` cuando el estado cambia a contactado, agendado o cerrado.
- Se regenero el import map de Payload para los componentes admin nuevos.

## Tarea 24: Admin De Contenido Publico

- Se agrego el global `home-content` para gestionar hero, estadisticas, servicios destacados, video y bloques editables de la home desde Payload.
- Se conecto la home publica al global `home-content` con fallback local controlado.
- Se conecto el SEO de la home al global editable cuando exista contenido en CMS.
- Se mantuvo gestion de configuracion global desde `site-settings`.
- Se reforzaron las collections de servicios, testimonios, FAQs, equipo y paginas con busqueda, paginacion, columnas y orden por aparicion.
- Se agregaron limites de longitud y validaciones basicas en campos clave de contenido, SEO, slugs, listas y configuracion.
- Se mantuvieron campos de estado activo/inactivo, destacado y orden para controlar visibilidad publica.
- Se regeneraron tipos de Payload para incluir el nuevo global de home.

## Tarea 25: Media, Imagenes Y Activos Visuales

- Se definio una estrategia central para imagenes publicas y administrables en `src/lib/images.ts`.
- Se configuraron tamanos `sizes` reutilizables para hero, servicios, equipo y galeria.
- Se agrego placeholder blur comun para imagenes publicas renderizadas con `next/image`.
- Se optimizo `next/image` con formatos AVIF/WebP, device sizes e image sizes.
- Se mantuvo soporte para imagenes externas de fallback desde `images.unsplash.com`.
- Se reforzo la collection `media` con alt obligatorio, busqueda, columnas, paginacion, focal point y variantes thumbnail, card, portrait y hero.
- Se hizo obligatorio el texto alternativo en campos de imagen reutilizables de contenido publico.
- Se conecto el alt de media CMS como fallback para servicios y equipo cuando exista imagen administrable.
- Se ajustaron imagenes de home, nosotros, servicios, equipo y galeria para evitar deformaciones con contenedores de aspect ratio y `object-cover`.
- Se documentaron criterios de media, aspect ratios, placeholders y accesibilidad.

## Tarea 26: SEO Tecnico V2

- Centralicé SEO técnico en src/lib/seo.ts.
- Agregué robots.ts y sitemap.ts.
- Metadata pública ahora incluye canonical, Open Graph y Twitter cards de forma consistente.
- SEO editable desde CMS sigue conectado vía getPublicPageMetadata.
- Amplié JSON-LD con MedicalClinic, Organization, LocalBusiness, WebSite, FAQPage, Service y BreadcrumbList.
- Agregué breadcrumbs estructurados en las páginas públicas principales.
- Actualicé el registro de cambios con la Tarea 26.

## Tarea 27: Analytics Y Eventos De Conversion

- Creé la capa src/features/analytics con scripts, page views, eventos y tipos.
- GA4 se activa con NEXT_PUBLIC_GA_ID.
- Meta Pixel se activa con NEXT_PUBLIC_META_PIXEL_ID.
- dataLayer queda disponible siempre para GTM u otros proveedores.
- Se miden page_view, whatsapp_click, call_click, cta_click y form_submit.
- El formulario de leads dispara evento solo cuando el envío fue exitoso.
- No se envían nombres, teléfonos, emails, mensajes ni query strings.
- Documenté el mapa en docs/analytics-events.md y actualicé el registro de tareas.

## Tarea 28: Accesibilidad Y UX Responsive

- Agregué skip link y destino main para navegación por teclado.
- Reforcé foco visible en navegación, menú mobile y CTAs flotantes.
- Mejoré menú mobile con aria-controls, aria-expanded y cierre con Escape.
- Reorganicé CTAs flotantes en mobile y agregué espacio inferior para que no tapen contenido.
- Mejoré el formulario con htmlFor, id, aria-invalid, aria-describedby, aria-busy, role="status" y role="alert".
- Ajusté prefers-reduced-motion para desactivar transformaciones además de animaciones/transiciones.
- Documenté el checklist en docs/accessibility-responsive-checklist.md.

## Tarea 29: Performance Y Core Web Vitals

- Se reviso el uso de componentes client y animaciones del sitio publico.
- Se mantuvieron animaciones con `framer-motion` por calidad visual, usando variantes compartidas y transiciones suaves.
- Se concentro la logica de animacion en `src/lib/motion.ts`.
- Se mantuvo compatibilidad con `prefers-reduced-motion`.
- Se mantuvo uso optimizado de `next/image` con `sizes`, placeholders y `priority` limitado a heroes.
- Se conservo lazy loading de contenido secundario como mapas.
- Se valido el build de produccion con `pnpm build`.
- Se documento el checklist en `docs/performance-core-web-vitals.md`.

## Tarea 30: Seeds Y Contenido Inicial

- Se mantuvo seed Prisma para servicios, problemas frecuentes, equipo, testimonios, FAQs y configuracion.
- Se agrego seed Payload CMS en `scripts/seed-payload.ts`.
- Se agrego seed de usuario admin opcional usando `ADMIN_EMAIL` y `ADMIN_PASSWORD`.
- Se agrego seed CMS de servicios con imagen externa, alt text, beneficios, problemas relacionados, CTA, estado, orden y SEO.
- Se agrego seed CMS de equipo con foto externa, alt text, credenciales, areas de enfoque, estado y orden.
- Se agrego seed CMS de testimonios con privacidad, rating, fecha, estado y orden.
- Se agrego seed CMS de FAQs con categoria, destacado, estado, orden y SEO.
- Se agrego seed CMS de paginas publicas base para metadata editable.
- Se agrego seed de globals `site-settings` y `home-content`.
- Se agregaron scripts `pnpm seed`, `pnpm payload:seed` y `pnpm db:reset`.
- Se documento reset local y ejecucion de seeds en `docs/seeding-local.md`.

## Tarea 31: Variables De Entorno Y Configuracion

- Se actualizo `.env.example` separando configuracion publica, privada, analytics, contacto, Payload, admin, seguridad y build.
- Se agrego `CMS_READS_DURING_BUILD` a la plantilla de variables para controlar lecturas del CMS durante build.
- Se centralizo la validacion con Zod en `src/lib/env.ts`.
- Se separaron schemas `publicEnvSchema`, `privateEnvSchema` y `envSchema`.
- Se agregaron validaciones de URL, Postgres, email, telefono, GA4, Meta Pixel, password admin y `PAYLOAD_SECRET`.
- Se tratan strings vacios como variables no configuradas para evitar errores en opcionales.
- Se documento la configuracion local, staging y produccion en `docs/env-configuration.md`.
- Se agrego checklist de credenciales, keys y sitios externos en `docs/env-services-checklist.md`.
- Se documento que Analytics, Meta Pixel, Search Console y dominio final pueden activarse despues si aun no existe dominio comprado.
- Se agrego recomendacion explicita de rotar credenciales reales compartidas por chat o commits.
- Se dejo `+59164175822` como numero principal para WhatsApp y llamadas; `+59162287251` queda como numero alternativo para ambos canales.
- Se ajusto la guia de ambientes para usar local, staging y produccion.
- Se actualizo el flujo de ramas a `develop` local -> `staging` -> `main` produccion.
- Se documento el flujo de ramas en `docs/git-branch-flow.md`.
- Se preparo `.env.staging` local ignorado por git para ejecutar el primer seed de staging.
- Se agrego el script `pnpm payload:seed:staging`.
- Se simplifico `docs/env-services-checklist.md` para mostrar solo pendientes numerados con instrucciones por numero.
- Se agrego `@next/env` como dependencia directa para que los scripts `tsx` puedan importar Payload correctamente al ejecutar seeds.

## Tarea 32: Testing Base

- Helpers criticos: WhatsApp/call links y paginacion.
- Schemas Zod de leads: defaults, validaciones, campos opcionales y sanitizacion.
- Formulario publico de leads: validacion cliente, submit exitoso, error de API y tracking.
- Route handler `/api/leads`: payload invalido, honeypot, rate limit, persistencia exitosa y fallo de persistencia.
- Render basico de paginas clave: Home y Contacto con contenido CMS mockeado.
- Fixtures reutilizables en `tests/fixtures`.

## Tarea 33: QA Funcional Del Sitio Publico

- Se revisaron las rutas publicas obligatorias: `/`, `/nosotros`, `/servicios`, `/tratamientos`, `/equipo`, `/testimonios`, `/preguntas-frecuentes`, `/contacto`, `/politica-privacidad` y `/terminos-condiciones`.
- Todas las rutas publicas respondieron `200` en servidor local.
- Se validaron `robots.txt` y `sitemap.xml` con respuesta `200`.
- Se revisaron titulos, H1, meta description, canonical y JSON-LD en las paginas publicas.
- Se valido que cada pagina publica tenga un solo H1 principal.
- Se revisaron enlaces internos generados desde header, footer, legales, CTAs y contenido; todos respondieron `200`.
- Se revisaron CTAs de WhatsApp, llamada, contacto, servicios, FAQs y legales.
- Se reviso el formulario de leads: payload invalido responde `400` con errores de campo y payload valido sin base de datos responde `500` controlado con mensaje generico.
- Se revisaron estados empty existentes para servicios destacados, servicios activos, FAQs filtradas y contenido administrable.
- Se revisaron patrones responsive mobile/tablet/desktop en header, menu movil, grids, formularios, botones flotantes y footer.
- Se corrigio la capa CMS/fallback para evitar errores de consola al renderizar paginas publicas o sitemap cuando PostgreSQL/Payload no esta disponible en local.
- Se reutilizo el fallback local sin inicializar Payload cuando la base de datos CMS no es alcanzable.
- Se mantuvo sitemap con rutas estaticas cuando CMS no esta disponible.
- Se validaron pruebas automatizadas con `pnpm test`.
- Se valido lint con `pnpm lint`.
- Se valido typecheck con `DATABASE_URL=postgresql://user:password@localhost:5432/clinica_codex pnpm typecheck`.
- Se valido build de produccion con `DATABASE_URL=postgresql://user:password@localhost:5432/clinica_codex pnpm run build` fuera del sandbox.



El archivo `docs/guia-implementacion-v2.md` existe como guia de referencia y no fue modificado al crear este registro.
