# Progreso De Simplificacion Sigeco (V3.7)

Registro de avance del plan [Tareas de simplificacion](./tareas-de-simplificacion.md). Cada tarea terminada agrega aqui su entrada con fecha, archivos tocados, validaciones ejecutadas y pendientes que deja.

## Estado General

| Tarea | Nombre | Estado |
| --- | --- | --- |
| 1 | Modelo de datos de la simplificacion | Completada (2026-07-10) |
| 2 | Funnel de recepcion | Completada (2026-07-10) |
| 3 | Retirar UI y termino lead | Completada (2026-07-10) |
| 4 | Fusionar Pacientes y Visitas en Recepcion | Completada (2026-07-10) |
| 5 | Rol seguimiento y retiro de captacion | Pendiente |
| 6 | Flujo de visita flexible | Pendiente |
| 7 | Edicion de ficha de paciente | Pendiente |
| 8 | Consulta medica prellenada y formularios simplificados | Pendiente |
| 9 | Dashboard centrado en recepcion | Pendiente |
| 10 | Documentacion y QA final | Pendiente |

## Contexto Y Decisiones (2026-07-10)

Origen: al usuario le parecio que el flujo completo del paciente exige demasiado llenado (~89 campos en 13 formularios y 7+ pantallas, con datos pedidos hasta 3 veces). Se hizo un analisis con diagramas (artefacto "Analisis de flujo Sigeco") y el usuario respondio 5 preguntas de validacion. Feedback incorporado al plan:

1. El diagrama del flujo as-built es correcto, PERO el flujo no es lineal: el paciente puede abandonar en cualquier punto (incluso despues de la consulta), y tras la consulta puede ir a enfermeria, a administracion a comprar algo, o irse. El seguimiento lo hacen Marlen o Yazmin. -> Tarea 6 y rol nuevo en Tarea 5.
2. Ajustes al funnel: fecha de nacimiento en vez de edad; genero opcional y solo cuando tenga utilidad; "desde cuando" guarda cantidad + unidad; "ya se atendio" se guarda en la visita (cambia por problema); enfermedad de base y medicacion son campos separados en la misma pantalla. Preguntas agregadas: tipo de visita (primera consulta / control / nuevo problema / revision de resultados), preferencia de contacto para seguimiento (WhatsApp / llamada / ambos / prefiere no) y si trae analisis o estudios.
3. Aprobada la fusion Pacientes + Visitas -> modulo "Recepcion".
4. El rol captacion se desactiva; Yazmin pasa al rol nuevo `seguimiento`.
5. Aprobados los campos nuevos de base de datos (version mejorada: ver resumen de modelo en el plan de tareas).

Restricciones fijas: los datos de leads NO se borran (solo su UI); migraciones solo aditivas; sistema visual Marea intacto; sin integracion con el otro proyecto del usuario por ahora.

## Entradas Por Tarea

### Tarea 1 — Modelo De Datos De La Simplificacion (2026-07-10)

**Estado:** Completada.

**Archivos tocados:**

- `prisma/schema.prisma`: enums nuevos `FollowUpContactPreference`, `VisitIntakeType`, `SymptomDurationUnit`; valor `seguimiento` agregado a `InternalRole`; campos nuevos en `Patient` (`currentMedication`, `followUpPreference`) y en `Visit` (`intakeType`, `symptomDurationValue`, `symptomDurationUnit`, `previouslyTreated`, `bringsStudies`).
- `prisma/migrations/20260710000000_v3_7_simplification/migration.sql`: migracion 100% aditiva (sin DROP); aplicada sobre la base dev sin perdida de datos (conteos de `Patient`, `Visit` y `Lead` verificados antes/despues por SQL).
- `src/features/internal-auth/permissions.ts`: rol `seguimiento` (label "Seguimiento") con permisos `internal_access`, `patients_read`, `followups_read`, `followups_write`; export `deprecatedInternalRoles` marcando `captacion` como deprecado (sus permisos de leads se retiran en la Tarea 3).
- `src/features/internal-auth/permissions.test.ts`: test nuevo del alcance del rol `seguimiento`.

**Validaciones:** `pnpm lint`, `pnpm typecheck`, `pnpm test` (18 archivos, 55 tests), `pnpm test:integration` (8 archivos, 9 tests; reset de la base de test autorizado por el usuario), `pnpm run build`. Columnas nuevas verificadas en la base dev via `information_schema`.

**Pendientes que deja:** ninguno propio. El rol `captacion` conserva sus permisos actuales hasta la Tarea 3; el usuario de Yazmin se reasigna en la Tarea 5.

**Commit sugerido:** `feat(sigeco): add simplification data model`

### Tarea 2 — Funnel De Recepcion (2026-07-10)

**Estado:** Completada.

**Archivos tocados:**

- `src/app/(internal)/sigeco/(app)/recepcion/nuevo/page.tsx`: pagina nueva del funnel (permiso `visits_create`), con avisos de error y duplicado.
- `src/components/internal/reception/IntakeFunnel.tsx`: componente cliente del funnel de 4 pasos segun la especificacion aprobada. Paso 0 de busqueda (nombre/telefono/codigo) con prellenado de ficha existente; chips tocables para ciudad (El Alto/La Paz/Otra), genero, unidad de duracion, tipo de visita, si/no, alergias ("Ninguna conocida"), fuente y preferencia de seguimiento; edad calculada en vivo desde la fecha de nacimiento; validacion por paso (solo nombre, telefono y motivo obligatorios); deteccion de telefono duplicado al avanzar del paso 1 (compara los ultimos 8 digitos normalizados, tolera guiones y espacios) con opcion de usar la ficha existente o continuar como nuevo.
- `src/features/reception/actions.ts`: `submitReceptionIntakeAction` (crea/actualiza paciente + abre visita con check-in; verifica permisos `patients_create`/`patients_update` segun el caso y duplicados como respaldo server-side) y `searchReceptionPatientsAction` (busqueda para prellenado, minimo 2 caracteres).
- `src/features/reception/schemas/intake.schema.ts` + `.test.ts`: schema zod del funnel completo con refine de duracion (cantidad y unidad juntas o ninguna) y mapeo a registro limpio (5 tests).
- `src/features/reception/labels.ts`: labels de `VisitIntakeType`, `SymptomDurationUnit` y `FollowUpContactPreference`.
- `src/modules/database/queries/reception.ts`: `createReceptionIntake` (transaccion unica: paciente nuevo o actualizado + visita completa) y `searchReceptionPatients`.
- `src/modules/database/queries/visits.ts`: refactor sin cambio de comportamiento — la creacion de visita se extrajo a `createVisitInTransaction` (reusada por `createVisitRecord` y por el intake) y acepta los campos nuevos del funnel.
- `src/modules/database/queries/reception.integration.test.ts`: 4 tests (funnel completo, paciente existente sin duplicar, minimo de 3 campos, busqueda por nombre/telefono/codigo).
- `src/app/(internal)/sigeco/(app)/visitas/page.tsx`: boton "Registrar llegada" hacia `/sigeco/recepcion/nuevo` (punto de entrada temporal hasta la fusion de la Tarea 4).

**Validaciones:** `pnpm lint`, `pnpm typecheck`, `pnpm test` (19 archivos, 60 tests), `pnpm test:integration` (9 archivos, 13 tests), `pnpm run build`. Prueba en navegador con datos reales: paciente nuevo completo creado en ~15 toques (ficha `SI-000002` + visita abierta y redirigida a su detalle, 15 campos verificados por SQL), prellenado desde busqueda y deteccion de duplicado por telefono con guiones.

**Pendientes que deja:** la ficha de QA `SI-000002` (Rosa Huanca Flores) queda en la base dev como dato de prueba. Los formularios viejos de alta de paciente/visita siguen activos hasta la Tarea 4. La deteccion de duplicados asume celulares de 8 digitos (formato boliviano); si se registran fijos habra que revisarla.

**Commit sugerido:** `feat(sigeco): add reception intake funnel`

### Tarea 3 — Retirar UI Y Termino Lead (2026-07-10)

**Estado:** Completada.

**Archivos tocados:**

- `src/app/(internal)/sigeco/(app)/leads/` eliminado (lista, detalle y alta); `/sigeco/leads` ahora responde 404.
- `src/components/internal/nav-items.ts`: entrada "Leads" fuera del sidebar (8 secciones visibles).
- `src/app/(internal)/sigeco/(app)/page.tsx` (dashboard): fuera los KPIs de leads (nuevos, recordatorios vencidos, no responden) y la tabla "Leads recientes"; accion del header ahora es "Registrar llegada" hacia el funnel. Quedan los KPIs de seguimientos hoy y stock bajo como version interina; el dashboard definitivo llega en la Tarea 9.
- `src/components/internal/StatusPill.tsx`: eliminado `LeadStatusPill` (sin usos restantes).
- `src/app/(internal)/sigeco/(app)/seguimientos/{page,[taskId]/page}.tsx`: columna "Paciente / Lead" -> "Paciente" y fallback visible "Lead" -> "Sin ficha". El acceso a `task.lead` se mantiene para que los seguimientos historicos ligados a leads conserven nombre y telefono.
- `src/app/(internal)/sigeco/(app)/pacientes/nuevo/page.tsx`: retirado el parametro `leadId` y el hidden `sourceLeadId` (la conversion lead->paciente ya no tiene UI).
- `src/features/internal-auth/permissions.ts`: permisos `leads_*` retirados de TODOS los roles (super_admin, direccion, recepcion, captacion, administracion). El enum `InternalPermission` queda intacto en Prisma.
- `src/features/internal-auth/permissions.test.ts`: test actualizado — ningun rol conserva permisos de leads.
- `src/features/crm/actions.ts`, `src/modules/database/queries/leads-v3.ts`: marcados LEGACY con comentario (sin UI que los invoque; conservados junto a los datos y sus tests de integracion).

**Sin tocar (fuera de alcance):** modelos y datos de leads en Prisma (verificado: 2 leads intactos en dev), el concepto "lead" del sitio publico/Payload (`/api/leads`, `LeadSubmissions`, formulario de contacto web) que es independiente de Sigeco, y `sourceLeadId` en el schema de pacientes (logica, sin UI).

**Validaciones:** `pnpm lint`, `pnpm typecheck`, `pnpm test` (60), `pnpm test:integration` (13, incluye las suites legacy de leads), `pnpm run build`. Navegador: dashboard y sidebar sin rastro de leads, `/sigeco/leads` 404, seguimientos con "Paciente"/"Sin ficha".

**Pendientes que deja:** el dashboard queda minimo (2 KPIs) hasta la Tarea 9. El destino final de los datos historicos de leads (exportar/migrar al otro proyecto) sigue abierto.

**Commit sugerido:** `feat(sigeco): remove leads ui and terminology`

### Tarea 4 — Fusionar Pacientes Y Visitas En Recepcion (2026-07-10)

**Estado:** Completada.

**Archivos tocados:**

- `src/app/(internal)/sigeco/(app)/recepcion/page.tsx`: modulo nuevo con dos vistas por query param `?vista=`: "Hoy" (visitas activas con filtro de estado, permiso `visits_read`) y "Pacientes" (busqueda del padron completo, permiso `patients_read`). Accion principal "Registrar llegada" hacia el funnel.
- `src/app/(internal)/sigeco/(app)/recepcion/pacientes/[id]/page.tsx`: ficha de paciente movida (git mv) desde `pacientes/[id]`. El formulario viejo "Abrir visita" se reemplazo por un boton al funnel con `?paciente=<id>` (prellenado, arranca en paso 1). El form "Crear seguimiento" se mantiene.
- `src/app/(internal)/sigeco/(app)/recepcion/visitas/[id]/page.tsx`: detalle de visita movido desde `visitas/[id]`; el nombre del paciente ahora enlaza a su ficha.
- `src/app/(internal)/sigeco/(app)/recepcion/nuevo/page.tsx` + `IntakeFunnel.tsx` + `queries/reception.ts`: soporte de prellenado por `?paciente=` (query `getReceptionPatientById`, prop `initialPatient`, select compartido `receptionPatientSelect`).
- Rutas viejas convertidas en redirects: `/sigeco/pacientes` -> `?vista=pacientes`, `/sigeco/pacientes/nuevo` -> funnel, `/sigeco/pacientes/[id]` y `/sigeco/visitas/[id]` -> sus rutas nuevas, `/sigeco/visitas` -> `/sigeco/recepcion`. Ningun marcador viejo se rompe.
- `src/components/internal/nav-items.ts`: sidebar 8 -> 7 secciones ("Recepcion" reemplaza a Pacientes y Visitas; activo por `startsWith` cubre todo el modulo).
- Actions actualizadas a las rutas nuevas (revalidate/redirect): `reception`, `visits`, `patients` (marcada LEGACY: el alta manual fue reemplazada por el funnel), `clinical-care`, `follow-ups`, `nursing`, `sales`, `studies`.

**Validaciones:** `pnpm lint`, `pnpm typecheck`, `pnpm test` (60), `pnpm test:integration` (13), `pnpm run build`. Navegador: ambas vistas de Recepcion, redirects de las 3 rutas viejas verificados autenticado, ficha -> funnel prellenado (banner SI-000002, paso 1), detalle de visita en ruta nueva.

**Pendientes que deja:** la edicion de la ficha permanente sigue pendiente (Tarea 7). El detalle de paciente y el de visita siguen siendo paginas separadas (unificarlas en pestanias puede evaluarse despues del QA con usuarios reales).

**Commit sugerido:** `feat(sigeco): merge patients and visits into reception module`
