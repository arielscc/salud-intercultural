# Data Ownership

Documento canonico para definir que sistema es fuente de verdad de cada dominio de datos. Su objetivo es evitar duplicaciones entre Payload, Prisma y `src/data`.

## Principios

1. Una entidad editable o transaccional debe tener una sola fuente de verdad.
2. Payload es la fuente de verdad para contenido editable, CMS y backoffice editorial.
3. Prisma es la fuente de verdad de los dominios operativos transaccionales de SIGECO.
4. `src/data` es fallback tecnico y fuente inicial para seeds, no fuente de verdad editable.
5. Si un dato necesita aparecer en otro sistema, debe consumirse o derivarse; no mantenerse como copia editable independiente.
6. Payload, marketing y analytics no reciben pacientes, visitas ni historia
   clínica; su límite termina en contenido público y leads.

## Tabla De Ownership

| Dominio | Fuente de verdad | Admin/operacion | Estado | Notas |
| --- | --- | --- | --- | --- |
| Paginas publicas | Payload | Payload Admin | Activo | Incluye paginas base y SEO editable. |
| Servicios publicos | Payload | Payload Admin | Activo | `src/data/services.ts` queda como fallback/seed. |
| Equipo | Payload | Payload Admin | Activo | `src/data/team.ts` queda como fallback/seed. |
| Testimonios | Payload | Payload Admin | Activo | `src/data/testimonials.ts` queda como fallback/seed. |
| FAQs | Payload | Payload Admin | Activo | `src/data/faqs.ts` queda como fallback/seed. |
| Leads | Payload | Payload Admin | Activo | Collection `lead-submissions`; sin modelo Prisma duplicado. |
| Atribución de llegadas y ventas | Prisma | SIGECO | Activo | Catálogo, campañas y fotografía histórica por visita; Payload solo entrega evidencia del formulario previo. |
| Identidad, duplicados y alias de pacientes | Prisma | SIGECO | Activo | La ficha anterior se archiva y redirige; la fusión transaccional conserva historia y evidencia. |
| Resultado de propuestas de tratamiento | Prisma | SIGECO, Médico y Administración | Activo | Decisión append-only; una aceptación crea una orden, no una venta ni un pago automáticos. |
| Clasificación y resultado de seguimientos | Prisma | SIGECO, Recepción/Marlen y Médico | Activo | Tipo, relación, prioridad, responsable y resultado separados; llamadas médicas no se cierran como trabajo administrativo. |
| Abandono y pendientes de visita | Prisma | SIGECO, áreas operativas y Dirección | Activo | Conserva punto, área, motivo, responsable y pendientes; las tareas abiertas quedan bloqueadas, no eliminadas. |
| Versiones y firma interna de consultas | Prisma | SIGECO, Médico y Dirección | Activo | La consulta vigente es una proyección; cada borrador, cierre o corrección conserva una fotografía histórica. |
| Recetas y comprobantes emitidos | Prisma | SIGECO, Médico, Administración y Dirección | Activo | `GeneratedDocument` fotografía la fuente clínica o financiera; PDF es derivado privado y Payload no conserva copia editable. |
| Configuracion global | Payload | Payload Admin | Activo | Global `site-settings`; config estatica solo fallback. |
| Home editable | Payload | Payload Admin | Activo | Global `home-content`; `src/data/home.ts` queda como fallback/seed. |
| Media | Payload | Payload Admin | Activo | Storage local o Vercel Blob segun ambiente. |
| Usuarios admin/editor | Payload | Payload Admin | Activo | Auth y permisos del CMS. |
| Fallback publico | `src/data` | Codigo | Fallback | No debe editarse como contenido vivo del negocio. |
| Pagina Nosotros | Payload | Payload Admin | Activo | `src/data/about.ts` queda como fallback/seed. |
| Pagina Tratamientos | Payload | Payload Admin | Activo | `pages/tratamientos` y `treatment-topics`; `src/data/problems.ts` y `src/data/treatments.ts` quedan como fallback/seed. |
| Citas futuras | Prisma | UI custom futura | Futuro | Reglas de disponibilidad, solapamientos y estados. |
| Pagos y Caja | Prisma + storage privado para comprobantes | SIGECO, Administración y Dirección | Activo | Sesiones, ventas, pagos, egresos, beneficiarios, conciliaciones y correcciones compensatorias; los comprobantes nunca son media pública. |
| Catálogo, proveedores e inventario | Prisma | SIGECO, Administración y Dirección | Activo | Productos y proveedores versionados, asociaciones múltiples, costos referenciales, stock, movimientos y ajustes; Payload no mantiene una copia editable. |
| Compras, recepciones, lotes y documentos | Prisma + storage privado | SIGECO, Administración y Dirección | Activo | Orden, pago, recepción y stock separados pero trazables; costos históricos y documentos privados no se editan en Payload. |
| Auditoría de SIGECO | Prisma | SIGECO, solo Dirección y super administrador | Activo | `AuditEvent` append-only; PostgreSQL bloquea update y delete. |
| Adjuntos clínicos | Prisma + storage clínico privado | SIGECO, según permisos clínicos | Activo | Metadata y concesiones en Prisma; contenido fuera de Payload y de `public/`. |
| Reportes analiticos internos | Prisma | SIGECO | Parcial | Captación e ingresos está activo; el recorrido completo continúa en la Tarea 22. |
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
- Necesita idempotencia, locks, estados tecnicos o consistencia entre varias tablas.
- Requiere integrarse con jobs, conciliaciones o procesos internos que no pertenecen al CMS.

No usar Prisma cuando el dato:

- Es copy, SEO, bloques de paginas, media, FAQs, testimonios, servicios o contenido de marketing.
- Se espera que el equipo lo edite desde el panel CMS existente.
- Solo existe para renderizar una pagina publica y tolera fallback desde `src/data`.
- Ya tiene una collection o global Payload como fuente de verdad.

Si un dominio operativo necesita aparecer en Payload, Payload debe mostrar una vista derivada o enlace operacional. No debe mantener una segunda copia editable del mismo registro.

Ejemplos transaccionales:

| Modelo futuro | Dominio | Motivo para Prisma | Nota de ownership |
| --- | --- | --- | --- |
| `Appointment` | Agenda/citas | Solapamientos, disponibilidad, estados y cambios transaccionales. | No crear collection Payload duplicada para operar citas. |
| `Payment` | Pagos | Conciliacion, estados externos, idempotencia y registros financieros. | Payload puede enlazar o mostrar resumen derivado. |
| `Invoice` | Facturacion | Numeracion, relaciones fuertes y constraints fiscales/operativas. | Mantener emision y estado en Prisma. |
| `InventoryItem` | Inventario | Stock actual, SKU y constraints de unicidad. | El contenido descriptivo publico, si existe, va en Payload separado y derivado. |
| `InventoryMovement` | Inventario | Movimientos, auditoría y cálculo de stock. | No editar movimientos como contenido CMS. |
| `AuditEvent` | Auditoria | Eventos append-only, trazabilidad y consultas internas. | No exponer como collection editable. |
| `ClinicalAttachment` | Historia clínica | Relaciones, idempotencia, checksum, cuarentena y acceso temporal. | El contenido vive en storage privado; Payload media no participa. |
| `IntegrationJob` | Integraciones | Retries, errores, idempotency keys y estados tecnicos. | Payload no debe ser cola de jobs. |
| `WorkflowInstance` | Workflows | Transiciones, estados complejos y relaciones operativas. | La UI futura debe operar sobre Prisma. |

## Decision Payload Vs Prisma

Antes de crear una entidad nueva, aplicar este orden:

1. Si es contenido editable o marketing, usar Payload.
2. Si es fallback estatico o seed inicial, usar `src/data`.
3. Si es transaccional, financiero, inventario, agenda, auditoria, integracion tecnica o workflow, usar Prisma.
4. Si necesita aparecer en dos superficies, elegir una fuente de verdad y derivar la otra.
5. Si la decision no es obvia, documentarla en este archivo antes de crear tablas, collections o seeds.

Una nueva tabla Prisma debe declarar:

- Dominio operativo.
- Fuente de verdad.
- UI/admin responsable.
- Reglas de consistencia principales.
- Relacion con Payload, si existe.
- Migracion y estrategia de seed o datos iniciales.

Una nueva collection Payload debe declarar:

- Que no duplica una tabla Prisma editable.
- Fallback en `src/data`, si aplica.
- Ruta publica o pantalla admin que la consume.
- Campos SEO/media si el contenido se publica.

## `src/data`

Usar `src/data` solo para:

- Fallback cuando Payload o PostgreSQL no estan disponibles.
- Seeds iniciales de Payload.
- Datos estaticos deliberadamente no editables.

No usar `src/data` como fuente viva si el contenido debe editarse desde admin.

## Estado Legacy

Los modelos Prisma editoriales legacy (`Lead`, `Service`, `TeamMember`, `Testimonial`, `Faq`, `SiteSetting` y `TreatmentTopic`) fueron eliminados del schema Prisma. Payload queda como fuente activa para leads simples, servicios, equipo, testimonios, FAQs, configuracion global, paginas publicas y media.

No reintroducir modelos Prisma para contenido editable salvo que una decision de arquitectura cambie explicitamente la fuente de verdad.

## Regla Para Nuevas Features

Antes de crear una tabla, collection o archivo de datos:

1. Definir el dominio.
2. Elegir una sola fuente de verdad.
3. Documentar si el dato es editable, fallback, derivado o transaccional.
4. Evitar crear una copia editable en otro sistema.
5. Agregar tests donde el ownership pueda romperse.
