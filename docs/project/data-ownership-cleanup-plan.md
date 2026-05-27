# Data Ownership Cleanup Plan

Plan por tareas independientes para eliminar redundancias entre Payload, Prisma y `src/data`, definir fuentes de verdad y preparar el proyecto para futuros modulos operativos.

## Decision Base

Payload sera la fuente de verdad para contenido editable y backoffice editorial:

- Paginas publicas.
- Servicios publicos.
- Equipo.
- Testimonios.
- FAQs.
- Media.
- SEO editable.
- Configuracion global del sitio.
- Leads simples.
- Usuarios admin/editor.

Prisma queda reservado para dominios operativos transaccionales futuros:

- Agenda/citas con reglas complejas.
- Pagos y facturacion.
- Inventario.
- Auditoria/eventos.
- Reportes analiticos internos.
- Integraciones transaccionales.
- Workflows con relaciones fuertes y consultas complejas.

`src/data` queda como fallback tecnico y fuente inicial para seeds, no como fuente de verdad editable.

## Regla De Trabajo

No duplicar entidades editables o transaccionales en dos sistemas activos. Una entidad debe tener una sola fuente de verdad. Si otro sistema necesita verla, debe consumirla o derivarla, no editar una copia independiente.

Durante estas tareas no ejecutar tests de ningun tipo porque tardan mucho. No correr `pnpm test`, `pnpm test:integration` ni suites equivalentes. Al final del cleanup se ejecutaran los tests necesarios en una pasada dedicada.

Al finalizar cada tarea, agregar en su seccion `Cambios Importantes Realizados` una lista breve de los cambios relevantes hechos, archivos tocados y decisiones tomadas.

## Tarea 1: Documentar Ownership Canonico De Datos

### Objetivo

Crear una referencia arquitectonica permanente que indique que sistema es fuente de verdad para cada dominio.

### Alcance

Crear `docs/architecture/data-ownership.md` con una tabla de ownership:

| Dominio | Fuente de verdad | Admin/operacion | Estado |
| --- | --- | --- | --- |
| Paginas publicas | Payload | Payload Admin | Activo |
| Servicios publicos | Payload | Payload Admin | Activo |
| Equipo | Payload | Payload Admin | Activo |
| Testimonios | Payload | Payload Admin | Activo |
| FAQs | Payload | Payload Admin | Activo |
| Leads | Payload | Payload Admin | Activo |
| Configuracion global | Payload | Payload Admin | Activo |
| Fallback publico | `src/data` | Codigo | Fallback |
| Citas futuras | Prisma | UI custom futura | Futuro |
| Pagos/facturacion futura | Prisma | UI custom futura | Futuro |
| Inventario futuro | Prisma | UI custom futura | Futuro |
| Auditoria/eventos futura | Prisma | Lectura interna | Futuro |

Actualizar tambien `docs/architecture/README.md` para enlazar el nuevo documento.

### Fuera De Alcance

- Cambios de codigo.
- Migraciones de base de datos.
- Eliminacion de modelos Prisma.

### Entregables

- `docs/architecture/data-ownership.md`.
- Link desde `docs/architecture/README.md`.

### Validacion Sin Tests

- `rg "data-ownership" docs`.
- Revisar que no contradiga `docs/operations/leads.md`.

### Commit Sugerido

```txt
docs: define data ownership boundaries
```

### Cambios Importantes Realizados

- Pendiente.

## Tarea 2: Auditar Uso Real De Prisma En Runtime

### Objetivo

Confirmar que modelos Prisma duplicados ya no son necesarios para el sitio publico ni el admin actual.

### Alcance

Auditar referencias a:

- `src/modules/database/queries/public-content.ts`.
- `src/modules/database/queries/settings.ts`.
- `src/modules/database/client.ts`.
- `prisma.service`, `prisma.teamMember`, `prisma.testimonial`, `prisma.faq`, `prisma.siteSetting`, `prisma.lead`.

Clasificar cada uso como:

- Activo requerido.
- Legacy sin uso.
- Solo seed.
- Generado/ignorable.

### Fuera De Alcance

- Borrar archivos.
- Cambiar scripts.
- Cambiar schema Prisma.

### Entregables

- Seccion nueva en `docs/project/data-ownership-cleanup-plan.md` o documento corto de auditoria con resultados.
- Lista de archivos a eliminar o mantener en tareas siguientes.

### Validacion Sin Tests

Comandos recomendados:

```bash
rg "prisma\\." src scripts prisma tests -g '!src/generated/**'
rg "queries/public-content|queries/settings|getSiteSetting|getActiveSiteSettings" src tests docs
```

### Resultado De Auditoria

Comandos ejecutados, sin correr tests:

```bash
rg "prisma\\." src scripts prisma tests -g '!src/generated/**'
rg "queries/public-content|queries/settings|getSiteSetting|getActiveSiteSettings" src tests docs
rg "modules/database|database/queries|from .*database|@/modules/database|\\.\\/queries" src tests scripts prisma docs -g '!src/generated/**'
rg "PrismaClient|prismaClient|prisma" src/modules/database src/lib src/app src/components prisma -g '!src/generated/**'
```

Clasificacion:

| Referencia | Clasificacion | Resultado |
| --- | --- | --- |
| `src/modules/database/queries/public-content.ts` | Legacy sin uso | No aparece importado por runtime publico, admin, scripts ni tests. Duplica lecturas que hoy existen en `src/lib/cms/public-content.ts` via Payload con fallback `src/data`. |
| `src/modules/database/queries/settings.ts` | Legacy sin uso | No aparece importado por runtime publico, admin, scripts ni tests. `getSiteSetting` y `getActiveSiteSettings` solo existen en este archivo. La configuracion publica activa sale de `getSiteSettings()` en `src/lib/cms/public-content.ts`, que lee el global Payload `site-settings`. |
| `src/modules/database/client.ts` | Activo tecnico, no runtime publico/admin | Exporta el singleton Prisma y sigue siendo usado por el seed Prisma legacy. No se encontro uso directo desde paginas publicas, componentes, admin ni API activa. |
| `src/modules/database/queries/leads.ts` | Activo requerido, pero Payload | La ruta activa `src/app/api/leads/route.ts` usa `createLeadRecord`, pero esta funcion escribe en Payload (`lead-submissions`) con `getPayload`, no en Prisma. |
| `prisma.service` | Solo seed y legacy sin uso | Aparece en el seed Prisma legacy; no hay uso activo en runtime. |
| `prisma.treatmentTopic` | Solo seed y legacy sin uso | Aparece en el seed Prisma legacy; no hay uso activo en runtime. |
| `prisma.teamMember` | Solo seed y legacy sin uso | Aparece en el seed Prisma legacy; no hay uso activo en runtime. |
| `prisma.testimonial` | Solo seed y legacy sin uso | Aparece en el seed Prisma legacy; no hay uso activo en runtime. |
| `prisma.faq` | Solo seed y legacy sin uso | Aparece en el seed Prisma legacy; no hay uso activo en runtime. |
| `prisma.siteSetting` | Solo seed y legacy sin uso | Aparece en el seed Prisma legacy; no hay uso activo en runtime. |
| `prisma.lead` | Legacy sin uso | No se encontro ninguna llamada `prisma.lead` fuera del texto de este plan. Los leads activos se crean en Payload. |
| `src/generated/prisma` | Generado/ignorable | Excluido de la auditoria por ser output generado. |

Archivos candidatos para eliminar en Tarea 3:

- `src/modules/database/queries/public-content.ts`.
- `src/modules/database/queries/settings.ts`.

Archivos a mantener por ahora:

- `src/modules/database/client.ts`, hasta completar la separacion de seeds y decidir el alcance operativo futuro de Prisma.
- `src/modules/database/errors.ts` y `src/modules/database/pagination.ts`, porque siguen siendo usados por queries activas de leads y utilidades/tests existentes.
- `src/modules/database/queries/leads.ts`, porque es el punto activo de la API de leads, aunque su backend real ya es Payload.
- `prisma/legacy-seed.ts`, hasta eliminar o migrar los modelos Prisma editoriales.

Conclusiones para tareas siguientes:

- Tarea 3 puede eliminar los query files legacy de contenido/configuracion sin afectar imports activos.
- Tarea 4 debe cambiar `seed` para que no ejecute `db:seed` por defecto, porque el flujo anterior corria `pnpm db:seed && pnpm payload:seed` y cargaba contenido duplicado.
- Tarea 5 debe marcar o renombrar el seed Prisma como legacy, ya que hoy es el unico consumidor relevante de varios modelos editoriales Prisma.
- Tarea 8 puede considerar `Lead`, `Service`, `TeamMember`, `Testimonial`, `Faq`, `SiteSetting` y `TreatmentTopic` como modelos Prisma legacy, sujeto a completar Tareas 3 a 7 y revisar datos reales antes de migrar.

### Commit Sugerido

```txt
docs: audit active prisma usage
```

### Cambios Importantes Realizados

- Auditado el uso real de `prisma.*`, query files legacy y exports de `src/modules/database`.
- Confirmado que el runtime publico/admin no usa Prisma para contenido editable ni configuracion publica.
- Confirmado que leads activos pasan por Payload en `src/modules/database/queries/leads.ts`, no por `prisma.lead`.
- Documentada la lista de archivos candidatos para eliminar en Tarea 3 y archivos a mantener temporalmente.
- No se ejecutaron tests de ningun tipo.

## Tarea 3: Eliminar Queries Prisma Legacy De Contenido

### Objetivo

Quitar puntos de entrada que puedan reintroducir Prisma como fuente paralela de contenido publico.

### Alcance

Si la auditoria confirma que no tienen uso activo, eliminar:

- `src/modules/database/queries/public-content.ts`.
- `src/modules/database/queries/settings.ts`.

Actualizar:

- `src/modules/database/README.md` para dejar claro que Prisma no gestiona contenido CMS.
- Cualquier export o referencia rota si aparece.

### Fuera De Alcance

- Cambios en `prisma/schema.prisma`.
- Cambios en seeds.
- Migraciones.

### Entregables

- Archivos legacy eliminados.
- README de database actualizado.

### Validacion Sin Tests

```bash
pnpm lint
pnpm typecheck
rg "queries/public-content|queries/settings|getSiteSetting|getActiveSiteSettings" src tests docs
```

### Commit Sugerido

```txt
refactor: remove legacy prisma content queries
```

### Cambios Importantes Realizados

- Eliminados `src/modules/database/queries/public-content.ts` y `src/modules/database/queries/settings.ts`.
- Actualizado `src/modules/database/README.md` para dejar claro que Prisma no gestiona contenido CMS ni configuracion publica editable.
- Documentado que contenido publico, settings, media y leads simples pertenecen a Payload, con `src/data` solo como fallback.
- No hubo exports que ajustar en `src/modules/database/index.ts`.
- Validado con `rg "queries/public-content|queries/settings|getSiteSetting\\b|getActiveSiteSettings\\b" src tests`, `pnpm lint` y `pnpm typecheck`.
- No se ejecutaron tests de ningun tipo.

## Tarea 4: Separar Seeds De Payload Y Prisma

### Objetivo

Evitar que `pnpm seed` cargue contenido duplicado en Prisma y Payload.

### Alcance

Revisar scripts actuales:

- `db:seed`.
- `payload:seed`.
- `seed`.

Propuesta:

- `payload:seed`: seed canonico de contenido CMS.
- `seed`: ejecutar solo `pnpm payload:seed` mientras no existan dominios Prisma operativos.
- `db:seed`: marcar como legacy o reservar para futuros datos Prisma operativos.

Actualizar documentacion:

- `docs/operations/seeds.md`.
- `docs/operations/local-development.md`.
- `docs/operations/database-migrations.md` si aplica.

### Fuera De Alcance

- Eliminar `prisma/seed.ts`.
- Eliminar modelos Prisma.
- Cambiar datos de Payload.

### Entregables

- Scripts actualizados en `package.json`.
- Documentacion de seeds actualizada.

### Validacion Sin Tests

```bash
pnpm seed
pnpm typecheck
```

Confirmar que `pnpm seed` no incrementa ni modifica tablas Prisma legacy de contenido.

### Commit Sugerido

```txt
chore: make payload the default content seed
```

### Cambios Importantes Realizados

- Actualizado `package.json` para que `pnpm seed` ejecute solo `pnpm payload:seed`.
- Conservado el seed Prisma como comando explicito legacy; ya no forma parte del seed por defecto.
- Actualizados `docs/operations/seeds.md`, `docs/operations/local-development.md`, `docs/operations/database-migrations.md` y `docs/operations/environment-variables.md` para documentar Payload como seed canonico.
- Documentado que el seed Prisma legacy carga contenido Prisma legacy y no debe usarse como flujo normal de contenido editable.
- Validado que `pnpm seed` invoca solo `pnpm payload:seed`; el primer intento fallo por bloqueo sandbox a Postgres local y el segundo paso con acceso a la base local.
- Validado con `pnpm typecheck`.
- No se ejecutaron tests de ningun tipo.

## Tarea 5: Marcar Prisma Seed Como Legacy O Futuro Operativo

### Objetivo

Evitar que `prisma/seed.ts` parezca el seed principal de contenido editable.

### Alcance

Elegir una de dos opciones:

1. Mover `prisma/seed.ts` a `prisma/legacy-seed.ts`.
2. Mantenerlo, pero agregar encabezado y docs indicando que es legacy y no se ejecuta por defecto.

Actualizar scripts si se renombra:

- `db:seed:legacy`.

### Fuera De Alcance

- Eliminar modelos Prisma.
- Migrar datos.

### Entregables

- Archivo seed legacy claramente nombrado o documentado.
- Script explicito si se conserva.

### Validacion Sin Tests

```bash
pnpm lint
pnpm typecheck
rg "db:seed" package.json docs
```

### Commit Sugerido

```txt
chore: mark prisma content seed as legacy
```

### Cambios Importantes Realizados

- Renombrado `prisma/seed.ts` a `prisma/legacy-seed.ts`.
- Agregado encabezado en `prisma/legacy-seed.ts` aclarando que Payload es la fuente de verdad y que el archivo queda solo para datos legacy Prisma.
- Actualizado `package.json` para reemplazar `db:seed` por `db:seed:legacy`.
- Actualizada la documentacion operativa para usar `pnpm db:seed:legacy` cuando se necesite mantenimiento legacy.
- Actualizadas referencias de proyecto que apuntaban a `prisma/seed.ts` o `pnpm db:seed`.
- Validado con `rg "db:seed" package.json docs`, `pnpm lint` y `pnpm typecheck`.
- No se ejecuto `pnpm db:seed:legacy` para evitar escribir contenido legacy en Prisma.
- No se ejecutaron tests de ningun tipo.

## Tarea 6: Migrar Pagina Nosotros A Payload O Declararla Estatica

### Objetivo

Resolver el uso directo de `src/data/about.ts` en la pagina publica `nosotros`.

### Alcance

Opcion recomendada si se quiere web editable:

- Crear contenido en Payload para `nosotros`.
- Usar `pages` o un global especifico si se requiere estructura rica.
- Cambiar `src/app/(public)/nosotros/page.tsx` para leer via `getPublicPage` o helper CMS.
- Mantener `src/data/about.ts` solo como fallback.

Opcion alternativa:

- Documentar `nosotros` como pagina estatica no editable.

### Fuera De Alcance

- Redisenar la pagina.
- Cambiar otras paginas.

### Entregables

- Decision documentada.
- Implementacion si se elige Payload.
- Fallback conservado.

### Validacion Sin Tests

```bash
pnpm typecheck
pnpm run build
```

### Commit Sugerido

```txt
refactor: route about page content through cms
```

### Cambios Importantes Realizados

- Pendiente.

## Tarea 7: Migrar Pagina Tratamientos A Payload O Declararla Estatica

### Objetivo

Resolver el uso directo de `src/data/problems.ts` y `src/data/treatments.ts` en la pagina publica `tratamientos`.

### Alcance

Opcion recomendada si se quiere web editable:

- Crear collection o global Payload para tratamientos/problemas.
- Migrar contenido de `src/data/problems.ts` y `src/data/treatments.ts` a seed Payload.
- Cambiar `src/app/(public)/tratamientos/page.tsx` para leer desde Payload con fallback.

Opcion alternativa:

- Documentar tratamientos como contenido estatico temporal.

### Fuera De Alcance

- Eliminar `TreatmentTopic` de Prisma.
- Crear buscadores o filtros complejos.

### Entregables

- Decision documentada.
- Implementacion CMS si aplica.
- Fallback conservado.

### Validacion Sin Tests

```bash
pnpm typecheck
pnpm run build
```

### Commit Sugerido

```txt
refactor: route treatments content through cms
```

### Cambios Importantes Realizados

- Pendiente.

## Tarea 8: Eliminar Modelos Prisma Legacy Del Schema

### Objetivo

Reducir el schema Prisma a dominios realmente operativos y eliminar duplicados de Payload.

### Precondiciones

- Tareas 1 a 7 completadas o decisiones documentadas.
- Backup o export de datos legacy si hay datos reales.
- Confirmar que ningun script, reporte o integracion usa tablas Prisma legacy.

### Alcance

Eliminar de `prisma/schema.prisma` los modelos que ya no sean fuente activa:

- `Lead`.
- `Service`.
- `TeamMember`.
- `Testimonial`.
- `Faq`.
- `SiteSetting`.
- `TreatmentTopic` solo si tratamientos ya quedo resuelto en Payload o declarado fuera de Prisma.

Eliminar enums Prisma asociados si quedan sin uso:

- `LeadSource`.
- `LeadStatus`.
- `FaqCategory`.

Generar migracion.

### Fuera De Alcance

- Cambios en Payload collections.
- Cambios de UI.
- Nuevos modulos operativos.

### Entregables

- Migracion Prisma que elimina tablas legacy.
- Prisma Client regenerado.
- Documentacion actualizada.

### Validacion Sin Tests

```bash
pnpm db:migrate
pnpm typecheck
pnpm run build
```

### Commit Sugerido

```txt
refactor: remove legacy prisma content models
```

### Cambios Importantes Realizados

- Pendiente.

## Tarea 9: Preparar Prisma Para Dominios Operativos Futuros

### Objetivo

Definir como se usara Prisma cuando entren modulos transaccionales sin volver a duplicar Payload.

### Alcance

Crear o actualizar documentacion de arquitectura con criterios para nuevos modelos Prisma:

- Requiere transacciones.
- Requiere constraints fuertes.
- Requiere consultas complejas/reportes.
- No es contenido editorial.
- No sera editado como contenido CMS en Payload.

Proponer nombres futuros sin implementarlos todavia:

- `Appointment`.
- `Payment`.
- `Invoice`.
- `InventoryItem`.
- `StockMovement`.
- `AuditEvent`.
- `IntegrationJob`.
- `WorkflowInstance`.

### Fuera De Alcance

- Crear modelos Prisma nuevos.
- Implementar agenda, pagos, inventario o reportes.

### Entregables

- Seccion en `docs/architecture/data-ownership.md` o documento relacionado.
- Reglas para decidir Payload vs Prisma.

### Validacion Sin Tests

- Revision manual de consistencia con `docs/project/v3-readiness.md`.

### Commit Sugerido

```txt
docs: define prisma scope for operational domains
```

### Cambios Importantes Realizados

- Pendiente.

## Tarea 10: Checklist Final De No Redundancia

### Objetivo

Confirmar que no quedan fuentes dobles activas para el mismo dominio.

### Alcance

Verificar:

1. El sitio publico lee contenido editable desde Payload con fallback `src/data`.
2. Leads nuevos solo se crean en Payload.
3. `pnpm seed` no llena contenido duplicado en Prisma.
4. No hay imports activos a queries Prisma legacy.
5. Prisma no contiene modelos editoriales legacy o estan documentados como pendiente.
6. `docs/architecture/data-ownership.md` esta enlazado.
7. `docs/operations/README.md` y `docs/project/README.md` no contradicen el ownership.

### Fuera De Alcance

- Nuevos features.
- Refactors visuales.

### Entregables

- Checklist documentada con resultado.
- Issues/tareas pendientes si algo queda intencionalmente aplazado.

### Validacion Sin Tests

```bash
pnpm lint
pnpm typecheck
pnpm run build
```

### Commit Sugerido

```txt
docs: validate data ownership cleanup
```

### Cambios Importantes Realizados

- Pendiente.
