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
| 8 | Consulta medica prellenada y formularios simplificados | Completada (2026-07-11) |
| 9 | Dashboard centrado en recepcion | Completada (2026-07-11) |
| 10 | Documentacion y QA final | Completada (2026-07-11) |

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

### Tarea 8 — Consulta Medica Prellenada Y Formularios Simplificados (2026-07-11)

**Estado:** Completada.

**Archivos tocados:**

- `src/app/(internal)/sigeco/(app)/consultas/[visitId]/page.tsx`: cabecera clinica con todo el contexto capturado en recepcion (motivo, duracion, tipo de visita, atencion previa, estudios, edad calculada, alergias, enfermedad de base y medicacion). El motivo deja de pedirse por segunda vez y se envia como dato de solo lectura al guardar la consulta. Receta, evolucion e indicacion para otra area pasan a secciones colapsables, abiertas solo cuando ya tienen contenido.
- `src/components/internal/ui/CollapsibleSection.tsx`: patron reutilizable basado en `details/summary`, con estado nativo, foco visible e icono de expansion.
- `src/app/(internal)/sigeco/(app)/enfermeria/[workItemId]/page.tsx`: signos vitales, aplicacion clinica y estudio quedan colapsados; se abre automaticamente el formulario que corresponde al tipo de orden medica. La indicacion sigue prellenando el registro de aplicacion o estudio.
- `src/modules/database/queries/inventory.ts`: error tipado `InsufficientStockError` con producto, existencia y cantidad solicitada, manteniendo el rollback transaccional.
- `src/features/sales/actions.ts` y `src/app/(internal)/sigeco/(app)/administracion/[workItemId]/page.tsx`: una venta con stock insuficiente vuelve a la misma tarea y muestra un error visible con cantidades; errores de formulario tambien vuelven al contexto de la tarea.
- `src/modules/database/queries/inventory-error.test.ts` y `inventory.integration.test.ts`: cobertura del error envuelto y del rollback total de venta, item, cobro y movimiento de caja.

**Validaciones:** `pnpm lint`, `pnpm typecheck`, `pnpm test` (20 archivos, 69 tests) y `pnpm test:integration` (10 archivos, 19 tests). Navegador autenticado en escritorio y 390px: resumen completo de consulta sin campo Motivo duplicado; formularios de enfermeria colapsados con Aplicacion clinica abierta para una orden de suero; alerta de stock visible sin overflow horizontal. Prueba real de venta: solicitud de 999 unidades con stock 61, rollback SQL y redirect con producto/cantidades correctos.

**Pendientes que deja:** la Tarea 10 debe repetir estos caminos dentro del QA final por roles. Los formularios colapsables reducen carga visual sin retirar campos clinicos propios de cada area.

**Commit sugerido:** `feat(sigeco): prefill consultation and simplify clinical forms`

### Tarea 9 — Dashboard Centrado En Recepcion (2026-07-11)

**Estado:** Completada.

**Archivos tocados:**

- `src/modules/database/queries/reception.ts`: query `getReceptionDashboardSummary` con rango diario local. Calcula pacientes unicos que llegaron hoy, rutas activas agrupadas por area, abandonos ocurridos hoy desde `VisitStatusHistory` y las 8 llegadas mas recientes.
- `src/app/(internal)/sigeco/(app)/page.tsx`: dashboard operativo con KPIs de pacientes del dia, visitas activas, abandonos, seguimientos de hoy/vencidos y stock bajo; desglose de visitas activas por area; tabla de ultimas llegadas con enlace al detalle; accesos rapidos para registrar llegada y buscar paciente.
- El contenido se filtra por permisos: las metricas de recepcion requieren `visits_read`, seguimientos requieren `followups_read`, inventario requiere `inventory_read` y cada acceso rapido conserva su permiso especifico.
- `src/modules/database/queries/reception.integration.test.ts`: escenario nuevo con dos pacientes unicos, tres llegadas, dos rutas activas y un abandono, verificando conteos, agrupacion y listado reciente.

**Validaciones:** `pnpm lint`, `pnpm typecheck`, `pnpm test` (20 archivos, 69 tests) y `pnpm test:integration` (10 archivos, 20 tests). Navegador autenticado con datos reales en 1440x900 y 390x844: seis KPIs, accesos rapidos, areas activas y ultimas llegadas sin overflow horizontal (`scrollWidth=390`, `innerWidth=390`) ni solapamientos.

**Pendientes que deja:** la Tarea 10 debe ejecutar el QA final por cada rol y consolidar la documentacion V3.7. Los conteos del dashboard estan listos para esa validacion, pero todavia no constituyen reportes historicos o analitica avanzada.

**Commit sugerido:** `feat(sigeco): refocus dashboard on reception metrics`

### Tarea 10 — Documentacion Y QA Final (2026-07-11)

**Estado:** Completada. V3.7 queda cerrada localmente; promocion a staging y produccion sigue siendo trabajo separado.

**Documentacion consolidada:**

- `docs/project/v3-implementation-status.md`: estado V3.7, flujo vigente, rutas, validacion, QA y backlog unico posterior.
- `docs/project/v3-technical-implementation.md`: arquitectura actual, ownership Payload/Prisma, contratos transaccionales, permisos, responsive y deploy.
- `docs/operations/sigeco-v3-full-flow-testing.md`: guia ejecutable del funnel, consulta prellenada, cuatro caminos de salida, enfermeria, caja, inventario, seguimiento y matriz de roles.
- `docs/operations/testing.md`, `branch-flow.md`, `deploy.md`, indices de proyecto y operaciones: comandos, suite de integracion, staging y checklist vigentes.

**QA funcional:**

- Matriz de roles verificada cambiando temporalmente `test@test.si` mediante el script oficial y restaurandolo a `super_admin`: recepcion, seguimiento, medico, enfermeria, administracion y direccion muestran solo sus modulos; URLs no autorizadas regresan a `/sigeco`.
- Flujo real nuevo: `Paciente QA Cierre V37`, registro minimo en funnel, visita abierta, abandono en recepcion, salida de la lista activa e historial con area y nota persistentes.
- Redirects legacy de pacientes y visitas llegan a Recepcion; `/sigeco/leads` permanece retirado.
- Las 17 pantallas activas de Sigeco cargaron a 390x844. Las diez rutas publicas cargaron en 390x844 y 1440x900 sin desplazamiento lateral. Payload conserva `/admin/login`.

**Hallazgos corregidos:**

1. La tabla de Recepcion podia ensanchar el documento a 390px. Se corrigio el `min-width` de las tarjetas, se aislo el overflow en el shell y se reforzo el scope `.sigeco-app`; la tabla conserva scroll interno.
2. Una visita cerrada ocultaba acciones rapidas pero aun mostraba el formulario de derivacion y la query permitia reabrirla. El formulario ahora solo existe para visitas activas y `updateVisitRouteStatus` bloquea toda transicion posterior con `ClosedVisitTransitionError`; prueba de integracion agregada.

**Validaciones:** `pnpm lint`, `pnpm typecheck`, `pnpm test` (20 archivos, 69 tests), `pnpm test:integration` (10 archivos, 21 tests) y `pnpm run build`. Migraciones reproducidas desde cero hasta V3.7.

**Pendientes posteriores:** auditoria append-only, storage clinico seguro, auditoria formal de privacidad/permisos, backup/restauracion, realtime/polling, staging aislado, vulnerabilidades altas y GitHub Actions. Lista priorizada en [Estado de implementacion V3](../v3-implementation-status.md).

**Commit sugerido:** `docs(sigeco): document simplification and run final qa`

## Ajustes Post-Cierre (2026-07-11)

Correcciones pedidas por el usuario durante su QA manual con la guia de flujo completo.

### Chips sin punto al seleccionar

- `src/components/internal/reception/funnel-fields.tsx`: `ChipOption` ya no muestra el punto al inicio del chip seleccionado; la seleccion se distingue solo por borde, fondo y color de texto. Aplica a funnel y edicion de ficha (componente compartido).
- Validaciones: lint y tests unitarios.

**Commit sugerido:** `style(sigeco): remove dot from selected chips`

### Fuentes de captacion multiples

"Como nos conocio?" permite elegir una o varias fuentes.

- `prisma/schema.prisma` + `prisma/migrations/20260711200000_multi_capture_sources/`: campo nuevo `Patient.captureSources PatientCaptureSource[]` (aditivo) con backfill desde `captureSource`. El campo unico se conserva y sigue guardando la primera fuente elegida (compatibilidad con datos y consultas existentes).
- `src/features/reception/schemas/intake.schema.ts` + `.test.ts`: el form serializa la lista como CSV en un input oculto (`captureSources`); el schema la parsea y valida contra el enum; `captureSource` se deriva de la primera. 4 tests actualizados/nuevos (incluye rechazo de fuente desconocida).
- `src/modules/database/queries/reception.ts`: tipos y select incluyen `captureSources`; `src/modules/database/queries/patients.ts`: el alta legacy mantiene el invariante (`captureSources = [captureSource]`).
- `src/components/internal/reception/IntakeFunnel.tsx` y `PatientEditForm.tsx`: chips de fuente con toggle multiple y label "(puede elegir varios)"; el prellenado desde ficha existente carga la lista.
- `src/app/(internal)/sigeco/(app)/recepcion/pacientes/[id]/page.tsx`: "Fuente" muestra todas las fuentes separadas por " · ".
- `src/modules/database/queries/reception.integration.test.ts`: la edicion verifica la lista persistida.
- `docs/operations/sigeco-v3-full-flow-testing.md`: la guia usa dos fuentes (Referido + Facebook Ads) en el paso 4.

Validaciones: lint, typecheck, `pnpm test` (70), `pnpm test:integration` (21), build. Navegador: edicion de SI-000002 con dos fuentes (base: `{referral,facebook_ads}`, ficha "Referido · Facebook Ads") y funnel nuevo completo con TikTok + Volante (SI-000004, base `{tiktok,flyer}`, `captureSource=tiktok`).

Datos de QA en dev: paciente nuevo SI-000004 "Paciente QA Fuentes" con una visita abierta.

Nota operativa: si `next dev` estaba corriendo al aplicar la migracion, hay que reiniciarlo para que cargue el cliente Prisma regenerado (el server viejo da `PrismaClientValidationError`).

**Commit sugerido:** `feat(sigeco): allow multiple capture sources`
