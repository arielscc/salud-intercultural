# Data Ownership

Documento canonico para definir que sistema es fuente de verdad de cada dominio de datos. Su objetivo es evitar duplicaciones entre Payload, Prisma y `src/data`.

## Principios

1. Una entidad editable o transaccional debe tener una sola fuente de verdad.
2. Payload es la fuente de verdad para contenido editable, CMS y backoffice editorial.
3. Prisma queda reservado para dominios operativos transaccionales futuros.
4. `src/data` es fallback tecnico y fuente inicial para seeds, no fuente de verdad editable.
5. Si un dato necesita aparecer en otro sistema, debe consumirse o derivarse; no mantenerse como copia editable independiente.

## Tabla De Ownership

| Dominio | Fuente de verdad | Admin/operacion | Estado | Notas |
| --- | --- | --- | --- | --- |
| Paginas publicas | Payload | Payload Admin | Activo | Incluye paginas base y SEO editable. |
| Servicios publicos | Payload | Payload Admin | Activo | `src/data/services.ts` queda como fallback/seed. |
| Equipo | Payload | Payload Admin | Activo | `src/data/team.ts` queda como fallback/seed. |
| Testimonios | Payload | Payload Admin | Activo | `src/data/testimonials.ts` queda como fallback/seed. |
| FAQs | Payload | Payload Admin | Activo | `src/data/faqs.ts` queda como fallback/seed. |
| Leads | Payload | Payload Admin | Activo | Collection `lead-submissions`. Prisma `Lead` es legacy. |
| Configuracion global | Payload | Payload Admin | Activo | Global `site-settings`; config estatica solo fallback. |
| Home editable | Payload | Payload Admin | Activo | Global `home-content`; `src/data/home.ts` queda como fallback/seed. |
| Media | Payload | Payload Admin | Activo | Storage local o Vercel Blob segun ambiente. |
| Usuarios admin/editor | Payload | Payload Admin | Activo | Auth y permisos del CMS. |
| Fallback publico | `src/data` | Codigo | Fallback | No debe editarse como contenido vivo del negocio. |
| Pagina Nosotros | Pendiente | Pendiente | Decision requerida | Hoy usa `src/data/about.ts`; migrar a Payload o declararla estatica. |
| Pagina Tratamientos | Pendiente | Pendiente | Decision requerida | Hoy usa `src/data/problems.ts` y `src/data/treatments.ts`. |
| Citas futuras | Prisma | UI custom futura | Futuro | Reglas de disponibilidad, solapamientos y estados. |
| Pagos/facturacion futura | Prisma | UI custom futura | Futuro | Requiere consistencia transaccional y auditoria. |
| Inventario futuro | Prisma | UI custom futura | Futuro | Stock, movimientos y constraints. |
| Auditoria/eventos futura | Prisma | Lectura interna | Futuro | Idealmente append-only. |
| Reportes analiticos internos futuros | Prisma | UI/reportes custom | Futuro | Consultas agregadas y metricas operativas. |
| Integraciones transaccionales futuras | Prisma | Jobs/UI custom | Futuro | Idempotencia, retries y estados tecnicos. |
| Workflows futuros | Prisma | UI custom futura | Futuro | Estados complejos, relaciones fuertes y transiciones. |

## Payload

Usar Payload cuando el dato:

- Debe ser editable por personal no tecnico.
- Es contenido editorial o de marketing.
- Necesita aparecer en el sitio publico.
- Necesita gestionarse desde el admin existente.
- Tolera el modelo de colecciones/globals de CMS.
- Se beneficia de permisos de admin/editor y media integrada.

Ejemplos actuales:

- `pages`
- `services`
- `team-members`
- `testimonials`
- `faqs`
- `lead-submissions`
- `site-settings`
- `home-content`
- `media`

## Prisma

Usar Prisma cuando el dato:

- Requiere transacciones explicitas.
- Requiere constraints fuertes e indices especificos.
- Tiene reglas de negocio complejas.
- Debe alimentar reportes o consultas agregadas no triviales.
- No es contenido editorial.
- No debe editarse como copia independiente desde Payload.

Ejemplos futuros:

- `Appointment`
- `Payment`
- `Invoice`
- `InventoryItem`
- `StockMovement`
- `AuditEvent`
- `IntegrationJob`
- `WorkflowInstance`

## `src/data`

Usar `src/data` solo para:

- Fallback cuando Payload o PostgreSQL no estan disponibles.
- Seeds iniciales de Payload.
- Datos estaticos deliberadamente no editables.

No usar `src/data` como fuente viva si el contenido debe editarse desde admin.

## Estado Legacy

Los modelos Prisma editoriales existentes son legacy mientras se completa la limpieza:

- `Lead`
- `Service`
- `TeamMember`
- `Testimonial`
- `Faq`
- `SiteSetting`
- `TreatmentTopic`, si tratamientos migra a Payload o queda declarado estatico.

No agregar nuevos usos runtime a esos modelos salvo que una tarea de limpieza lo justifique explicitamente.

## Regla Para Nuevas Features

Antes de crear una tabla, collection o archivo de datos:

1. Definir el dominio.
2. Elegir una sola fuente de verdad.
3. Documentar si el dato es editable, fallback, derivado o transaccional.
4. Evitar crear una copia editable en otro sistema.
5. Agregar tests donde el ownership pueda romperse.
