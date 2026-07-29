# Tareas De Simplificacion Sigeco (V3.7)

Plan tecnico para simplificar el flujo del paciente en Sigeco: menos formularios, menos secciones y captura unica de datos en recepcion mediante un funnel clinico corto. El analisis que origino este plan esta en el artefacto "Analisis de flujo Sigeco" (2026-07-10) y las decisiones aprobadas por el usuario se registran en [Progreso de simplificacion](./progreso-de-simplificacion.md).

> **Aclaración operativa vigente:** este plan conserva la especificación técnica aprobada en julio de 2026. El nombre técnico del rol `seguimiento` no describe las tareas actuales de Yazmin. Ella solo responde mensajes y llamadas de WhatsApp, responde llamadas al número de la clínica, llama a personas que requieren información, contacta a quienes no lograron llegar a su visita y realiza recojos coordinados. Marlen y Recepción realizan el seguimiento de pacientes que ya están en tratamiento.

A diferencia del rediseno Marea, esta fase SI toca logica, modelos y permisos. El sistema visual sigue siendo Marea sin cambios ([spec](../../design/sigeco-visual-system.md)).

## Decisiones Aprobadas (2026-07-10)

1. Se elimina la UI y el termino "lead" de Sigeco. Los modelos Prisma y los datos existentes NO se borran. La captacion por WhatsApp/redes vivira en otro proyecto del usuario, sin integracion por ahora.
2. Marlen (recepcion) captura toda la informacion del paciente al llegar mediante un funnel clinico corto, aunque el paciente no compre nada. El medico recibe la consulta con esos datos prellenados.
3. Se fusionan los modulos Pacientes y Visitas en un solo modulo "Recepcion".
4. El rol `captacion` se desactiva. Yazmin pasa técnicamente a un rol nuevo `seguimiento`. En la decisión original, los seguimientos podían trabajarlos Recepción o Seguimiento. La aclaración operativa vigente reemplaza ese reparto: Marlen realiza el seguimiento del tratamiento y Yazmin no.
5. El flujo del paciente NO es lineal: puede abandonar en cualquier punto (incluso despues de la consulta), y despues de la consulta puede ir a enfermeria, a administracion a comprar un producto, o irse directamente.

## Reglas Transversales (aplican a todas las tareas)

1. **No destruir datos.** Los modelos `Lead` y relacionados quedan en el schema; solo se retira su UI y navegacion. Toda migracion de base de datos debe ser aditiva (campos y enums nuevos, valores por defecto); nunca `DROP` de tablas o columnas con datos.
2. **Permisos server-side.** Todo cambio de modulo o rol se verifica en el servidor (queries y actions), no solo ocultando enlaces.
3. **Sistema visual Marea intacto.** Usar `src/components/internal/ui/`; si un patron se repite en 2+ pantallas se promueve a componente. Nada cambia en sitio publico ni CMS.
4. **Chips antes que texto libre.** Toda pregunta con respuestas conocidas se contesta tocando opciones; el texto libre queda para lo que realmente lo necesita.
5. **Validacion minima por tarea:** `pnpm lint`, `pnpm typecheck`, `pnpm test`. Al cerrar cada tarea tambien `pnpm run build`; si la tarea toca queries o actions, ademas `pnpm test:integration`. Prueba visual en navegador con datos reales.
6. **Registro:** al terminar una tarea se agrega su entrada en [Progreso de simplificacion](./progreso-de-simplificacion.md) con fecha, archivos tocados, validaciones y pendientes.
7. Un commit por tarea con el mensaje sugerido (ajustar solo si el alcance real cambio).

---

## El Funnel De Recepcion (especificacion aprobada)

Funnel de 4 pasos que Marlen completa preguntando al paciente. Solo 3 campos obligatorios (marcados con `*`). Objetivo: 2-3 minutos. Arranca con una busqueda por telefono o nombre: si el paciente ya existe, los pasos 1 y 3 vienen prellenados y solo se confirma o corrige.

### Paso 1 — Quien es

| Pregunta | Tipo | Campo |
| --- | --- | --- |
| Nombre completo `*` | texto | `Patient.fullName` |
| Telefono (WhatsApp) `*` | texto | `Patient.phone` |
| Fecha de nacimiento | fecha | `Patient.birthDate` (existente) |
| Ciudad | chips + otro | `Patient.city` |
| Genero | chips, opcional | `Patient.gender` (existente, default `unknown`) |

Notas: se pide fecha de nacimiento, no edad (la edad se calcula). Genero se mantiene opcional y solo se pregunta cuando tenga utilidad clinica o estadistica; puede quedar sin responder.

### Paso 2 — A que viene (se guarda en la visita, no en el paciente)

| Pregunta | Tipo | Campo |
| --- | --- | --- |
| Que le trae hoy `*` | texto corto | `Visit.reason` |
| Desde cuando | numero + chips (dias/semanas/meses/anios) | `Visit.symptomDurationValue` + `Visit.symptomDurationUnit` (nuevos) |
| Primera consulta o control | chips: primera consulta / control de tratamiento / nuevo problema / revision de resultados | `Visit.intakeType` (nuevo) |
| Ya se atendio antes por esto | chips si/no | `Visit.previouslyTreated` (nuevo) |
| Trae analisis o estudios | chips si/no | `Visit.bringsStudies` (nuevo) |

Notas: "desde cuando" guarda cantidad y unidad (ej. 3 + meses), no solo la unidad. "Ya se atendio" vive en la visita actual porque puede cambiar segun cada problema. "Trae estudios" ayuda a preparar la consulta sin hacer preguntas medicas complejas.

### Paso 3 — Antecedentes rapidos

| Pregunta | Tipo | Campo |
| --- | --- | --- |
| Alergias | chip "ninguna conocida" + texto corto | `Patient.allergies` (existente) |
| Enfermedad de base | texto corto, opcional | `Patient.relevantHistory` (existente) |
| Medicacion actual | texto corto, opcional | `Patient.currentMedication` (nuevo) |

Notas: enfermedad de base y medicacion son dos campos separados aunque se muestren en la misma pantalla.

### Paso 4 — Origen y seguimiento

| Pregunta | Tipo | Campo |
| --- | --- | --- |
| Como nos conocio | chips | `Patient.captureSource` (existente) |
| Podemos contactarlo para seguimiento | chips: WhatsApp / llamada / ambos / prefiere no | `Patient.followUpPreference` (nuevo) |

Notas: la preferencia de contacto sirve para controlar evolucion, recordar citas y medir abandono del tratamiento; "prefiere no recibir seguimiento" debe respetarse en el modulo de seguimientos.

### Cierre del funnel

Un solo boton final crea (o actualiza) el paciente Y abre la visita con check-in en una sola transaccion. La caracterizacion profunda del sintoma (OPQRST/OLDCARTS) es trabajo del medico en la consulta, nunca de recepcion.

---

## Cambios De Modelo De Datos (resumen)

Migracion aditiva unica (Tarea 1):

```prisma
enum VisitIntakeType {
  first_visit
  treatment_control
  new_problem
  results_review
}

enum SymptomDurationUnit {
  days
  weeks
  months
  years
}

enum FollowUpContactPreference {
  whatsapp
  call
  both
  no_contact
  unknown
}

// Visit: campos nuevos
intakeType           VisitIntakeType      @default(first_visit)
symptomDurationValue Int?
symptomDurationUnit  SymptomDurationUnit?
previouslyTreated    Boolean?
bringsStudies        Boolean              @default(false)

// Patient: campos nuevos
currentMedication  String?
followUpPreference FollowUpContactPreference @default(unknown)

// InternalRole: valor nuevo (captacion queda deprecado, no se borra)
seguimiento
```

---

## Tarea 1 — Modelo De Datos De La Simplificacion

**Objetivo:** dejar lista la base de datos para el funnel y el rol nuevo, sin romper nada existente.

**Alcance:**

- Migracion Prisma aditiva con los enums y campos del resumen anterior.
- `src/features/internal-auth/permissions.ts`: agregar rol `seguimiento` (label "Seguimiento") con permisos `internal_access`, `patients_read`, `followups_read`, `followups_write`. El rol `captacion` queda en el codigo marcado como deprecado (no se asigna a usuarios nuevos); se retira su acceso a leads en la Tarea 3.
- Actualizar tests de permisos.

**Fuera de alcance:** cualquier UI; reasignar el usuario de Yazmin (Tarea 5).

**Criterios de aceptacion:** migracion aplica sobre la base existente sin perdida de datos; `pnpm test`, `pnpm test:integration`, lint, typecheck y build pasan.

**Commit sugerido:** `feat(sigeco): add simplification data model`

---

## Tarea 2 — Funnel De Recepcion

**Objetivo:** implementar el funnel de 4 pasos como la puerta de entrada unica de pacientes.

**Alcance:**

- Pantalla nueva de recepcion (ej. `recepcion/nuevo`) con los 4 pasos de la especificacion: indicador de paso, chips tocables, solo 3 obligatorios, teclado numerico para telefono.
- Busqueda inicial por telefono o nombre; si hay match, prellenar pasos 1 y 3 y solo crear la visita (actualizando lo que cambie del paciente).
- Server action transaccional que crea/actualiza paciente + crea visita con check-in en un paso.
- Tests de la action (creacion nueva, paciente existente, campos opcionales vacios).

**Fuera de alcance:** quitar los formularios viejos de alta (se retiran al fusionar en Tarea 4); tocar la consulta medica (Tarea 8).

**Criterios de aceptacion:** un paciente nuevo con visita abierta se registra en 2-3 minutos tocando chips; con solo nombre + telefono + motivo el funnel completa; validacion minima + integracion.

**Commit sugerido:** `feat(sigeco): add reception intake funnel`

---

## Tarea 3 — Retirar UI Y Termino Lead

**Objetivo:** que el termino "lead" desaparezca de la interfaz y navegacion de Sigeco, conservando los datos.

**Alcance:**

- Eliminar rutas `/sigeco/leads/*` y su entrada en `SidebarNav`/`MobileSidebar`.
- Quitar KPIs y tabla de leads del dashboard (reemplazo definitivo en Tarea 9).
- Retirar permisos `leads_*` de los mapeos de roles activos (el enum Prisma queda; los modelos `Lead`, `LeadContact*`, etc. quedan intactos con sus datos).
- Limpiar textos de UI que digan "lead" (StatusPill de leads queda sin uso y se elimina el componente si nadie mas lo usa).

**Fuera de alcance:** borrar modelos, tablas o migraciones de leads; tocar queries de leads usadas por tests de integracion existentes (se marcan como legacy si hace falta).

**Criterios de aceptacion:** ninguna pantalla, enlace ni texto visible de Sigeco menciona "lead"; los datos de leads siguen en la base; validacion minima + build.

**Commit sugerido:** `feat(sigeco): remove leads ui and terminology`

---

## Tarea 4 — Fusionar Pacientes Y Visitas En Recepcion

**Objetivo:** un solo modulo "Recepcion" donde Marlen trabaja: pacientes de hoy, visitas activas y busqueda de historial.

**Alcance:**

- Ruta nueva `/sigeco/recepcion` con dos vistas: "Hoy" (visitas activas con estado y accion rapida) y "Pacientes" (busqueda del padron completo).
- El detalle de paciente y el detalle de visita se mantienen (posiblemente unificados en una ficha con pestanias o secciones), colgando de recepcion.
- Boton principal del modulo: "Registrar llegada" -> funnel de la Tarea 2.
- Redirects desde `/sigeco/pacientes` y `/sigeco/visitas` a las vistas nuevas; actualizar sidebar (9 -> 7 secciones).

**Criterios de aceptacion:** todo lo que hoy se hace en Pacientes y Visitas se puede hacer desde Recepcion; ningun enlace roto; validacion minima + build.

**Commit sugerido:** `feat(sigeco): merge patients and visits into reception module`

---

## Tarea 5 — Rol Seguimiento Y Retiro De Captacion

**Objetivo técnico histórico:** crear un rol dedicado de seguimiento y desactivar el rol captacion. La asignación operativa posterior limita el seguimiento del tratamiento a Marlen; el nombre técnico del rol no amplía las tareas actuales de Yazmin.

**Alcance:**

- Reasignar el usuario de Yazmin al rol `seguimiento` (script o instruccion de seed documentada; no hardcodear datos personales).
- Verificar que `recepcion` tenga `followups_read`/`followups_write` (hoy no los tiene: agregarlos) para que Marlen tambien trabaje seguimientos.
- El rol `captacion` deja de aparecer como opcion asignable; usuarios existentes con ese rol solo conservan `internal_access` hasta ser reasignados.
- El modulo de seguimientos respeta `followUpPreference` del paciente: si es `no_contact`, la UI lo advierte antes de crear tareas de contacto.

**Criterios de aceptacion:** login con rol `seguimiento` ve solo seguimientos (y lectura de pacientes); recepcion ve seguimientos; captacion no accede a leads ni seguimientos; tests de permisos actualizados.

**Commit sugerido:** `feat(sigeco): add seguimiento role and retire captacion`

---

## Tarea 6 — Flujo De Visita Flexible

**Objetivo:** reflejar la realidad de la clinica: el paciente puede abandonar en cualquier punto o saltar areas.

**Alcance:**

- Accion rapida "Se retiro" visible en recepcion y en el detalle de visita en cualquier estado activo (usa el estado existente `left_without_care`, guardando en que punto abandono via historial de estados).
- Despues de la consulta, permitir enviar al paciente a enfermeria, a administracion o cerrar la visita directamente (compra sin enfermeria, o se va sin comprar).
- Cierre de visita en un toque desde administracion cuando el paciente solo compra un producto.

**Criterios de aceptacion:** los caminos consulta->administracion->salida, consulta->salida y abandono en recepcion funcionan y quedan trazados en `VisitStatusHistory`; validacion minima + integracion.

**Commit sugerido:** `feat(sigeco): support flexible visit flow and exits`

---

## Tarea 7 — Edicion De Ficha De Paciente

**Objetivo:** cerrar el pendiente transversal: los datos que Marlen captura deben poder corregirse.

**Alcance:**

- Edicion de los datos permanentes del paciente (identificacion, antecedentes, preferencia de seguimiento) desde su ficha en Recepcion, con permiso `patients_update`.
- Reusar los mismos chips y campos del funnel.

**Criterios de aceptacion:** un dato mal capturado se corrige sin crear registros duplicados; validacion minima + integracion.

**Commit sugerido:** `feat(sigeco): add patient record editing`

---

## Tarea 8 — Consulta Medica Prellenada Y Formularios Simplificados

**Objetivo:** que el Dr. Franco abra la consulta y ya tenga el contexto del funnel, sin re-preguntar nada.

**Alcance:**

- Cabecera de la consulta con resumen del funnel: motivo, desde cuando, tipo de visita, ya se atendio, trae estudios, alergias, enfermedad de base, medicacion actual, edad calculada.
- Receta, evolucion y ordenes como secciones colapsables (abiertas solo si se usan).
- Revisar los formularios de enfermeria y administracion para eliminar campos que ya llegan del funnel o de la venta; hacer visible el error de venta con stock insuficiente (pendiente transversal 2).

**Criterios de aceptacion:** ningun dato capturado en recepcion se vuelve a pedir en consulta, enfermeria ni administracion; validacion minima + integracion.

**Commit sugerido:** `feat(sigeco): prefill consultation and simplify clinical forms`

---

## Tarea 9 — Dashboard Centrado En Recepcion

**Objetivo:** que el dashboard hable del dia de la clinica, no del pipeline comercial.

**Alcance:**

- KPIs nuevos: pacientes de hoy, visitas activas por area, seguimientos de hoy/vencidos, abandonos del dia (`left_without_care`), stock bajo.
- Tabla "Ultimas llegadas" (reemplaza "Leads recientes") con enlace a la visita.
- Fila de accesos rapidos: registrar llegada (funnel), buscar paciente.

**Criterios de aceptacion:** el dashboard no menciona leads; las cifras salen de queries server-side probadas; validacion minima + integracion.

**Commit sugerido:** `feat(sigeco): refocus dashboard on reception metrics`

---

## Tarea 10 — Documentacion Y QA Final

**Objetivo:** cerrar V3.7 con documentacion coherente y prueba end-to-end del flujo nuevo.

**Alcance:**

- Actualizar `docs/project/v3-implementation-status.md` (mapa de rutas 7 secciones, fase V3.7, pendientes transversales que se cerraron).
- Actualizar `docs/operations/sigeco-v3-full-flow-testing.md` al flujo nuevo (funnel -> consulta -> salidas flexibles -> seguimiento).
- Revisar y corregir la documentacion que aun describe V3.6, rutas retiradas o conteos de tests anteriores. Como minimo: `docs/project/README.md`, `docs/project/v3-implementation-status.md`, `docs/project/v3-technical-implementation.md`, `docs/operations/testing.md`, `docs/operations/branch-flow.md` y `docs/operations/deploy.md`.
- Consolidar una sola lista de pendientes posteriores a V3.7, separando bloqueantes para operacion clinica, mejoras operativas y trabajo de plataforma.
- QA funcional por rol (recepcion, seguimiento, medico, enfermeria, administracion, direccion) en navegador con datos reales, incluyendo los caminos de abandono.
- QA responsive en 390px para todas las pantallas activas de Sigeco y verificacion de estados de error visibles.
- Verificar que sitio publico y CMS no cambiaron.

**Criterios de aceptacion:** las 10 tareas figuran con estado final y evidencia; ningun documento canonico presenta V3.6 como estado actual ni ofrece rutas retiradas como flujo vigente; los comandos y conteos de pruebas coinciden con el repositorio; el QA por rol y 390px queda registrado con hallazgos y decisiones.

**Commit sugerido:** `docs(sigeco): document simplification and run final qa`

---

## Backlog Posterior Al Cierre De V3.7

Estos puntos se conservan fuera de las tareas 1-10 para no ampliar la implementacion funcional en curso. La Tarea 10 debe revisarlos, cerrar los que ya esten resueltos y trasladar los restantes al estado consolidado de V3.

### Bloqueantes Para Uso Clinico Amplio

1. Implementar auditoria append-only para cambios clinicos, financieros, inventario, permisos y ruta del paciente.
2. Definir storage seguro, control de acceso, retencion y trazabilidad antes de habilitar adjuntos clinicos reales.
3. Ejecutar auditoria de permisos y privacidad por rol con casos negativos server-side.
4. Definir respaldo, restauracion y recuperacion ante incidentes de PostgreSQL y archivos clinicos.
5. Definir politica de sesiones, bloqueo, rotacion de secretos y respuesta ante acceso no autorizado.

### Pendientes Operativos

1. Formalizar realtime o polling para bandejas entre recepcion, consulta, enfermeria, administracion y seguimiento.
2. Mejorar errores visibles, en especial stock insuficiente, conflictos de formularios y acciones sobre visitas cerradas.
3. Resolver la deteccion de telefono duplicado al editar una ficha de paciente.
4. Definir receta, comprobante o documento imprimible si la clinica lo requiere.
5. Automatizar seguimientos solo despues de acordar reglas clinicas y consentimiento de contacto.
6. Agregar flujo de proveedores y compras cuando exista un proceso operativo aprobado.
7. Preparar staging con base, usuarios de prueba, seeds y variables completamente separados de produccion.
8. Reasignar usuarios de roles deprecados en cada ambiente antes de habilitar V3.7.

### Calidad Y Plataforma

1. Implementar GitHub Actions segun [el plan de CI](../github-actions-implementation-plan.md) despues de cerrar las 10 tareas.
2. Resolver vulnerabilidades altas reportadas por `pnpm audit` antes de produccion.
3. Definir umbrales de cobertura para modulos criticos, sin usar cobertura como reemplazo del QA funcional.
4. Certificar build reproducible desde checkout limpio y evitar ejecutar `next dev` y `next build` sobre el mismo `.next` simultaneamente.
5. Promover cambios mediante PRs `develop -> staging -> main`, con checks y aprobaciones obligatorias cuando CI este activo.
