# Progreso De Simplificacion Sigeco (V3.7)

Registro de avance del plan [Tareas de simplificacion](./tareas-de-simplificacion.md). Cada tarea terminada agrega aqui su entrada con fecha, archivos tocados, validaciones ejecutadas y pendientes que deja.

## Estado General

| Tarea | Nombre | Estado |
| --- | --- | --- |
| 1 | Modelo de datos de la simplificacion | Completada (2026-07-10) |
| 2 | Funnel de recepcion | Completada (2026-07-10) |
| 3 | Retirar UI y termino lead | Completada (2026-07-10) |
| 4 | Fusionar Pacientes y Visitas en Recepcion | Completada (2026-07-10) |
| 5 | Rol seguimiento y retiro de captacion | Completada (2026-07-11) |
| 6 | Flujo de visita flexible | Completada (2026-07-11) |
| 7 | Edicion de ficha de paciente | Completada (2026-07-11) |
| 8 | Consulta medica prellenada y formularios simplificados | Pendiente |
| 9 | Dashboard centrado en recepcion | Pendiente |
| 10 | Documentacion y QA final | Pendiente |

El cierre documental consolidado se realizara en la Tarea 10, no de forma parcial durante las Tareas 8 y 9. La implementacion de GitHub Actions y los pendientes operativos/clinicos que no formen parte directa de la simplificacion quedan registrados en el backlog posterior de [Tareas de simplificacion](./tareas-de-simplificacion.md) y en el [plan de GitHub Actions](../github-actions-implementation-plan.md).

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

### Tarea 5 — Rol Seguimiento Y Retiro De Captacion (2026-07-11)

**Estado:** Completada.

**Archivos tocados:**

- `src/features/internal-auth/permissions.ts`: `recepcion` gana `followups_read`/`followups_write` (Marlen tambien trabaja seguimientos); `captacion` queda reducido a solo `internal_access` hasta que sus usuarios sean reasignados; export nuevo `assignableInternalRoles` (todos los roles menos los deprecados) derivado del mapa de permisos.
- `src/features/internal-auth/permissions.test.ts`: tests nuevos de recepcion con seguimientos, captacion retirado y roles asignables (63 tests unitarios en total).
- `scripts/set-internal-user-role.ts` + script `internal:set-role` en `package.json`: reasigna el rol de un usuario interno existente sin hardcodear datos personales. Uso: `INTERNAL_USER_EMAIL=<email> INTERNAL_USER_ROLE=seguimiento pnpm internal:set-role`. Rechaza roles deprecados (`captacion`) y roles desconocidos con mensaje claro. **Para reasignar a Yazmin en staging/produccion se corre ese comando con su email.**
- `src/components/internal/nav-items.ts` + `SidebarNav.tsx` + `MobileSidebar.tsx` + `InternalShell.tsx`: cada item del sidebar declara el permiso que lo habilita y la navegacion se filtra por el rol del usuario (seguimiento ve Inicio + Seguimiento; captacion retirado ve solo Inicio; recepcion ve Inicio + Recepcion + Seguimiento).
- `src/app/(internal)/sigeco/(app)/page.tsx` (dashboard): los KPIs y la accion "Registrar llegada" se muestran segun permisos del rol (`followups_read`, `inventory_read`, `visits_create`); se elimino el filtro especial de captacion (la bandeja de seguimientos es compartida entre Marlen y Yazmin); mensaje "Tu rol no tiene modulos asignados" para roles sin ningun modulo (captacion en transito).
- `src/app/(internal)/sigeco/(app)/recepcion/pacientes/[id]/page.tsx`: la ficha muestra la preferencia de contacto ("Seguimiento" en los datos del paciente); si es "Prefiere no recibir seguimiento", panel de advertencia antes del form "Crear seguimiento" (advierte, no bloquea: puede haber razon clinica). Las tarjetas "Registrar llegada" y "Crear seguimiento" ahora se muestran solo a roles con `visits_create` / `followups_write`.
- `src/app/(internal)/sigeco/(app)/seguimientos/page.tsx`: la bandeja marca "Pidio no recibir seguimiento" bajo el telefono de las tareas cuyo paciente rechazo el contacto.
- `src/app/(internal)/sigeco/(app)/seguimientos/[taskId]/page.tsx`: advertencia equivalente en el detalle de la tarea, encima de los botones Llamar/WhatsApp y del form "Registrar contacto".

**Validaciones:** `pnpm lint`, `pnpm typecheck`, `pnpm test` (63), `pnpm test:integration` (13; reset de la base de test con el consentimiento ya otorgado), `pnpm run build`. Navegador (headless autenticado): login con rol `seguimiento` ve solo Inicio + Seguimiento, sin "Registrar llegada", con acceso a la bandeja y a fichas de pacientes pero rechazado en `/sigeco/recepcion` e `/sigeco/inventario`; login con rol `captacion` ve solo Inicio con el mensaje de rol sin modulos y es rechazado en seguimientos y fichas; rol `recepcion` ve y accede a Seguimiento; super_admin conserva las 7 secciones. El script se probo en dev: rechazo `captacion` y reasigno `seguimiento@test.si` de captacion a seguimiento. Advertencias de "no contactar" verificadas en ficha, bandeja y detalle de tarea con captura de pantalla.

**Datos de QA en dev:** usuarios nuevos `seguimiento@test.si` (rol seguimiento) y `captacion@test.si` (rol captacion, para ver el estado retirado); la paciente SI-000002 Rosa Huanca Flores quedo con preferencia "Prefiere no recibir seguimiento" (antes WhatsApp) y una tarea de seguimiento pendiente creada por el usuario QA de seguimiento, para poder revisar las advertencias en vivo.

**Pendientes que deja:** reasignar el usuario real de Yazmin en staging/produccion con `pnpm internal:set-role` (documentado arriba). La edicion de la preferencia de contacto desde la ficha llega con la Tarea 7.

**Commit sugerido:** `feat(sigeco): add seguimiento role and retire captacion`

### Tarea 6 — Flujo De Visita Flexible (2026-07-11)

**Estado:** Completada.

**Archivos tocados:**

- `src/features/visits/schemas/visit.schema.ts`: schema nuevo `visitFlowSchema` (visitId + flow `left`/`complete`/`to_nursing`/`to_administration` + nota opcional); helpers `closedVisitStatuses` e `isActiveVisitStatus` compartidos entre action y UI.
- `src/features/visits/actions.ts`: action nueva `applyVisitFlowAction` (permiso `visits_update`). Mapea cada flujo a estado + area + nota por defecto; en `left` conserva el area actual de la ruta para dejar rastro de donde abandono y genera la nota "Se retiró en <area>". Guard: si la visita ya esta cerrada redirige a su detalle con `?error=cerrada` sin tocar nada. Revalida recepcion, consultas, administracion y el dashboard.
- `src/modules/database/queries/visits.ts`: query liviana `getVisitFlowState` (status + area actual) para el guard.
- `src/features/internal-auth/permissions.ts` + `.test.ts`: `administracion` gana `visits_update` (Maria cierra visitas tras el cobro); test nuevo verifica que no gana `visits_create`.
- `src/app/(internal)/sigeco/(app)/recepcion/page.tsx`: columna nueva en la vista "Hoy" con el boton rapido "Se retiró" por fila (solo visitas activas, un toque, sin formulario).
- `src/app/(internal)/sigeco/(app)/recepcion/visitas/[id]/page.tsx`: tarjeta "Acciones rápidas" ("Cerrar visita" y "Se retiró sin completar") visible en cualquier estado activo, encima del form "Derivar paciente"; banner de advertencia cuando llega `?error=cerrada`.
- `src/app/(internal)/sigeco/(app)/consultas/[visitId]/page.tsx`: tarjeta "Salida del paciente" con tres destinos post-consulta: "Enviar a enfermería", "Enviar a administración" y "Se va — cerrar visita" (salida directa sin pasar por enfermeria ni caja).
- `src/app/(internal)/sigeco/(app)/administracion/[workItemId]/page.tsx`: tarjeta "Salida del paciente" en el pendiente administrativo: "Cerrar visita" en un toque (paciente que solo compra/paga y se va) y "Se retiró sin completar".
- `src/modules/database/queries/visit-flow.integration.test.ts`: 4 tests de integracion que cubren los tres caminos de aceptacion (consulta -> administracion -> salida, consulta -> salida directa, abandono en recepcion) verificando `VisitStatusHistory` completo, `completedAt`, ruta inactiva y area donde abandono.

**Validaciones:** `pnpm lint`, `pnpm typecheck`, `pnpm test` (64), `pnpm test:integration` (17, 4 nuevos), `pnpm run build`. Navegador (autenticado): camino completo recepcion -> consulta -> administracion -> cierre en un toque con la visita de Rosa (historial SQL verificado: 4 transiciones con notas); salida directa desde consulta con la visita QA V3; visita nueva por funnel abandonada con un toque desde la lista de recepcion (nota automatica "Se retiró en recepción", area conservada, fila desaparece de la vista activa); en visitas cerradas las acciones rapidas se ocultan y el banner de `?error=cerrada` se muestra.

**Datos de QA en dev:** las tres visitas quedaron cerradas (2 `completed`, 1 `left_without_care`) con su historial completo como evidencia; no quedan visitas activas.

**Pendientes que deja:** enfermeria no tiene aun boton de salida propio (el paciente que termina en enfermeria se cierra desde el detalle de visita o administracion); puede evaluarse tras el QA con usuarios reales. El dashboard mostrara "abandonos del dia" en la Tarea 9.

**Commit sugerido:** `feat(sigeco): support flexible visit flow and exits`

### Tarea 7 — Edicion De Ficha De Paciente (2026-07-11)

**Estado:** Completada.

**Archivos tocados:**

- `src/components/internal/reception/funnel-fields.tsx`: modulo nuevo con las piezas compartidas del funnel (`ChipOption`, chips de ciudad, `cityStateFrom`, `calculateAge`, `normalizePhone`, constante `NO_KNOWN_ALLERGIES`); `IntakeFunnel.tsx` ahora importa de aqui (sin cambios de comportamiento, regresion verificada en navegador).
- `src/components/internal/reception/PatientEditForm.tsx`: formulario cliente de edicion con los mismos chips y campos del funnel en 3 tarjetas (Identificacion, Antecedentes, Origen y seguimiento), estado espejado en inputs ocultos, validacion inline de nombre/telefono antes de enviar, edad calculada en vivo, boton Cancelar de vuelta a la ficha.
- `src/app/(internal)/sigeco/(app)/recepcion/pacientes/[id]/editar/page.tsx`: pagina de edicion (permiso `patients_update`) con banner para `?error=invalid`.
- `src/app/(internal)/sigeco/(app)/recepcion/pacientes/[id]/page.tsx`: boton "Editar ficha" en la cabecera de la ficha, visible solo con `patients_update`.
- `src/features/reception/schemas/intake.schema.ts` + `.test.ts`: `patientEditSchema` y `toPatientEditRecord` (mismos campos permanentes del funnel; a diferencia del intake, un campo vaciado se limpia a `null` en la ficha); 3 tests unitarios nuevos.
- `src/features/reception/actions.ts`: `updateReceptionPatientAction` (permiso `patients_update`, invalido -> `?error=invalid`, exito -> revalida y vuelve a la ficha).
- `src/modules/database/queries/reception.ts`: `updateReceptionPatient` (update simple por id, nunca crea registros).
- `src/modules/database/queries/reception.integration.test.ts`: test nuevo "corrects patient data in place without creating duplicates" (mismo id y codigo interno, conteo de pacientes estable, campos corregidos y limpiados).

**Validaciones:** `pnpm lint`, `pnpm typecheck`, `pnpm test` (67), `pnpm test:integration` (18), `pnpm run build`. Navegador: boton "Editar ficha" en la ficha de Rosa -> formulario prellenado con los chips correctos (ciudad, genero, "Ninguna conocida") -> correccion real (ciudad a La Paz, medicacion actualizada) -> redirect a la ficha con los datos nuevos y conteo de pacientes intacto (verificado por SQL). El funnel sigue funcionando tras la extraccion de piezas compartidas. El rol `seguimiento` (solo `patients_read`) no ve el boton y `/editar` lo rebota a Inicio.

**Nota de QA:** durante la primera prueba el dev server devolvio un 500 con TypeError en el submit; era cache corrupta de `.next` por haber corrido `pnpm build` con `next dev` activo (no un bug del codigo): tras reiniciar el server la edicion funciono. Evitar correr build y dev a la vez.

**Datos de QA en dev:** la ficha SI-000002 (Rosa) quedo con ciudad "La Paz" y medicacion "Enalapril 10 mg cada noche" como evidencia de la edicion.

**Pendientes que deja:** la edicion no verifica colision de telefono con otra ficha existente (la deteccion de duplicados vive en el alta); anotado para evaluar tras el QA con usuarios reales.

**Commit sugerido:** `feat(sigeco): add patient record editing`
