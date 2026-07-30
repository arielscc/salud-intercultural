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

### Prisma

- Usuarios y sesiones internas.
- Pacientes, visitas, rutas y tareas entre areas.
- Consulta, diagnosticos, recetas y evoluciones.
- Enfermeria, estudios y adjuntos modelados.
- Ventas, pagos, caja e inventario.
- Seguimientos e historial operativo.

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
| `administracion` | Recepcion lectura, caja, seguimientos e inventario. |
| `seguimiento` | Pacientes lectura y seguimientos. |

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
- Seguimientos y dashboard.
- Auditoría append-only, usuarios, roles y sesiones.
- Adjuntos clínicos privados, idempotencia y acceso temporal.

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
- Flujo operativo, Caja, compras, inventario, reportes y multi-sucursal.

El orden técnico y funcional vigente vive en [Tasks de mejoras integrales](./sigeco-mejoras-integrales/tasks.md). Su estado se controla únicamente en [Progress](./sigeco-mejoras-integrales/progress.md).
