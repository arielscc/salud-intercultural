# Implementacion Tecnica V3.7

Arquitectura vigente de Sigeco despues de la simplificacion V3.7.

## Decisiones Base

1. Monolito modular con Next.js App Router.
2. Payload conserva contenido publico, media y CMS en `/admin`.
3. Prisma/PostgreSQL es la fuente de verdad transaccional de Sigeco.
4. La autenticacion interna es independiente de Payload.
5. La UI interna vive bajo `/sigeco` y usa el sistema visual Marea.
6. La base de datos es la fuente de verdad; realtime futuro solo transportara actualizaciones.
7. Toda operacion sensible valida permisos en servidor.
8. Las migraciones preservan datos y se prueban contra PostgreSQL real.

## Limites De Ownership

### Payload

- Paginas y contenido publico.
- Servicios, tratamientos, equipo, testimonios y FAQs.
- Media editorial.
- Formulario publico y `lead-submissions` del sitio web.
- Campañas y enlaces de marketing en `marketing-campaigns`.

### Prisma

- Usuarios y sesiones internas.
- Pacientes, visitas, rutas y tareas entre areas.
- Consulta vigente, versiones, firma interna, diagnosticos, recetas y
  evoluciones.
- Resultado y versiones de propuestas de tratamiento.
- Enfermeria, estudios y adjuntos modelados.
- Ventas, pagos, caja e inventario.
- Seguimientos e historial operativo.
- Copia técnica de campañas, atribución por visita y reportes internos.

### Contrato Payload-SIGECO

Payload edita la campaña y SIGECO la refleja de forma idempotente mediante un
identificador externo y una revisión. El contrato usa un token exclusivo,
rechaza campos desconocidos y no comparte pacientes ni clínica. La respuesta a
Marketing contiene únicamente totales agregados por período y campaña; grupos
menores a cinco se ocultan. Si Payload no responde durante una llegada,
Recepción continúa con la fuente manual y la campaña queda pendiente, sin
repetir al paciente o la visita. La operación está documentada en [Integración
segura Payload-SIGECO](../operations/payload-sigeco-integration.md).

Los modelos internos legacy de leads permanecen para preservar datos historicos, pero no tienen ruta, navegacion ni permisos activos en Sigeco.

## Estructura Principal

```txt
src/app/
  (public)/
  (payload)/
  (internal)/sigeco/
    (app)/
      recepcion/
      consultas/
      enfermeria/
      administracion/
      seguimientos/
      inventario/

src/features/
  reception/
  visits/
  clinical-care/
  clinical-records/
  nursing/
  studies/
  sales/
  follow-ups/
  inventory/
  internal-auth/

src/modules/
  auth/
  database/
  permissions/
```

## Flujo De Escritura

```txt
UI Server Component / Client Component
  -> Server Action
  -> Zod schema
  -> requirePermission
  -> query transaccional Prisma
  -> revalidatePath / redirect
```

Las paginas consultan mediante modulos de `src/modules/database/queries`. Los formularios no calculan totales financieros ni stock definitivo en cliente.

## Modelo Operativo

### Paciente Y Llegada

`Patient` contiene datos permanentes. `Visit` contiene el motivo y contexto de la llegada actual. El funnel nunca guarda como dato permanente lo que puede cambiar entre visitas.

`createReceptionIntake` ejecuta en una sola transaccion:

1. Crear o actualizar paciente.
2. Crear visita.
3. Registrar check-in e historial inicial.
4. Abrir `PatientRoute` en recepcion.
5. Crear el primer `VisitWorkItem`.
6. Crear `VisitAttribution` con fuente principal, apoyos y evidencia verificable.

La fuente original del `Patient` solo se define al crear la ficha. Las visitas
posteriores no la reemplazan. Cada `VisitAttribution` funciona como fotografía
histórica y sus `VisitAttributionTouch` distinguen la fuente principal de los
canales de apoyo.

`CaptureSource` es el catálogo administrable. `CaptureCampaign` resuelve cuenta
exacta y tráfico orgánico o pagado únicamente desde códigos de enlace o
formulario. Si no hay evidencia, el detalle queda como no identificado.

### Ruta Flexible

`PatientRoute` mantiene el area actual y si la ruta sigue activa. Cada transicion agrega `PatientRouteStep`, `VisitStatusHistory` y una tarea operativa.

Estados cerrados:

- `completed`
- `left_without_care`
- `cancelled`

Una vez cerrada, la visita no admite nuevas transiciones. La invariante vive en `updateVisitRouteStatus`, dentro de la transaccion, y tambien se refleja ocultando acciones en UI.

### Consulta Prellenada

La consulta lee directamente el contexto de `Visit` y `Patient`: motivo, duracion, tipo de visita, atencion previa, estudios, edad, alergias, antecedentes y medicacion. El motivo no se solicita de nuevo.

Receta, evolucion y ordenes usan secciones colapsables. Una orden crea de forma persistente un `VisitWorkItem` para el area destino.

### Resultado De La Propuesta

`TreatmentProposalOutcome` conserva una secuencia append-only por consulta. El
resultado vigente es el evento que no fue reemplazado. Los índices parciales
impiden dos eventos iniciales y dos aceptaciones para la misma consulta; un
trigger de PostgreSQL bloquea edición y borrado.

`recordTreatmentProposalOutcome` usa una transacción serializable. Cuando el
paciente acepta, cambia la ruta a Administración, crea `VisitWorkItem` y
`ClinicalOrder`, y después inserta el resultado enlazado. No invoca
`createSaleRecord`: Administración continúa siendo responsable de registrar los
conceptos vendidos y sus pagos.

Cuando el resultado es `needs_time`, se consulta el último `PatientConsent` de
seguimiento. Solo una decisión concedida permite crear `FollowUpTask`; se
prefiere un usuario activo de Recepción llamado Marlen y nunca se asigna
automáticamente a Comunicación.

La guía operativa vive en
[Resultado de la propuesta de tratamiento](../operations/treatment-proposal-outcomes.md).

### Clasificación De Seguimientos

`FollowUpTask` separa:

- `type`: propósito del contacto;
- `domain`: relación clínica o administrativa;
- `priority`: orden operativo;
- `status`: pendiente, terminado o cancelado;
- `result`: respuesta o resultado más reciente;
- `assignedToId` y `dueAt`: responsable y vencimiento.

`FollowUpAttempt.result` usa `FollowUpResult`; ya no modifica el estado con
valores como “mejoró”. `No responde` y `Reprogramado` actualizan `dueAt` y
mantienen la tarea pendiente.

`createFollowUpAttemptRecord` valida consentimiento, resultado permitido y rol
dentro de una transacción. Cuando el resultado es `worsened` o
`escalated_to_doctor`, crea una tarea urgente `doctor_call` relacionada mediante
`escalatedFromTaskId`. Solo Médico o Super administrador pueden resolverla.

La asignación clínica busca Recepción/Marlen; el trabajo administrativo lo
atienden Recepción o Administración. El rol técnico `seguimiento` se retiró el
2026-08-02 y su trabajo pasó a Recepción. La guía completa vive en
[Tipos y resultados de seguimiento](../operations/follow-up-classification.md).

### Recordatorios Automatizados Y Supervisados

`SupervisedReminderRule` conserva una identidad estable y apunta a una
`SupervisedReminderRuleVersion` activa. Cada cambio crea otra versión; un
trigger bloquea `UPDATE` y `DELETE` sobre la historia. Dirección administra
reglas con `reminder_rules_manage` y Recepción revisa candidatos con
`reminders_review`.

`generateSupervisedReminderCandidates` consulta eventos compatibles:
`Visit.completedAt`, `TreatmentProposalOutcome` aceptado o
`VisitDiscontinuation`. La clave `regla:evento:origen` no contiene la versión,
por lo que una nueva plantilla no duplica el mismo trabajo. La fecha se ajusta
al horario y días permitidos en `America/La_Paz`.

Cada `SupervisedReminderCandidate` conserva la vista previa, regla exacta,
origen, canal, fecha, bloqueo, error y reintento. La generación no envía nada.
Al aprobar, el servidor vuelve a leer el consentimiento vigente y crea como
máximo una `FollowUpTask` mediante una relación única. El contacto y resultado
real continúan en `FollowUpAttempt`.

`SupervisedReminderReviewEvent` registra aprobación, bloqueo, descarte, fallo o
reintento como eventos append-only. La guía vive en
[Recordatorios automatizados y supervisados](../operations/supervised-reminders.md).

### Encuestas Y Reclamos

`PatientFeedbackRequest` conserva visita, responsable, canal, versión de
cuestionario y vencimiento. El token de 32 bytes se devuelve una sola vez; la
base guarda solamente SHA-256. Un índice parcial permite un único enlace
abierto por visita y rotarlo invalida el anterior.

La ruta pública usa una fachada mínima. No devuelve paciente, visita,
responsable, clasificación o notas y vive en un root layout sin analytics.
`PatientFeedback` guarda la respuesta append-only y posee relación única con
la visita para impedir respuestas duplicadas.

`classifyPatientFeedback` crea una `PatientFeedbackCase`: una señal de posible
riesgo en salud queda `clinical_safety/critical` con cuatro horas; un reclamo
común queda prioritario con 24 horas; una opinión que requiere revisión usa 48
horas. Una encuesta positiva sin comentario se cierra sin inventar un reclamo.

Dirección modifica la proyección del caso con `feedback_manage`. Cada cambio
de responsable, clasificación, estado, plazo o nota agrega un
`PatientFeedbackCaseEvent` append-only. Payload no participa. La guía vive en
[Encuestas, opiniones y reclamos](../operations/patient-feedback-complaints.md).

### Abandono, Bloqueo Y Pendientes

`VisitDiscontinuation` registra un único evento por visita con:

- `fromStatus` y `area`: punto exacto de salida;
- `reason`: motivo normalizado;
- `pendingTypes`: fotografía de consulta, estudio, aplicación, cobro, entrega
  o seguimiento todavía pendientes;
- `recordedById` y `occurredAt`: responsable y fecha;
- `followUpTaskId`: recuperación relacionada cuando existe.

`recordVisitDiscontinuation` usa una transacción serializable. Combina lo
seleccionado por el empleado con pendientes detectados en órdenes, estudios,
ventas, entregas y seguimientos. Después bloquea `VisitWorkItem` y
`ClinicalOrder` abiertos, cierra la ruta como `left_without_care`, crea el
evento y, si se solicitó y existe consentimiento vigente, crea una tarea
`treatment_recovery` para Recepción/Marlen.

El flujo general rechaza el valor heredado `left`; así ninguna acción puede
crear un abandono sin motivo. Los permisos `visit_discontinuations_read` y
`visit_discontinuations_write` separan revisión y operación. Dirección puede
leer `/sigeco/recepcion/abandonos`, pero solo las áreas operativas registran el
evento.

La guía completa vive en
[Abandono, bloqueo y pendientes](../operations/visit-discontinuations.md).

### Ventas E Inventario

`createSaleRecord` calcula subtotal, descuento, total, pago y saldo en servidor. Si existe un item inventariable, el descuento de stock ocurre dentro de la misma transaccion.

`InsufficientStockError` aborta la transaccion completa y conserva producto, existencia y cantidad solicitada para mostrar un error seguro en la UI. No se crea venta, pago ni movimiento de caja parcial.

## Permisos

| Rol | Modulos principales |
| --- | --- |
| `super_admin` | Todos. |
| `direccion` | Lectura de todos los modulos y reportes. |
| `recepcion` | Recepcion, pacientes, visitas y seguimientos. |
| `medico` | Recepcion lectura, consulta, enfermeria lectura y seguimientos. |
| `enfermeria` | Recepcion lectura, enfermeria y estudios. |
| `administracion` | Recepcion lectura, caja, seguimientos administrativos e inventario. |
| `seguimiento` | Pacientes lectura y seguimientos administrativos. |

`captacion` esta deprecado y solo conserva acceso base hasta que sus usuarios sean reasignados.

`users_manage` pertenece únicamente a `super_admin`. La administración completa
vive en `/sigeco/usuarios`; cada empleado gestiona contraseña y sesiones propias
en `/sigeco/mi-cuenta`. Las cuentas con `mustChangePassword` quedan limitadas a
`/sigeco/cambiar-contrasena` hasta completar el cambio.

La matriz completa y las reglas para páginas, actions, archivos, URLs, logs,
caché y secretos viven en
[Permisos, privacidad, logs y secretos](../operations/permissions-privacy-secrets.md).
Las pruebas enumeran cada página de datos y cada server action; Payload y
analytics tienen un límite automático que impide importar consultas clínicas.

### Adjuntos Clínicos

`ClinicalAttachment` conserva metadata, relaciones, checksum, estado de
cuarentena y responsable. El contenido usa un adapter separado:

- `.data/clinical-files` fuera de `public/` en local;
- Vercel Blob privado y exclusivo en staging o producción.

La ficha del paciente permite selección múltiple, cámara móvil, compresión JPG,
progreso y reintento idempotente. Ver y descargar requiere `attachments_read`
y una concesión de dos minutos y un solo uso enviada por `POST`. El token no
aparece en la URL y el contenido se verifica por SHA-256 antes de entregarse.

La operación completa vive en
[Adjuntos clínicos seguros](../operations/clinical-attachments.md).

### Versiones Y Firma Clínica

`ClinicalConsultation` conserva la proyección vigente y un contador
`revision`. `ClinicalConsultationVersion` guarda una fotografía inmutable desde
la aplicación por cada borrador, cierre o corrección.

El cierre registra `finalizedById` y `finalizedAt`. No representa una firma
criptográfica: identifica la cuenta autenticada que aprobó el contenido.

Cada escritura envía `expectedRevision`. La actualización usa esa revisión
como condición dentro de una transacción serializable; si otra pestaña cambió
primero, la segunda operación se rechaza.

Una corrección finalizada:

1. exige tipo y motivo;
2. crea otra versión;
3. actualiza la proyección vigente;
4. conserva las versiones anteriores;
5. no modifica recetas, órdenes, ventas, cobros ni aplicaciones.

El cierre de una visita consulta el estado clínico y rechaza `completed` si
existe una consulta en borrador. La operación se documenta en
[Correcciones, cierre y firma clínica](../operations/clinical-record-versioning.md).

### Sesiones, Egresos Y Cierre De Caja

`CashSession` delimita la jornada de una caja física. Una restricción parcial
impide otra sesión `open` o `pending_approval` para la misma sucursal y caja.
Cada cobro nuevo obtiene y bloquea la sesión abierta dentro de su transacción;
si no existe, ni el pago ni la venta con cobro inicial se confirman.

`CashMovement` conserva sesión, canal, tipo, usuario, autorización y referencia
al movimiento original. `CashExpense` separa los datos del egreso y
`CashExpenseBeneficiary` guarda las líneas individuales de una entrega grupal.
Las claves de idempotencia evitan duplicar aperturas, egresos y correcciones.

El cierre calcula el neto por efectivo, QR, tarjeta, transferencia y otros
medios. `CashSessionReconciliation` fotografía el esperado, reportado y la
diferencia. Las discrepancias superiores al límite configurable bloquean la
sesión hasta que Dirección aprueba.

PostgreSQL rechaza movimientos sobre una Caja no abierta y el borrado de
evidencia financiera. Las devoluciones y reintegros insertan movimientos
compensatorios. Los comprobantes de compra se validan y se guardan bajo un
prefijo separado del storage privado; su lectura compara SHA-256 antes de
servir el contenido.

La operación completa vive en
[Caja, egresos y cierre diario](../operations/cash-sessions-expenses-close.md).

### Catálogo De Productos Y Proveedores

`InventoryItem` conserva la ficha vigente, disponibilidad, precio de venta,
costo referencial y una revisión optimista. `InventoryItemCatalogVersion`
fotografía cada alta, edición, cambio de estado o cambio de proveedores.

`InventoryItemSupplier` permite varias alternativas y una restricción parcial
admite como máximo un proveedor preferido activo por producto. `Supplier`
conserva la ficha vigente y `SupplierVersion` su historial.

La base impide modificar el código interno, borrar productos, proveedores o
asociaciones y editar o borrar versiones. Los registros maestros se desactivan.
Los códigos, SKU y nombres de proveedor se comparan sin distinguir mayúsculas.

Administración modifica catálogo y proveedores; Dirección lee costos y
contactos; Médico y Enfermería solo ven disponibilidad activa. El selector de
ventas muestra productos activos aptos para venta y la transacción valida
nuevamente ese contrato antes de descontar stock.

El costo referencial pertenece a la ficha vigente. Los costos reales de compra
se guardan por línea y recepción para que una edición del catálogo no
reescriba el pasado.

La operación completa vive en
[Catálogo de productos y proveedores](../operations/product-catalog-suppliers.md).

### Compras, Recepciones, Lotes Y Stock

`Purchase` conserva la orden y su estado; `PurchaseLine` fotografía
descripción, unidad, cantidad y costo acordado. `PurchasePayment` enlaza cada
pago real con `CashSession` y `CashMovement`. Una compra a crédito no crea pago
y una compra urgente reutiliza el movimiento del egreso existente.

`PurchaseReceipt` conserva quién, cuándo, dónde y con qué documento recibió.
Cada `PurchaseReceiptLine` crea un `InventoryLot` y un único
`InventoryMovement` de entrada. Cantidades y constraints impiden recibir más
de lo pedido; claves de idempotencia y relaciones únicas impiden aplicar dos
veces la recepción.

Las salidas de venta distribuyen existencias por FEFO entre lotes vigentes.
`InventoryLotAdjustment` registra daño, merma, vencimiento, devolución o
corrección, con autorización de Dirección y movimiento compensatorio. Los
eventos financieros, recepciones, documentos, movimientos y ajustes son
append-only.

`PurchaseDocument` guarda metadata y SHA-256 en Prisma; el contenido usa
storage privado, autorización server-side y `no-store`. Payload no participa.

La operación completa vive en
[Compras, recepciones, lotes y stock](../operations/purchases-receipts-batches-stock.md).

### Recetas Y Comprobantes Versionados

`Prescription` conserva versión y referencia a la receta anterior.
`ClinicalProfessionalProfile` separa la identidad profesional confirmada de la
cuenta de acceso. `GeneratedDocument` guarda una fotografía JSON inmutable,
huella SHA-256 de la fuente, número, versión y relación con receta o venta.

La huella hace idempotente la emisión: la misma fuente devuelve la versión ya
existente; un cambio clínico o financiero crea la siguiente. Un trigger impide
`UPDATE` y `DELETE`. El PDF se construye desde la fotografía, nunca desde datos
que pudieron cambiar después.

El endpoint PDF determina el permiso por tipo, exige sesión, usa `no-store` y
audita descarga o reimpresión. Payload y el sitio público no acceden al módulo.

La operación y el gate productivo viven en
[Recetas y comprobantes versionados](../operations/versioned-prescriptions-receipts.md).

### Reporte Del Recorrido Completo

`Visit` es la unidad estable del reporte y conserva `branchCode`. El período se
ancla a `checkedInAt` en `America/La_Paz`. La consulta
`getPatientJourneyReport` carga una fila por visita y relaciona consulta,
decisión vigente, ventas no anuladas, seguimiento, abandono y atribución
principal.

`aggregatePatientJourney` es una función pura que rechaza identificadores de
visita duplicados. Separa visitas con compra, cantidad de ventas,
`totalCents`, `paidCents` y `balanceCents`. También calcula embudo, días con
cero actividad, fuentes y señales de calidad sin modificar registros.

La tabla reconciliable enlaza cada fila al registro de visita. Los totales se
calculan sobre todo el conjunto filtrado y la paginación solo afecta la
presentación.

Las fórmulas y exclusiones viven en
[Reporte del recorrido completo](../operations/patient-journey-report.md).

### Tiempo De Atención Por Área

`VisitAreaTimeEvent` conserva eventos append-only por
`PatientRouteStep`: entrada, inicio de atención, bloqueo, reanudación y salida.
`sequence` ordena transiciones concurrentes aun cuando compartan timestamp. Un
trigger PostgreSQL rechaza actualización y borrado.

La entrada y salida se agregan dentro de las mismas transacciones que mueven la
ruta. El inicio de atención es explícito: abrir una pantalla no demuestra que
el personal ya comenzó. `area_time_write` permite operar solamente al rol del
área actual; Dirección conserva lectura mediante `reports_read`.

`aggregateAreaTimeReport` reconstruye intervalos de espera, atención y bloqueo.
Calcula promedio, mediana, P75 y P90 sobre sesiones cerradas. Visitas
canceladas y `isTestData` quedan fuera; abandonos se conservan hasta la salida.
Los pasos anteriores se marcan `inferred` y no atribuyen fases que nunca fueron
registradas.

El reporte y las reglas operativas viven en
[Tiempo de atención por área](../operations/area-service-times.md).

### Consentimientos

`PatientConsent` registra eventos independientes para seguimiento,
recordatorios, educación, promociones e imagen/voz. Cada evento conserva texto,
versión, decisión, canales, fecha, forma de confirmación, responsable y
referencia al evento anterior. Un trigger rechaza edición y borrado.

Recepción registra la respuesta desde la ficha. Los métodos remotos de
Seguimiento se muestran y se validan en servidor según la decisión más
reciente. `Patient.followUpPreference` queda solo como compatibilidad histórica
y nunca concede un uso nuevo.

La guía operativa y el gate productivo viven en
[Consentimientos y preferencias de contacto](../operations/patient-consents.md).

## Actualización De Bandejas

Recepción, Consulta, Enfermería y Administración comparten una política de
polling con `router.refresh()`: 30 segundos en escritorio y 60 en móvil. La URL
permanece estable para conservar filtros, paginación y selección.

El polling se pausa cuando la pestaña está oculta, no existe conexión, ya hay
una solicitud activa o un formulario contiene cambios sin aplicar. Las
métricas técnicas permanecen en la sesión del navegador y no contienen datos
del paciente. La base de datos sigue siendo la fuente de verdad; SSE o
WebSocket solo se evaluarán con evidencia del piloto.

La operación se documenta en
[Actualización de bandejas operativas](../operations/operational-queue-refresh.md).

## Resiliencia Móvil Y Conectividad

`ConnectivityGuard` observa `navigator.onLine` y, cuando está disponible, la
calidad informada por Network Information. Un listener de captura impide
submits mientras el navegador está offline, sin vaciar o recargar el form. Al
reconectar no existe replay automático: operaciones monetarias y de stock
requieren revisión humana.

`Visit`, `Sale`, `Payment` e `InventoryMovement` agregan una clave única
opcional para no reescribir registros históricos. La UI nueva siempre envía un
UUID estable por formulario. Caja, compras, recepciones y lotes reutilizan las
claves incorporadas por las Tareas 18 y 20. Los queries consultan primero la
clave y devuelven el registro existente antes de ejecutar efectos asociados.

`sigeco.safe-draft.purchase.v1` es el único borrador local autorizado. Un
schema estricto acepta solo datos administrativos de la compra, vive en
`sessionStorage` y se elimina tras confirmación o logout. No se almacenan
pacientes, clínica ni archivos. Las rutas `/sigeco/*` continúan con
`private, no-store` y no se registra service worker.

La contingencia física se prepara desde `/sigeco/contingencia`; la hoja exige
número temporal, transcripción, ID definitivo y doble revisión de dinero o
stock. La operación completa vive en
[Móvil y conectividad lenta](../operations/mobile-slow-connectivity.md).

## Dashboard

`getReceptionDashboardSummary` calcula con rango diario local:

- Pacientes unicos por `patientId`.
- Rutas activas agrupadas por area.
- Abandonos por evento `VisitStatusHistory` ocurrido durante el dia.
- Ultimas ocho llegadas.

Seguimientos e inventario mantienen queries independientes y solo se ejecutan cuando el rol tiene permiso.

## Responsive

- Viewport base: 390px.
- El shell aisla overflow horizontal del documento.
- Las tablas anchas desplazan su contenido dentro de `overflow-x-auto`.
- Acciones y formularios usan columnas responsivas y controles tactiles.
- Marea esta scopeado por `.sigeco-app` y no altera sitio publico ni Payload.

## Pruebas

```bash
pnpm test
pnpm test:integration
```

La suite rapida cubre schemas, permisos, componentes y helpers. La suite de integracion reinicia exclusivamente `salud_intercultural_test`, aplica todas las migraciones y valida contratos transaccionales.

Contratos criticos cubiertos:

- Funnel de paciente nuevo y existente.
- Ruta flexible y bloqueo de reapertura.
- Consulta, enfermeria y estudios.
- Ventas, pagos y caja.
- Stock, rollback y alertas.
- Tipos, resultados, roles y escalamiento de seguimientos; dashboard.
- Motivo, punto de salida, bloqueo y pendientes de visitas interrumpidas.
- Auditoría append-only, usuarios, roles y sesiones.
- Adjuntos clínicos privados, idempotencia y acceso temporal.
- Detección normalizada, cola, alias y fusión transaccional de pacientes.
- Intervalos, pausas y protección de formularios en bandejas operativas.
- Validación del resultado, motivos permitidos y límite de permiso clínico.
- Borrador, cierre, corrección, comparación y concurrencia optimista de la
  consulta clínica.

## Deploy

```txt
develop -> staging -> main
```

Antes de promover:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm run build
```

Detener `next dev` antes de `next build`; ambos comparten `.next`. Las migraciones remotas se ejecutan por separado con `pnpm db:deploy` y backup previo.

## Trabajo Posterior

- Cierre remoto de CI y staging aislado.
- Endurecimiento adicional de permisos, privacidad, logs y secretos.
- Activación remota del backup coordinado y respuesta a incidentes. El
  simulacro local cifrado de base y adjuntos está documentado en
  [Backup y restauración de SIGECO](../operations/backup-restore.md).
- El runbook y la separación entre gate local y aprobación productiva están en
  [Respuesta a incidentes](../operations/incident-response.md). Dirección ya
  aprobó la implementación de la Tarea 8; la autorización de producción sigue
  separada y bloqueada.
- Multi-sucursal preparada localmente: El Alto activa, Cochabamba en
  preparación, selector validado, Caja y stock aislados, traslados enlazados y
  consolidado exclusivo de Dirección. Ver
  [Operación multi-sucursal](../operations/multi-branch-operations.md).

El orden técnico y funcional vigente vive en [Tasks de mejoras integrales](./sigeco-mejoras-integrales/tasks.md). Su estado se controla únicamente en [Progress](./sigeco-mejoras-integrales/progress.md).
