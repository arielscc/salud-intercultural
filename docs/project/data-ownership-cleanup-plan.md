# Data Ownership Cleanup

Estado: completado.

Este documento resume el cierre de la limpieza de ownership de datos entre Payload, Prisma y `src/data`. La referencia canonica vigente queda en [Ownership de datos](../architecture/data-ownership.md).

## Decision Final

- Payload es la fuente de verdad para contenido editable, CMS, backoffice editorial, media, paginas publicas, SEO editable, configuracion global, leads simples y usuarios admin/editor.
- Prisma queda reservado para dominios operativos transaccionales futuros: citas, pagos, facturacion, inventario, auditoria, reportes internos, integraciones tecnicas y workflows.
- `src/data` queda como fallback tecnico y fuente inicial para seeds de Payload, no como fuente editable viva.
- No debe existir una entidad editable o transaccional con dos fuentes de verdad activas.

## Trabajo Realizado

1. Se creo y enlazo `docs/architecture/data-ownership.md` como documento canonico de fuentes de verdad.
2. Se audito el uso real de Prisma y se confirmo que el runtime publico/admin no usaba Prisma para contenido editable.
3. Se eliminaron queries Prisma legacy de contenido/configuracion: `src/modules/database/queries/public-content.ts` y `src/modules/database/queries/settings.ts`.
4. Se actualizo `src/modules/database/README.md` para reservar Prisma a datos operativos y evitar queries CMS duplicadas.
5. Se separo el seed canonico: `pnpm seed` ejecuta solo `pnpm payload:seed`.
6. Se elimino el seed Prisma legacy y el script `db:seed:legacy`.
7. Se migro `nosotros` a lectura desde Payload con fallback `src/data/about.ts`.
8. Se migro `tratamientos` a lectura desde Payload con `pages/tratamientos` y `treatment-topics`, manteniendo fallbacks `src/data/problems.ts` y `src/data/treatments.ts`.
9. Se agrego la collection Payload `treatment-topics` y su seed inicial.
10. Se eliminaron del schema Prisma los modelos editoriales legacy: `Lead`, `Service`, `TreatmentTopic`, `TeamMember`, `Testimonial`, `Faq` y `SiteSetting`.
11. Se eliminaron los enums Prisma legacy: `LeadSource`, `LeadStatus` y `FaqCategory`.
12. Se agrego y aplico la migracion `20260527000000_remove_legacy_prisma_content_models`.
13. Se definio el alcance futuro de Prisma con reglas Payload vs Prisma y modelos candidatos: `Appointment`, `Payment`, `Invoice`, `InventoryItem`, `StockMovement`, `AuditEvent`, `IntegrationJob` y `WorkflowInstance`.
14. Se actualizaron docs operativos y de proyecto para enlazar ownership y no declarar Prisma como fuente editorial activa.

## Checklist De Cierre

| Punto | Resultado | Evidencia |
| --- | --- | --- |
| Sitio publico lee contenido editable desde Payload con fallback `src/data` | OK | Paginas publicas usan helpers `getPublic*` en `src/lib/cms/public-content.ts`. |
| Leads nuevos solo se crean en Payload | OK | `src/modules/database/queries/leads.ts` escribe en collection `lead-submissions`. |
| `pnpm seed` no llena contenido duplicado en Prisma | OK | `package.json` define `seed` como `pnpm payload:seed`. |
| No hay imports activos a queries Prisma legacy | OK | Los query files legacy de contenido/configuracion fueron eliminados. |
| Prisma no contiene modelos editoriales legacy | OK | `prisma/schema.prisma` solo conserva generator y datasource. |
| `docs/architecture/data-ownership.md` esta enlazado | OK | Enlazado desde README de arquitectura, operaciones y proyecto. |
| `docs/operations/README.md` y `docs/project/README.md` no contradicen ownership | OK | Ambos apuntan al documento canonico. |

## Validaciones Ejecutadas

- `pnpm db:migrate`: OK.
- `pnpm db:generate`: OK.
- `pnpm lint`: OK.
- `pnpm test`: OK, 7 archivos y 25 tests.
- `pnpm test:integration`: OK, 1 archivo y 1 test; reseteo `salud_intercultural_test` y aplico migraciones.
- `pnpm typecheck`: OK.
- `pnpm run build`: OK.
- `pnpm seed`: OK.

## Pendientes

No quedan pendientes para esta limpieza de redundancia. Cualquier nuevo dominio de datos debe pasar por las reglas de [Ownership de datos](../architecture/data-ownership.md) antes de crear tablas Prisma, collections Payload o nuevos fallbacks en `src/data`.
