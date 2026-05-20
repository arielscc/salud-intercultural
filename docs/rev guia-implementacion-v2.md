# Guia De Implementacion V2 - Salud Intercultural

Documento maestro para dividir la Version 2 de la plataforma en tareas ejecutables, auditables y con entregables claros.

La V2 contempla sitio publico institucional, panel administrativo, CMS, sistema de leads, base de datos, SEO, analytics, automatizaciones basicas y preparacion para crecimiento posterior.

## Principios De Ejecucion

- No implementar cambios grandes sin diagnostico previo.
- Mantener monolito modular salvo que el crecimiento obligue a monorepo.
- Separar dominio publico, admin, leads, CMS, SEO, analytics y configuracion.
- Priorizar componentes reutilizables y contenido administrable.
- Validar cada bloque con build, lint y typecheck cuando aplique.
- Cada tarea debe cerrar con un commit pequeno y descriptivo.

---

## Tarea 1: Auditoria Inicial Del Proyecto Actual

### Objetivo

Entender el estado actual antes de tocar arquitectura.

### Incluye

- Revisar estructura actual del proyecto.
- Identificar stack ya instalado.
- Revisar si ya existe Next.js App Router.
- Revisar Tailwind CSS, shadcn/ui, Framer Motion y Lucide React.
- Revisar componentes actuales de la landing.
- Revisar rutas existentes.
- Revisar formularios actuales.
- Revisar configuracion SEO actual.
- Revisar si existe backend, base de datos o CMS.
- Detectar deuda tecnica antes de escalar a V2.

### Entregable

- Diagnostico breve del estado actual.
- Lista de archivos principales afectados o revisados.
- Decision de si conviene adaptar la estructura existente o reorganizar parcialmente.

### Commit Ideal

```txt
docs: audit current project state for v2
```

---

## Tarea 2: Definicion De Arquitectura Base V2

### Objetivo

Dejar una base escalable para sitio publico, admin, CMS y leads.

### Incluye

- Definir arquitectura modular monolitica.
- Decidir si se usara monorepo con `apps/web`, `apps/admin`, `packages/ui`, `packages/config`, `packages/database`, `packages/types`.
- Decidir si se adapta el repo actual sin monorepo.
- Definir estructura interna:
  - `src/app`
  - `src/components`
  - `src/features`
  - `src/modules`
  - `src/lib`
  - `src/config`
  - `src/types`
  - `src/hooks`
  - `src/styles`
- Separar dominio publico, admin, leads, CMS, SEO y analytics.
- Definir convenciones de nombres.
- Definir rutas publicas.
- Definir rutas administrativas.
- Definir estrategia de variables de entorno.

### Entregable

- Estructura final propuesta del proyecto.
- Mapa de modulos.
- Convenciones tecnicas para la V2.

### Commit Ideal

```txt
docs: define v2 modular architecture
```

---

## Tarea 3: Configuracion Tecnica Del Stack

### Objetivo

Preparar las dependencias obligatorias.

### Incluye

- Confirmar Next.js App Router.
- Configurar TypeScript estricto.
- Configurar Tailwind CSS.
- Configurar shadcn/ui.
- Configurar Framer Motion.
- Configurar Lucide React.
- Configurar React Hook Form.
- Configurar Zod.
- Configurar Prisma.
- Configurar PostgreSQL.
- Preparar Payload CMS.
- Preparar variables de entorno.
- Validar scripts de desarrollo, build y lint.

### Entregable

- Proyecto listo para desarrollo V2.
- Dependencias instaladas y configuradas.
- Build base funcional.

### Commit Ideal

```txt
chore: configure v2 technical stack
```

---

## Tarea 4: Diseno Del Sistema Visual Publico

### Objetivo

Definir la base visual premium antes de crear paginas.

### Incluye

- Definir paleta visual institucional.
- Definir tipografias.
- Definir sistema de espaciado.
- Definir estilos de botones.
- Definir cards premium.
- Definir glassmorphism moderado.
- Definir gradientes suaves.
- Definir estilos de secciones.
- Definir componentes responsive.
- Definir estados visuales:
  - `default`
  - `hover`
  - `active`
  - `loading`
  - `error`
  - `success`
  - `disabled`
  - `empty`
- Definir patron de animaciones con Framer Motion.
- Mantener inspiracion visual del sitio de referencia sin copiarlo literalmente.

### Entregable

- Sistema UI base.
- Componentes reutilizables iniciales.
- Guia visual aplicada al sitio publico.

### Commit Ideal

```txt
feat: add public v2 visual system
```

---

## Tarea 5: Layout General Del Sitio Publico

### Objetivo

Convertir la landing en sitio institucional completo.

### Incluye

- Crear layout publico global.
- Header responsive.
- Navegacion desktop.
- Navegacion mobile.
- Footer institucional.
- CTAs persistentes.
- Boton WhatsApp.
- Boton llamada.
- Estructura base para paginas publicas.
- Integracion de configuracion global editable en el futuro.

### Rutas Obligatorias

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

### Entregable

- Navegacion completa.
- Layout responsive.
- Todas las rutas creadas con estructura base.

### Commit Ideal

```txt
feat: create public site layout and routes
```

---

## Tarea 6: Pagina Inicio V2

### Objetivo

Mejorar la home como pagina principal de conversion.

### Incluye

- Hero mas robusto.
- CTA principal.
- CTA secundario.
- Estadisticas institucionales.
- Servicios destacados dinamicos.
- Testimonios dinamicos.
- Video destacado dinamico o placeholder preparado.
- Seccion de confianza institucional.
- Seccion de problemas frecuentes.
- Formulario principal conectado al sistema de leads.
- Bloques editables desde CMS.
- Animaciones suaves.
- Optimizacion mobile-first.

### Entregable

- Home completa, premium, responsive y orientada a conversion.

### Commit Ideal

```txt
feat: build v2 conversion home page
```

---

## Tarea 7: Pagina Nosotros

### Objetivo

Construir la pagina institucional de confianza.

### Incluye

- Historia.
- Mision.
- Vision.
- Valores.
- Filosofia intercultural.
- Equipo destacado.
- Fotografias.
- Contenido institucional editable.
- CTA hacia contacto o WhatsApp.
- SEO institucional.

### Entregable

- Pagina `/nosotros` completa y editable desde CMS.

### Commit Ideal

```txt
feat: add about page for v2 public site
```

---

## Tarea 8: Pagina Servicios

### Objetivo

Crear pagina general de servicios sin paginas individuales todavia.

### Incluye

- Listado de servicios.
- Cards de servicios.
- Imagen por servicio.
- Nombre.
- Descripcion.
- Beneficios.
- Problemas relacionados.
- CTA WhatsApp.
- SEO metadata por servicio dentro del CMS.
- Estado activo/inactivo.
- Servicios destacados.

### No Incluir Todavia

- `/servicios/[slug]`
- `/tratamientos/[slug]`
- Landing pages por enfermedad.

### Entregable

- Pagina `/servicios` dinamica y administrable.

### Commit Ideal

```txt
feat: add dynamic services overview page
```

---

## Tarea 9: Pagina Tratamientos General

### Objetivo

Crear una pagina informativa general de tratamientos.

### Incluye

- Cards de problemas frecuentes.
- Informacion general.
- Orientacion complementaria.
- Llamados a evaluacion.
- CTA de WhatsApp.
- CTA de formulario.
- Contenido administrable.
- SEO institucional.

### No Incluir

- `/tratamientos/presion-alta`
- `/tratamientos/diabetes`
- `/tratamientos/[slug]`

### Entregable

- Pagina `/tratamientos` general, sin rutas individuales.

### Commit Ideal

```txt
feat: add general treatments page
```

---

## Tarea 10: Pagina Equipo

### Objetivo

Presentar al equipo medico y futuro personal.

### Incluye

- Dra. Cinthia Jessica Chipana Chipana.
- Dr. Jhonn Franco Chipana Chipana.
- Soporte para equipo futuro.
- Foto.
- Nombre.
- Cargo.
- Especialidad.
- Descripcion.
- Estado activo/inactivo.
- Orden de aparicion.
- Contenido editable desde panel.

### Entregable

- Pagina `/equipo` dinamica y administrable.

### Commit Ideal

```txt
feat: add team page with editable profiles
```

---

## Tarea 11: Pagina Testimonios

### Objetivo

Crear una pagina de prueba social y confianza.

### Incluye

- Listado de testimonios.
- Nombre o iniciales del paciente.
- Tipo de tratamiento o motivo de consulta.
- Testimonio.
- Rating opcional.
- Fecha opcional.
- Estado activo/inactivo.
- Orden de aparicion.
- Testimonios destacados para home.
- Aviso de privacidad cuando corresponda.
- CTA hacia contacto y WhatsApp.
- SEO institucional.

### Entregable

- Pagina `/testimonios` dinamica y administrable.

### Commit Ideal

```txt
feat: add testimonials page
```

---

## Tarea 12: Pagina Preguntas Frecuentes

### Objetivo

Resolver dudas comunes antes de la conversion.

### Incluye

- Listado de FAQs.
- Categorias de preguntas.
- Busqueda o filtro simple si el volumen lo justifica.
- Preguntas destacadas para home.
- Contenido administrable.
- Schema FAQ para SEO.
- CTA hacia contacto y WhatsApp.
- Estados empty y loading.

### Entregable

- Pagina `/preguntas-frecuentes` completa, administrable y optimizada para SEO.

### Commit Ideal

```txt
feat: add faq page with structured data
```

---

## Tarea 13: Pagina Contacto

### Objetivo

Centralizar canales de contacto y conversion.

### Incluye

- Formulario principal de contacto.
- Validacion con React Hook Form y Zod.
- Datos de telefono, WhatsApp, direccion y horarios.
- Mapa o placeholder de mapa.
- CTA directo a llamada.
- CTA directo a WhatsApp.
- Informacion institucional editable.
- Mensajes de exito y error.
- Proteccion basica contra spam.
- Registro de lead desde formulario.

### Entregable

- Pagina `/contacto` funcional y conectada al sistema de leads.

### Commit Ideal

```txt
feat: add contact page and lead form
```

---

## Tarea 14: Paginas Legales

### Objetivo

Agregar base legal minima para operacion publica.

### Incluye

- Pagina `/politica-privacidad`.
- Pagina `/terminos-condiciones`.
- Contenido editable en el futuro.
- Informacion sobre tratamiento de datos personales.
- Alcance de informacion medica publicada.
- Aviso de que el sitio no reemplaza consulta profesional.
- Metadata SEO no agresiva.

### Entregable

- Paginas legales publicadas y enlazadas desde footer.

### Commit Ideal

```txt
feat: add public legal pages
```

---

## Tarea 15: Modelo De Datos Base Con Prisma

### Objetivo

Definir la base persistente para leads, contenido administrable y configuracion.

### Incluye

- Crear o completar `prisma/schema.prisma`.
- Configurar datasource PostgreSQL.
- Definir modelo `Lead`.
- Definir modelo `Service`.
- Definir modelo `TreatmentTopic` o equivalente general.
- Definir modelo `TeamMember`.
- Definir modelo `Testimonial`.
- Definir modelo `Faq`.
- Definir modelo `SiteSetting`.
- Definir campos SEO reutilizables.
- Definir estados activo/inactivo.
- Definir ordenamiento.
- Definir timestamps.
- Preparar migracion inicial.

### Entregable

- Schema Prisma base.
- Migracion inicial.
- Cliente Prisma generado.

### Commit Ideal

```txt
feat: add prisma data model for v2
```

---

## Tarea 16: Capa De Base De Datos

### Objetivo

Crear una capa segura y reutilizable para consultar datos.

### Incluye

- Crear cliente Prisma singleton.
- Separar queries por dominio.
- Evitar consultas directas dispersas en componentes.
- Manejar errores de conexion.
- Preparar helpers para paginacion y ordenamiento.
- Preparar seed inicial.
- Documentar uso de `DATABASE_URL`.

### Entregable

- Modulo de base de datos listo para features publicas y admin.

### Commit Ideal

```txt
feat: add database access layer
```

---

## Tarea 17: Sistema De Leads

### Objetivo

Capturar, validar, almacenar y gestionar oportunidades comerciales.

### Incluye

- Definir schema Zod de lead.
- Crear formulario reutilizable de lead.
- Crear route handler `POST /api/leads`.
- Validar datos en cliente y servidor.
- Persistir lead en PostgreSQL.
- Registrar fuente del lead.
- Registrar pagina de origen.
- Soportar campos:
  - nombre
  - telefono
  - email opcional
  - motivo de consulta
  - mensaje
  - fuente
  - estado
- Estados:
  - `new`
  - `contacted`
  - `scheduled`
  - `closed`
  - `lost`
- Mensajes de exito y error.
- Proteccion basica anti-spam.

### Entregable

- Sistema de captura de leads funcionando desde formularios publicos.

### Commit Ideal

```txt
feat: implement lead capture system
```

---

## Tarea 18: Integracion WhatsApp Y Llamadas

### Objetivo

Mejorar conversion directa desde canales rapidos.

### Incluye

- Helper para construir mensajes de WhatsApp.
- Boton flotante WhatsApp.
- Boton flotante de llamada.
- CTAs contextuales por pagina.
- Mensajes prellenados segun servicio o pagina.
- Tracking de click como evento de conversion.
- Configuracion centralizada de telefono y horarios.
- Estados responsive para no tapar contenido.

### Entregable

- CTAs de WhatsApp y llamada consistentes en todo el sitio publico.

### Commit Ideal

```txt
feat: add whatsapp and call conversion actions
```

---

## Tarea 19: Payload CMS Base

### Objetivo

Preparar CMS para administrar contenido sin tocar codigo.

### Incluye

- Configurar Payload CMS con Next.js.
- Configurar PostgreSQL como base de Payload si aplica.
- Configurar colecciones:
  - servicios
  - testimonios
  - preguntas frecuentes
  - equipo
  - paginas
  - configuracion global
  - media
  - leads si conviene centralizar
- Definir campos reutilizables de SEO.
- Definir campos de estado y orden.
- Definir permisos iniciales.
- Definir usuario administrador inicial.
- Preparar carga de archivos/media.

### Entregable

- Payload CMS inicial funcionando y listo para administrar contenido V2.

### Commit Ideal

```txt
feat: configure payload cms for v2 content
```

---

## Tarea 20: Sincronizacion Entre CMS Y Sitio Publico

### Objetivo

Consumir contenido administrable desde las paginas publicas.

### Incluye

- Crear servicios de lectura del CMS.
- Definir fallback con datos locales cuando CMS no tenga contenido.
- Conectar home con bloques editables.
- Conectar servicios.
- Conectar equipo.
- Conectar testimonios.
- Conectar FAQs.
- Conectar configuracion global.
- Manejar estados loading, error y empty.
- Mantener SEO generado desde contenido administrable.

### Entregable

- Sitio publico leyendo contenido desde CMS o fallback controlado.

### Commit Ideal

```txt
feat: connect public pages to cms content
```

---

## Tarea 21: Panel Admin Base

### Objetivo

Crear estructura inicial del panel administrativo.

### Incluye

- Ruta `/admin`.
- Layout administrativo.
- Sidebar o navegacion superior.
- Dashboard inicial.
- Accesos a:
  - leads
  - servicios
  - testimonios
  - FAQs
  - equipo
  - configuracion
- Estados loading, error y empty.
- Proteccion inicial de acceso.
- UI consistente con sistema visual admin.

### Entregable

- Panel admin base navegable.

### Commit Ideal

```txt
feat: create admin dashboard shell
```

---

## Tarea 22: Autenticacion Y Proteccion Del Admin

### Objetivo

Evitar acceso publico al panel administrativo.

### Incluye

- Definir estrategia de autenticacion.
- Integrar autenticacion compatible con Payload o Next.js.
- Proteger rutas `/admin`.
- Proteger endpoints administrativos.
- Crear flujo de login.
- Crear flujo de logout.
- Manejar sesion expirada.
- Definir roles iniciales:
  - `admin`
  - `editor`
- Documentar variables de entorno necesarias.

### Entregable

- Admin protegido con autenticacion funcional.

### Commit Ideal

```txt
feat: protect admin routes with authentication
```

---

## Tarea 23: Admin De Leads

### Objetivo

Permitir gestion comercial basica de leads.

### Incluye

- Listado de leads.
- Filtro por estado.
- Filtro por fuente.
- Busqueda por nombre, telefono o email.
- Vista detalle del lead.
- Cambio de estado.
- Notas internas.
- Fecha de creacion.
- Fecha de ultimo contacto.
- Accion rapida para WhatsApp.
- Accion rapida para llamada.
- Empty state.
- Paginacion simple.

### Entregable

- Modulo admin de leads funcional.

### Commit Ideal

```txt
feat: add admin lead management
```

---

## Tarea 24: Admin De Contenido Publico

### Objetivo

Permitir editar contenido clave del sitio desde panel o CMS.

### Incluye

- Gestion de servicios.
- Gestion de testimonios.
- Gestion de FAQs.
- Gestion de equipo.
- Gestion de bloques de home.
- Gestion de configuracion global.
- Campos de estado activo/inactivo.
- Orden de aparicion.
- Campos SEO.
- Validaciones.
- Confirmaciones de guardado.

### Entregable

- Contenido principal editable sin modificar codigo.

### Commit Ideal

```txt
feat: add admin content management
```

---

## Tarea 25: Media, Imagenes Y Activos Visuales

### Objetivo

Preparar manejo correcto de imagenes publicas y administrables.

### Incluye

- Definir estrategia de imagenes locales o CMS media.
- Optimizar uso de `next/image`.
- Definir tamaños y aspect ratios.
- Preparar placeholders.
- Agregar alt text obligatorio.
- Evitar imagenes deformadas.
- Preparar fotografias de equipo.
- Preparar imagenes por servicio.
- Configurar dominios remotos si aplica.

### Entregable

- Sistema de imagenes consistente, optimizado y accesible.

### Commit Ideal

```txt
feat: configure media handling for public content
```

---

## Tarea 26: SEO Tecnico V2

### Objetivo

Preparar el sitio para indexacion correcta y crecimiento organico.

### Incluye

- Metadata por pagina publica.
- Open Graph.
- Twitter cards.
- Canonical URLs.
- `robots.ts`.
- `sitemap.ts`.
- JSON-LD:
  - Organization
  - LocalBusiness o MedicalClinic si aplica.
  - FAQPage.
  - BreadcrumbList.
- Configuracion central de SEO.
- SEO editable desde CMS.
- Validar titulos y descripciones.

### Entregable

- SEO tecnico base completo para sitio institucional.

### Commit Ideal

```txt
feat: add v2 technical seo foundation
```

---

## Tarea 27: Analytics Y Eventos De Conversion

### Objetivo

Medir trafico, interacciones y conversiones.

### Incluye

- Definir proveedor de analytics.
- Configurar variables de entorno.
- Medir page views.
- Medir envio de formularios.
- Medir clicks en WhatsApp.
- Medir clicks en llamada.
- Medir CTAs principales.
- Separar eventos por pagina y fuente.
- Evitar romper privacidad.
- Preparar capa `src/features/analytics`.

### Entregable

- Eventos de conversion listos para medicion.

### Commit Ideal

```txt
feat: add analytics and conversion events
```

---

## Tarea 28: Accesibilidad Y UX Responsive

### Objetivo

Asegurar que el sitio sea usable en mobile, desktop y teclado.

### Incluye

- Revisar contraste.
- Revisar foco visible.
- Revisar navegacion por teclado.
- Revisar labels de formularios.
- Revisar landmarks semanticos.
- Revisar estados de error.
- Revisar tamanos tactiles en mobile.
- Revisar que CTAs flotantes no bloqueen contenido.
- Revisar menus mobile.
- Revisar comportamiento con `prefers-reduced-motion`.

### Entregable

- Checklist de accesibilidad corregido para sitio publico y formularios.

### Commit Ideal

```txt
fix: improve v2 accessibility and responsive ux
```

---

## Tarea 29: Performance Y Core Web Vitals

### Objetivo

Optimizar carga, estabilidad visual y experiencia percibida.

### Incluye

- Revisar peso de imagenes.
- Revisar uso de componentes client.
- Reducir JavaScript innecesario.
- Usar server components cuando sea posible.
- Revisar fuentes.
- Evitar layout shifts.
- Lazy load de contenido secundario.
- Optimizar iconos.
- Validar `next build`.
- Revisar Lighthouse o equivalente.

### Entregable

- Sitio optimizado para performance base de produccion.

### Commit Ideal

```txt
perf: optimize v2 public site performance
```

---

## Tarea 30: Seeds Y Contenido Inicial

### Objetivo

Dejar la V2 con contenido realista inicial para desarrollo y demo.

### Incluye

- Seed de servicios.
- Seed de tratamientos generales o problemas frecuentes.
- Seed de equipo.
- Seed de testimonios.
- Seed de FAQs.
- Seed de configuracion global.
- Seed de bloques home.
- Datos de contacto institucionales.
- Scripts para ejecutar seed.
- Documentar como resetear entorno local.

### Entregable

- Proyecto con contenido inicial reproducible.

### Commit Ideal

```txt
chore: add v2 seed data
```

---

## Tarea 31: Variables De Entorno Y Configuracion

### Objetivo

Estandarizar configuracion local, staging y produccion.

### Incluye

- Crear `.env.example`.
- Documentar `DATABASE_URL`.
- Documentar variables de Payload.
- Documentar variables de auth.
- Documentar URL publica del sitio.
- Documentar telefonos y WhatsApp.
- Documentar analytics.
- Validar variables con Zod.
- Separar configuracion publica y privada.

### Entregable

- Configuracion ambiental clara y validada.

### Commit Ideal

```txt
chore: document and validate v2 env vars
```

---

## Tarea 32: Testing Base

### Objetivo

Cubrir los flujos criticos antes de escalar.

### Incluye

- Definir stack de testing.
- Tests unitarios para helpers criticos.
- Tests de schemas Zod.
- Tests de formularios si aplica.
- Tests de route handler de leads.
- Tests basicos de render de paginas clave.
- Preparar fixtures.
- Agregar script de test.
- Documentar alcance inicial.

### Entregable

- Base de testing para prevenir regresiones en V2.

### Commit Ideal

```txt
test: add baseline tests for v2 flows
```

---

## Tarea 33: QA Funcional Del Sitio Publico

### Objetivo

Validar que todas las paginas publicas esten listas para revision.

### Incluye

- Revisar rutas obligatorias.
- Revisar header y footer.
- Revisar CTAs.
- Revisar formularios.
- Revisar responsive mobile.
- Revisar responsive tablet.
- Revisar responsive desktop.
- Revisar estados vacios.
- Revisar SEO visible.
- Revisar errores de consola.
- Revisar links rotos.

### Entregable

- Checklist QA del sitio publico con correcciones aplicadas.

### Commit Ideal

```txt
fix: complete public site qa pass
```

---

## Tarea 34: QA Funcional Del Admin Y CMS

### Objetivo

Validar que el panel y CMS soporten operacion basica.

### Incluye

- Revisar login.
- Revisar proteccion de rutas.
- Revisar listado de leads.
- Revisar cambio de estado de leads.
- Revisar CRUD de contenido.
- Revisar carga de media.
- Revisar permisos.
- Revisar errores de formularios.
- Revisar comportamiento con base vacia.
- Revisar build de produccion.

### Entregable

- Admin y CMS validados para uso interno inicial.

### Commit Ideal

```txt
fix: complete admin and cms qa pass
```

---

## Tarea 35: Preparacion Para Deploy

### Objetivo

Dejar la plataforma lista para publicarse.

### Incluye

- Definir proveedor de hosting.
- Configurar build command.
- Configurar variables de entorno de produccion.
- Configurar PostgreSQL de produccion.
- Configurar migraciones.
- Configurar dominio.
- Configurar metadata publica.
- Revisar `NEXT_PUBLIC_SITE_URL`.
- Revisar almacenamiento de media.
- Revisar logs.
- Documentar proceso de deploy.

### Entregable

- Checklist de deploy y configuracion lista para produccion.

### Commit Ideal

```txt
chore: prepare v2 deployment configuration
```

---

## Tarea 36: Deploy Preview Y Validacion En Staging

### Objetivo

Probar la V2 en un entorno similar a produccion antes del lanzamiento.

### Incluye

- Crear deploy preview o staging.
- Ejecutar migraciones en staging.
- Cargar seeds o contenido inicial.
- Revisar rutas publicas.
- Revisar admin.
- Revisar formularios.
- Revisar CMS.
- Revisar analytics.
- Revisar SEO basico.
- Revisar rendimiento.
- Corregir diferencias entre local y staging.

### Entregable

- Staging funcional y aprobado para salida a produccion.

### Commit Ideal

```txt
chore: validate v2 staging deployment
```

---

## Tarea 37: Lanzamiento A Produccion

### Objetivo

Publicar la V2 de forma controlada.

### Incluye

- Ejecutar checklist final.
- Confirmar variables de entorno.
- Confirmar base de datos.
- Confirmar dominio.
- Confirmar sitemap y robots.
- Confirmar formularios.
- Confirmar WhatsApp y llamadas.
- Confirmar admin.
- Confirmar CMS.
- Monitorear errores iniciales.
- Documentar version publicada.

### Entregable

- V2 publicada en produccion.

### Commit Ideal

```txt
chore: release v2 to production
```

---

## Tarea 38: Documentacion Operativa

### Objetivo

Dejar instrucciones claras para mantener la plataforma.

### Incluye

- Como correr el proyecto localmente.
- Como configurar variables de entorno.
- Como correr migraciones.
- Como ejecutar seeds.
- Como administrar contenido.
- Como revisar leads.
- Como hacer deploy.
- Como revisar errores comunes.
- Como agregar nuevas paginas futuras.
- Como agregar servicios futuros.

### Entregable

- Documentacion operativa para desarrollo y administracion.

### Commit Ideal

```txt
docs: add v2 operations guide
```

---

## Tarea 39: Backlog V2.1

### Objetivo

Separar mejoras futuras para no bloquear la V2 inicial.

### Incluye

- Adicionar menu desplegable en el navbar de acuerdo a las subsecciones que hay en las secciones padre
  -Ejemplo: Servicios -> Servicios destacados, servicios activos, tratamientos y demas.
- Paginas individuales de servicios:
  - `/servicios/[slug]`
- Paginas individuales de tratamientos:
  - `/tratamientos/[slug]`
- Landing pages por enfermedad.
- Blog o articulos.
- Automatizaciones por email.
- Integracion CRM.
- Reportes avanzados.
- Multiusuario avanzado.
- Roles y permisos granulares.
- Auditoria de cambios.
- Notificaciones internas.
- Integracion con calendario.

### Entregable

- Backlog priorizado para evolucion posterior.

### Commit Ideal

```txt
docs: define v2.1 backlog
```

---

## Orden Recomendado De Implementacion

1. Tareas 1 a 4: diagnostico, arquitectura, stack y sistema visual.
2. Tareas 5 a 14: sitio publico completo.
3. Tareas 15 a 20: datos, leads, CMS y contenido dinamico.
4. Tareas 21 a 24: panel administrativo.
5. Tareas 25 a 31: media, SEO, analytics, performance y configuracion.
6. Tareas 32 a 34: testing y QA.
7. Tareas 35 a 38: deploy, lanzamiento y documentacion.
8. Tarea 39: backlog posterior.

## Definicion De Terminado Para Cada Tarea

- Cambios implementados o documentados segun alcance.
- Sin rutas rotas.
- Sin errores TypeScript.
- `pnpm lint` pasa cuando aplique.
- `pnpm build` pasa cuando aplique.
- Entregable documentado.
- Commit realizado o mensaje de commit preparado.
