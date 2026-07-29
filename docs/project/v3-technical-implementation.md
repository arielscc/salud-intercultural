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

- CI, dependencias y staging aislado.
- Auditoria, usuarios, permisos y sesiones.
- Storage seguro para adjuntos clinicos.
- Backup, restauracion y respuesta a incidentes.
- Flujo operativo, Caja, compras, inventario, reportes y multi-sucursal.

El orden técnico y funcional vigente vive en [Tasks de mejoras integrales](./sigeco-mejoras-integrales/tasks.md). Su estado se controla únicamente en [Progress](./sigeco-mejoras-integrales/progress.md).
