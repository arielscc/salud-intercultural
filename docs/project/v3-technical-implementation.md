# Implementacion Tecnica V3

Roadmap tecnico para implementar V3 como sistema interno de gestion clinica y operativa de Salud Intercultural.

Este documento traduce los lineamientos funcionales de `docs/masters` a una estrategia tecnica implementable dentro de la arquitectura actual. No reemplaza los documentos maestros: los usa como fuente funcional para construir decisiones tecnicas, tareas y criterios de aceptacion.

## Fuentes

- [Documento de Negocio V3.0](../masters/Documento_de_Negocio_V3_0.md)
- [Documento Maestro Estrategico](../masters/Documento_Maestro_Estratégico.md)
- [Arquitectura V2](../architecture/v2-architecture.md)
- [Ownership de datos](../architecture/data-ownership.md)
- [Sistema visual publico](../design/public-visual-system.md)
- [Accesibilidad y UX responsive](../operations/accessibility-responsive.md)

## Decisiones Base

1. V3 se implementa sobre el monolito modular actual de Next.js App Router.
2. No se migra a monorepo en V3.
3. La ruta del sistema interno sera `/sigeco`.
4. Payload conserva `/admin` para CMS, contenido publico, media y administracion editorial.
5. Prisma/PostgreSQL sera la fuente de verdad para datos operativos transaccionales.
6. La UI operativa sera custom en `src/app/(internal)`, optimizada para mobile-first.
7. La autenticacion interna sera separada de Payload.
8. Los roles V3 se definen desde V3.1.
9. El viewport base de diseno y QA sera Android promedio de 390px de ancho.
10. V3 adopta tokens internos nuevos inspirados en principios de UI/UX profesional, dashboards operativos y mobile UI, sin rebranding de Salud Intercultural.
11. Toda visita activa debe tener control de ruta y comunicacion operativa en tiempo real entre areas.

## Objetivo Tecnico De V3

Construir el primer sistema operativo interno de la clinica, centrado en el paciente, capaz de registrar y consultar el ciclo:

```txt
Lead
↓
Interesado
↓
Paciente
↓
Visita
↓
Consulta / Estudios / Enfermeria
↓
Venta / Cobro / Inventario
↓
Seguimiento
↓
Nueva visita
```

V3 debe priorizar trazabilidad, permisos, rapidez de registro en mobile y consistencia de datos sobre automatizaciones avanzadas.

La ruta del paciente debe mantenerse actualizada mientras la visita esta activa. Cuando un area registra una indicacion o tarea para otra area, el sistema debe reflejarlo en la bandeja de trabajo correspondiente sin depender de comunicacion verbal.

## Arquitectura Propuesta

### Rutas

```txt
src/app/
├── (public)/
├── (payload)/
└── (internal)/
    └── sigeco/
        ├── layout.tsx
        ├── page.tsx
        ├── login/
        ├── leads/
        ├── pacientes/
        ├── visitas/
        ├── consultas/
        ├── enfermeria/
        ├── administracion/
        ├── seguimientos/
        ├── inventario/
        └── configuracion/
```

### Modulos

```txt
src/features/
├── internal-auth/
├── internal-shell/
├── crm/
├── patients/
├── visits/
├── patient-routing/
├── realtime-workflow/
├── clinical-care/
├── nursing/
├── sales/
├── follow-ups/
└── inventory/

src/modules/
├── auth/
├── database/
├── permissions/
├── realtime/
└── audit/
```

### Componentes Internos

```txt
src/components/internal/
├── AppShell.tsx
├── BottomNav.tsx
├── HeaderBar.tsx
├── QuickActionButton.tsx
├── EntityList.tsx
├── EntitySearch.tsx
├── StatusPill.tsx
├── Timeline.tsx
├── FormSection.tsx
├── ActionSheet.tsx
├── ConfirmDialog.tsx
└── EmptyState.tsx
```

### APIs Internas

Preferir Server Actions para operaciones cercanas a formularios y Route Handlers cuando se requieran integraciones, endpoints consumibles por cliente o control explicito de metodo HTTP.

```txt
src/app/api/internal/
├── auth/
├── leads/
├── patients/
├── visits/
├── clinical/
├── nursing/
├── sales/
├── follow-ups/
└── inventory/
```

## Ownership De Datos

### Prisma

Usar Prisma para:

- Usuarios internos y sesiones.
- Roles y permisos.
- Leads operativos V3.
- Pacientes.
- Visitas.
- Consultas, diagnosticos, tratamientos y recetas.
- Estudios, signos vitales y aplicaciones clinicas.
- Ventas, cobros y productos entregados.
- Seguimientos y recordatorios.
- Inventario, movimientos y alertas.
- Ruta activa del paciente.
- Tareas entre areas y notificaciones internas.
- Auditoria operativa.

### Payload

Payload mantiene:

- Sitio publico.
- CMS editorial.
- Media.
- Servicios, tratamientos publicos, equipo, testimonios, FAQs y paginas.
- Leads publicos V2 mientras se migra o sincroniza el flujo V3.

### Regla De Integracion Leads V2 -> V3

La collection actual `lead-submissions` no debe duplicarse indefinidamente como fuente editable paralela.

V3.1 debe definir una migracion controlada:

1. Mantener el formulario publico actual sin romper conversion.
2. Crear modelo Prisma `Lead` operativo.
3. Definir si el endpoint publico escribe directamente en Prisma, o si se crea una tarea de migracion desde Payload.
4. Exponer en `/sigeco/leads` el pipeline comercial operativo.
5. Dejar Payload como historico o vista secundaria solo si se documenta.

## Comunicacion Operativa En Tiempo Real

### Regla Tecnica

Toda accion que derive trabajo a otra area debe crear un evento persistente y una tarea operativa para el area destino.

La base de datos es la fuente de verdad. La capa de tiempo real solo entrega actualizaciones a la UI; no debe ser la unica fuente del estado.

### Casos Iniciales

- Recepcion envia paciente a consulta.
- Medico indica signos vitales, estudio, aplicacion clinica, suero, receta, producto o cobro.
- Enfermeria recibe indicacion, ejecuta y registra resultado.
- Administracion recibe venta, cobro o entrega pendiente.
- Seguimiento recibe tarea posterior a consulta, venta o llamada.

### Modelos Prisma Transversales

```txt
PatientRoute
PatientRouteStep
VisitWorkItem
VisitWorkItemEvent
ClinicalOrder
InternalNotification
RealtimeDeliveryState
```

### Conceptos

`PatientRoute` representa la ruta activa de una visita.

`PatientRouteStep` representa el paso actual o historico de la visita: recepcion, consulta, enfermeria, administracion, seguimiento o cierre.

`VisitWorkItem` representa una tarea que un area debe ejecutar durante la visita.

`ClinicalOrder` representa una indicacion clinica estructurada creada por el medico, por ejemplo aplicar suero ABC, tomar signos vitales o realizar estudio.

`InternalNotification` representa el aviso visible para usuarios o roles de destino.

`RealtimeDeliveryState` registra entrega, lectura o reintento de notificaciones cuando aplique.

### Estados De Work Item

```txt
pending
acknowledged
in_progress
completed
cancelled
blocked
```

### Areas De Destino

```txt
recepcion
medico
enfermeria
administracion
seguimiento
direccion
```

### Implementacion Recomendada

1. Crear eventos persistentes en PostgreSQL dentro de la misma transaccion que cambia la visita, consulta, indicacion, venta o seguimiento.
2. Invalidar y refrescar vistas server-side con datos actuales.
3. Entregar avisos a la UI interna mediante una abstraccion `src/modules/realtime`.
4. Empezar con polling corto o Server-Sent Events segun compatibilidad del hosting.
5. Mantener la interfaz preparada para cambiar a WebSocket o servicio realtime externo si la operacion lo exige.

No implementar la logica de negocio directamente en WebSocket, SSE o cliente. El estado valido siempre debe reconstruirse desde Prisma.

### UI Requerida

- Indicador de visita activa y area actual.
- Bandeja por area: "Pendiente", "En proceso", "Completado".
- Badge de nuevas indicaciones.
- Timeline de ruta del paciente.
- Estado de lectura o toma de tarea cuando aplique.
- Accion rapida "tomar tarea" para evitar doble ejecucion.
- Refresco visible sin perder datos escritos en formularios.

### Permisos

- Cada rol ve solo tareas destinadas a su area o autorizadas por permiso.
- Direccion puede ver la ruta completa.
- Captacion no ve tareas clinicas sensibles.
- Enfermeria ve indicaciones operativas necesarias, pero no puede modificar diagnosticos.
- Administracion ve cobros, productos y servicios pendientes, pero no modifica consulta clinica.

### Criterios Transversales

- Una indicacion medica para enfermeria aparece en la bandeja de enfermeria sin recargar manualmente cuando la infraestructura realtime este activa.
- Si la entrega realtime falla, la tarea sigue visible al refrescar o por polling.
- Cada tarea conserva autor, area origen, area destino, paciente, visita, estado y timestamps.
- Completar una tarea actualiza la ruta y el expediente cronologico.
- Los eventos de ruta quedan auditados.

## Autenticacion Interna

V3 usara auth interna separada de Payload.

### Requisitos

- Login en `/sigeco/login`.
- Sesion HTTP-only.
- Proteccion server-side de rutas internas.
- Logout.
- Hash seguro de passwords.
- Bloqueo basico por intentos fallidos.
- Expiracion configurable.
- Usuario tecnico `super_admin` inicial via seed seguro.

### Modelos Iniciales

```txt
InternalUser
InternalSession
InternalRole
InternalPermission
InternalUserRole
```

### Roles V3

```txt
super_admin
direccion
medico
recepcion
captacion
administracion
enfermeria
```

### Politica De Permisos

Los permisos deben declararse por accion y modulo:

```txt
module.action
```

Ejemplos:

```txt
leads.read
leads.update
patients.create
patients.read
visits.create
clinical.write
nursing.write
sales.write
inventory.adjust
reports.read
```

## Mobile-First V3

V3 se disena primero para 390px de ancho.

### Principios

1. Cada flujo critico debe completarse en una mano o con interaccion tactil comoda.
2. Los formularios largos deben dividirse en secciones progresivas.
3. Las acciones frecuentes deben estar visibles en la parte inferior o en barras persistentes.
4. Las listas deben priorizar busqueda, filtros rapidos y estados visuales.
5. Los dashboards deben mostrar primero alertas y tareas accionables, no graficos decorativos.
6. Los textos clinicos deben ser legibles, escaneables y sin densidad excesiva en mobile.
7. Desktop amplia informacion y tablas, pero no define el flujo base.

### Reglas UI

- Target tactil minimo recomendado: 44px.
- Formularios con labels persistentes.
- Inputs con teclado adecuado: telefono, numero, fecha, texto.
- Estados visibles: loading, empty, error, success, offline/no disponible si aplica.
- Navegacion primaria por bottom nav en mobile.
- Acciones secundarias en action sheets.
- Evitar tablas horizontales como UI primaria en mobile.
- Usar timelines para historial clinico y visitas.
- Usar cards compactas solo para items repetidos; no anidar cards.

### Tokens Internos

Crear una extension interna del sistema visual:

```txt
src/config/internal-design-system.ts
```

Lineamientos:

- Mantener teal medico y verde intercultural como identidad.
- Reducir decoracion respecto al sitio publico.
- Usar superficies claras, bordes definidos y estados de prioridad.
- Incorporar colores funcionales: pendiente, activo, vencido, critico, completado.
- Tipografia compacta: headings funcionales, labels claros, metadata pequena.
- Radio menor que el sitio publico para una UI mas operativa.
- Dashboard interno con densidad moderada, no estilo landing.

## Estrategia De Implementacion

Cada fase debe implementarse como entrega independiente, con migraciones, UI, permisos, validaciones y tests propios.

Orden:

1. V3.1A: CRM/leads internos.
2. V3.1B: pacientes, recepcion y visitas.
3. V3.2: atencion medica.
4. V3.3: estudios y enfermeria.
5. V3.4: administracion y ventas.
6. V3.5: seguimiento.
7. V3.6: inventario.

## V3.1A - CRM Y Leads Internos

### Objetivo

Convertir los leads actuales en un pipeline operativo para captacion y seguimiento comercial, preparado para mobile.

### Modelos Prisma

```txt
Lead
LeadContactAttempt
LeadReminder
LeadStatusHistory
LeadSource
```

### Estados

```txt
new
contacted
interested
wants_visit
reminder_pending
confirmed_attendance
no_answer
discarded
converted_to_patient
```

### Tareas Independientes

- Crear migracion Prisma para `Lead`, estados, fuente, responsable y timestamps.
- Crear modelos de historial de contacto, recordatorios e historial de estado.
- Implementar schemas Zod de creacion y actualizacion de lead.
- Crear repositorio de queries en `src/modules/database/queries/leads-v3.ts`.
- Crear auth interna minima y roles base antes de exponer `/sigeco`.
- Crear layout interno `/sigeco` protegido.
- Crear `/sigeco/login`.
- Crear `/sigeco/leads` con lista mobile-first.
- Crear busqueda por nombre, telefono y ciudad.
- Crear filtros por estado, fuente y responsable.
- Crear detalle de lead con timeline comercial.
- Crear formulario de nuevo lead manual.
- Crear acciones rapidas: llamar, WhatsApp, cambiar estado, crear recordatorio.
- Crear registro de intento de contacto.
- Crear recordatorios pendientes por usuario.
- Definir estrategia de migracion desde `lead-submissions`.
- Ajustar endpoint publico `/api/leads` solo cuando se decida el cambio de fuente.
- Crear tests unitarios de schemas y permisos.
- Crear tests de queries principales.
- Documentar flujo en `docs/operations/leads.md` cuando se active V3.

### Criterios De Aceptacion

- Un usuario con rol `captacion` puede entrar a `/sigeco/leads`.
- Un usuario no autenticado es enviado a `/sigeco/login`.
- Un lead puede crearse, buscarse, actualizarse y cambiar de estado desde mobile 390px.
- Cada cambio de estado genera historial.
- Cada llamada o contacto queda registrado.
- Un recordatorio pendiente aparece en la vista de trabajo.
- No se expone informacion clinica en el modulo comercial.
- `pnpm lint`, `pnpm test` y `pnpm typecheck` pasan para el alcance.

## V3.1B - Pacientes, Recepcion Y Visitas

### Objetivo

Crear el expediente permanente del paciente y el flujo base de visita presencial.

### Modelos Prisma

```txt
Patient
PatientContact
PatientCaptureSource
PatientNote
Visit
VisitStatusHistory
ReceptionCheckIn
```

### Estados De Visita

```txt
in_reception
in_consultation
in_nursing
in_administration
completed
left_without_care
cancelled
```

### Tareas Independientes

- Crear migracion Prisma para pacientes.
- Crear migracion Prisma para visitas y estados.
- Crear indice unico operativo para evitar duplicados obvios por telefono/documento si existe.
- Crear schemas Zod para paciente y visita.
- Crear queries `patients.ts` y `visits.ts`.
- Crear `/sigeco/pacientes` con busqueda mobile-first.
- Crear formulario de paciente con datos minimos.
- Crear deteccion de posibles duplicados antes de crear paciente.
- Crear detalle de paciente con ficha permanente.
- Crear timeline cronologico de visitas.
- Crear accion "registrar llegada".
- Crear `/sigeco/visitas` como lista de atencion del dia.
- Crear cambio de estado de visita.
- Crear `PatientRoute` y `PatientRouteStep` para visitas activas.
- Crear bandejas base por area para tareas de visita.
- Crear eventos de ruta cuando recepcion deriva a consulta, enfermeria o administracion.
- Crear conversion de lead a paciente.
- Crear relacion `Lead -> Patient` cuando aplique.
- Crear permisos para recepcion, captacion, direccion y super_admin.
- Crear tests de creacion de paciente, duplicados y apertura de visita.
- Crear seed de roles y usuario interno inicial.

### Criterios De Aceptacion

- Recepcion puede buscar paciente por nombre o telefono desde mobile.
- Recepcion puede crear paciente con datos minimos.
- Recepcion puede registrar llegada sin cita previa.
- Una visita queda asociada a un paciente.
- El historial del paciente muestra visitas en orden cronologico.
- Captacion puede convertir un lead en paciente sin acceder a datos clinicos futuros.
- El flujo completo funciona en viewport de 390px sin tablas obligatorias.
- Una visita activa muestra area actual, siguiente paso y tareas pendientes.
- Cuando recepcion deriva al paciente, el area destino ve la visita en su bandeja de trabajo.

## V3.2 - Atencion Medica

### Objetivo

Registrar la consulta clinica, diagnosticos, indicaciones, tratamiento personalizado, receta y evolucion dentro de la visita del paciente.

### Modelos Prisma

```txt
ClinicalConsultation
Diagnosis
TreatmentPlan
Prescription
PrescriptionItem
ClinicalEvolution
ClinicalNote
ClinicalOrder
```

### Tareas Independientes

- Crear migracion Prisma para consulta y diagnosticos.
- Crear migracion Prisma para tratamientos personalizados y recetas.
- Crear schemas Zod para consulta, diagnostico, tratamiento y receta.
- Crear queries `clinical-care.ts`.
- Crear `/sigeco/consultas` como lista de pacientes en consulta.
- Crear pantalla de consulta por visita.
- Crear formulario de motivo, hallazgos, diagnostico principal y secundarios.
- Crear registro de plan de tratamiento.
- Crear receta con multiples items.
- Crear orden clinica estructurada para enfermeria, estudios, aplicacion, suero, administracion o seguimiento.
- Crear evento de ruta cuando el medico derive trabajo a otra area.
- Crear evolucion clinica como entrada cronologica.
- Crear vista de expediente clinico para medico.
- Restringir escritura clinica a rol `medico` y `super_admin`.
- Permitir lectura a direccion segun permiso.
- Bloquear lectura clinica para captacion.
- Crear auditoria para cambios clinicos sensibles.
- Crear estados de guardado y borrador si el formulario es largo.
- Crear impresion/exportacion simple de receta si se decide en fase.
- Crear tests de permisos clinicos.
- Crear tests de queries de expediente.

### Criterios De Aceptacion

- Medico puede abrir una visita en estado `in_consultation`.
- Medico puede registrar diagnostico, observaciones, plan y receta.
- Medico puede crear una indicacion para enfermeria, como aplicar suero ABC, asociada a paciente y visita.
- La indicacion medica crea una tarea visible para el area destino.
- El expediente muestra la consulta dentro de la cronologia del paciente.
- Captacion no puede ver diagnosticos ni estudios.
- Recepcion no puede modificar diagnosticos ni tratamientos.
- Los formularios clinicos son usables en 390px con secciones progresivas.

## V3.3 - Estudios Y Enfermeria

### Objetivo

Registrar estudios, resonancia, signos vitales, aplicaciones clinicas y observaciones de enfermeria asociados al paciente y visita.

### Modelos Prisma

```txt
Study
StudyAttachment
VitalSigns
NursingApplication
NursingNote
ClinicalAttachment
NursingWorkItemResult
```

### Tareas Independientes

- Crear migracion Prisma para estudios.
- Crear migracion Prisma para signos vitales.
- Crear migracion Prisma para aplicaciones clinicas.
- Definir almacenamiento de adjuntos clinicos y politica de privacidad.
- Crear schemas Zod para estudios, signos vitales y aplicaciones.
- Crear queries `nursing.ts` y `studies.ts`.
- Crear `/sigeco/enfermeria` como lista de trabajo.
- Crear bandeja de indicaciones recibidas desde consulta.
- Crear accion "tomar tarea" para indicaciones de enfermeria.
- Crear formulario de signos vitales.
- Crear formulario de aplicacion clinica.
- Crear registro de resonancia asociado a expediente.
- Crear registro de laboratorio/ecografia/otros estudios.
- Crear adjuntos solo si hay decision de storage segura.
- Crear permisos de enfermeria: escribir signos, estudios y aplicaciones; no crear diagnosticos.
- Crear vista de estudios para medico.
- Crear timeline de enfermeria dentro del paciente.
- Crear tests de permisos de enfermeria.
- Crear tests de asociacion estudio-paciente-visita.

### Criterios De Aceptacion

- Enfermeria puede registrar signos vitales desde mobile.
- Enfermeria recibe indicaciones creadas por el medico dentro de la visita activa.
- Enfermeria puede ver que debe aplicar, a que paciente, con que indicacion y quien la registro.
- Enfermeria puede marcar la tarea como en proceso, completada o bloqueada.
- Enfermeria puede registrar aplicacion clinica con medicamento, cantidad, responsable y hora.
- Una resonancia queda asociada al expediente del paciente.
- Medico puede revisar estudios.
- Enfermeria no puede crear ni modificar diagnosticos.
- Todo registro queda asociado a paciente y, cuando aplique, a visita.

## V3.4 - Administracion, Ventas Y Cobros

### Objetivo

Registrar ventas, cobros, productos entregados y servicios realizados, asociando cada operacion al paciente y visita.

### Modelos Prisma

```txt
Sale
SaleItem
Payment
PaymentMethod
DeliveredProduct
CashMovement
```

### Tareas Independientes

- Crear migracion Prisma para ventas.
- Crear migracion Prisma para pagos y movimientos de caja.
- Crear schemas Zod para venta, item y cobro.
- Crear queries `sales.ts`.
- Crear `/sigeco/administracion` como lista de pacientes pendientes de cobro.
- Crear bandeja de cobros, entregas o servicios pendientes derivados desde consulta o enfermeria.
- Crear formulario de venta mobile-first.
- Crear seleccion de paciente y visita.
- Crear items de venta: tratamiento, medicamento, resonancia, suero, servicio, estudio.
- Crear registro de forma de pago.
- Crear estado de pago: pendiente, parcial, pagado, anulado.
- Crear comprobante interno simple.
- Crear permisos para administracion y direccion.
- Bloquear diagnosticos para administracion.
- Preparar eventos para descuento de inventario en V3.6.
- Crear tests de totales, estados y permisos.
- Crear reportes basicos de ventas del dia y mes.

### Criterios De Aceptacion

- Administracion puede registrar una venta asociada a paciente.
- Administracion recibe tareas pendientes cuando otra area deriva cobro, producto, servicio o estudio.
- Administracion puede registrar cobro y forma de pago.
- Direccion puede ver ventas del dia y mes.
- Administracion no puede modificar diagnosticos ni estudios.
- Una venta queda visible en la cronologia administrativa del paciente.
- Los calculos de total no dependen de valores del cliente.

## V3.5 - Seguimiento

### Objetivo

Crear recordatorios, llamadas, tareas de seguimiento y estados posteriores a consulta o venta.

### Modelos Prisma

```txt
FollowUpTask
FollowUpAttempt
FollowUpStatusHistory
FollowUpTemplate
```

### Estados

```txt
pending
done
improved
not_improved
no_answer
wants_return
requires_new_visit
requires_doctor_call
cancelled
```

### Tareas Independientes

- Crear migracion Prisma para seguimientos.
- Crear schemas Zod de tarea e intento de seguimiento.
- Crear queries `follow-ups.ts`.
- Crear `/sigeco/seguimientos` como bandeja diaria.
- Crear filtros por vencido, hoy, proximo, responsable y estado.
- Crear accion rapida de WhatsApp/llamada.
- Crear registro de resultado de contacto.
- Crear recordatorio desde lead, paciente, consulta o venta.
- Crear seguimiento automaticamente cuando una indicacion, consulta o venta lo requiera.
- Crear tarea de seguimiento desde la ruta activa del paciente.
- Crear asignacion de responsable.
- Crear permisos para captacion, administracion, medico y direccion segun tipo de seguimiento.
- Crear vista de historial de seguimiento en paciente.
- Crear indicadores de pendientes en dashboard interno.
- Crear tests de vencimientos y permisos.

### Criterios De Aceptacion

- Un seguimiento puede crearse desde un paciente.
- Un seguimiento puede originarse desde una tarea o indicacion de la visita activa.
- Un seguimiento puede marcarse como realizado con resultado.
- Los seguimientos vencidos aparecen destacados.
- El historial del paciente muestra llamadas y resultados.
- Captacion no accede a informacion clinica restringida al resolver tareas comerciales.

## V3.6 - Inventario

### Objetivo

Gestionar productos, stock, movimientos, alertas y descuento automatico por venta.

### Modelos Prisma

```txt
InventoryItem
InventoryMovement
InventoryAdjustment
Supplier
InventoryAlert
```

### Tipos De Movimiento

```txt
entry
automatic_sale_exit
authorized_manual_adjustment
correction
```

### Tareas Independientes

- Crear migracion Prisma para productos.
- Crear migracion Prisma para movimientos append-only.
- Crear constraints para SKU/codigo interno cuando aplique.
- Crear schemas Zod para producto, movimiento y ajuste.
- Crear queries `inventory.ts`.
- Crear `/sigeco/inventario`.
- Crear lista de productos con stock actual.
- Crear alertas de stock bajo.
- Crear entrada de stock.
- Crear ajuste manual autorizado.
- Crear descuento automatico de stock desde venta.
- Crear bloqueo o alerta cuando una venta excede stock disponible.
- Crear historial de movimientos por producto.
- Crear permisos: administracion puede registrar ventas, direccion ve reportes, super_admin ajusta, inventario ajusta si se crea rol futuro.
- Crear tests de movimientos, stock calculado y descuento por venta.
- Crear reporte de productos con stock bajo.

### Criterios De Aceptacion

- Una venta con item inventariable genera salida automatica de stock.
- Todo movimiento queda registrado y no se edita como contenido CMS.
- Productos bajo minimo aparecen en alerta.
- Ajustes manuales requieren permiso autorizado.
- Direccion puede ver stock bajo.
- El stock actual se calcula o mantiene de forma consistente desde movimientos.

## Dashboard Interno V3

### Ruta

```txt
/sigeco
```

### Widgets Iniciales

- Leads nuevos.
- Leads con recordatorio pendiente.
- Pacientes atendidos hoy.
- Visitas activas.
- Tareas por area en tiempo real.
- Indicaciones pendientes de ejecutar.
- Seguimientos vencidos.
- Ventas del dia.
- Productos con stock bajo.

### Tareas Independientes

- Crear queries agregadas por rol.
- Crear dashboard mobile-first con tarjetas compactas.
- Crear resumen de ruta activa por area.
- Crear feed de eventos recientes de visita.
- Mostrar acciones prioritarias antes que graficos.
- Crear estados de carga y error.
- Filtrar widgets segun permisos.

## Seguridad Y Privacidad

### Reglas

- No enviar PII ni datos clinicos a analytics.
- No exponer diagnosticos a roles comerciales.
- Registrar auditoria para cambios clinicos, ventas, ajustes de inventario y permisos.
- Registrar auditoria para cambios de ruta, indicaciones y tareas entre areas.
- Validar permisos en servidor, no solo en UI.
- Sanitizar entradas de texto.
- Usar rate limit en endpoints sensibles.
- Mantener sesiones en cookies HTTP-only.
- Evitar logs con datos clinicos o telefonos completos.

### Tareas Independientes

- Crear modulo `src/modules/permissions`.
- Crear helper server-side `requireInternalUser`.
- Crear helper `requirePermission`.
- Crear modulo `src/modules/audit`.
- Crear tabla `AuditEvent`.
- Crear tests de acceso denegado por rol.

## Testing Y QA

### Minimos Por Fase

- Unit tests para schemas Zod.
- Unit tests para permisos.
- Tests de queries criticas.
- Tests de Server Actions o route handlers.
- Tests responsive manuales en 390px.
- Validacion de teclado y foco.

### Comandos

```bash
pnpm lint
pnpm test
pnpm typecheck
pnpm run build
```

Si hay migraciones o queries transaccionales:

```bash
pnpm test:integration
```

## Migraciones Y Seeds

### Reglas

- Cada fase que agregue modelos debe incluir migracion Prisma.
- Los roles y permisos iniciales deben seedearse.
- El primer `super_admin` debe crearse solo mediante variables seguras o comando local documentado.
- No crear datos clinicos reales en seeds.
- Los seeds de prueba deben usar datos ficticios.

### Variables Probables

```env
INTERNAL_AUTH_SECRET=""
INTERNAL_SESSION_SECONDS="28800"
INTERNAL_LOCK_MINUTES="10"
INTERNAL_ADMIN_EMAIL=""
INTERNAL_ADMIN_PASSWORD=""
```

Estas variables deben agregarse a `.env.example` y `docs/operations/environment-variables.md` cuando se implemente auth interna.

## Definicion De Terminado V3

Una fase V3 queda cerrada cuando:

1. Modelos Prisma y migraciones estan implementados.
2. Queries y validaciones estan cubiertas.
3. UI `/sigeco` funciona en mobile 390px.
4. Permisos server-side estan aplicados.
5. Estados loading, empty, error y success existen.
6. Documentacion operativa afectada esta actualizada.
7. No hay duplicacion editable entre Payload y Prisma.
8. Tests relevantes pasan.
9. `pnpm lint`, `pnpm test`, `pnpm typecheck` y `pnpm run build` pasan antes de promover.

## Riesgos Tecnicos

- Duplicar leads entre Payload y Prisma sin definir ownership final.
- Crear pantallas internas tipo desktop y despues intentar adaptarlas a mobile.
- Subestimar permisos clinicos y exponer informacion sensible.
- Mezclar CMS editorial con operacion transaccional.
- Implementar ventas antes de definir relacion con inventario.
- Crear formularios clinicos largos sin guardado progresivo.
- No auditar cambios sensibles desde el inicio.

## Primer Paso Recomendado

Iniciar con una rama V3.1A enfocada solo en:

1. Auth interna separada.
2. Roles y permisos base.
3. Shell mobile-first `/sigeco`.
4. Modelos Prisma de leads operativos.
5. Pipeline de leads y recordatorios.

No comenzar pacientes, consultas ni ventas hasta cerrar este cimiento.
