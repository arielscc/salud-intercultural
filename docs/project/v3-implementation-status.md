# Estado De Implementacion V3

Estado consolidado de Sigeco, el sistema interno clinico y operativo de Salud Intercultural.

## Estado Actual

**V3.7 Simplificacion Sigeco esta implementada y validada localmente.** Las diez tareas de la fase estan cerradas: modelo aditivo, funnel de recepcion, retiro de la UI de leads, modulo Recepcion unificado, rol seguimiento, flujo flexible, edicion de paciente, consulta prellenada, dashboard operativo y QA/documentacion final.

| Area | Estado | Resultado actual |
| --- | --- | --- |
| Sitio publico | Estable | Paginas publicas, SEO, analytics y formulario de contacto. |
| Payload CMS | Estable | Contenido editorial, media, servicios, equipo, testimonios y FAQs. |
| Sigeco V3.7 | Implementado localmente | Operacion clinica y administrativa centrada en paciente y visita. |
| Sistema visual Marea | Implementado | Shell responsive, tablas de trabajo y tokens aislados del sitio publico. |
| QA final V3.7 | Completado localmente | Matriz de roles, flujo de abandono, 17 pantallas activas a 390px, sitio publico y CMS. |
| Publicacion remota | Pendiente | Requiere promocion controlada `develop -> staging -> main`. |

## Fuentes Canonicas

1. [Documento de Negocio V3.0](../masters/Documento_de_Negocio_V3_0.md).
2. [Implementacion Tecnica V3.7](./v3-technical-implementation.md).
3. [Ownership de datos](../architecture/data-ownership.md).
4. [Plan de simplificacion](./sigeco-simplificacion/tareas-de-simplificacion.md) y [progreso](./sigeco-simplificacion/progreso-de-simplificacion.md).
5. [Prueba del flujo completo](../operations/sigeco-v3-full-flow-testing.md).
6. [Reportes por tarea](./task-reports/).
7. [Tasks de mejoras integrales](./sigeco-mejoras-integrales/tasks.md) y [progreso](./sigeco-mejoras-integrales/progress.md).

## Flujo Operativo Vigente

```txt
Recepcion busca o registra al paciente
  -> funnel corto y visita abierta
  -> consulta medica con contexto prellenado
  -> enfermeria, administracion o salida directa
  -> cierre, abandono trazado o seguimiento
  -> nueva visita sobre la misma ficha
```

El flujo no es lineal. Una visita puede cerrarse o registrar abandono desde cualquier area activa. Una visita cerrada no puede reabrirse ni derivarse de nuevo.

## Resultado Funcional

### Acceso Y Permisos

- Autenticacion interna separada de Payload.
- Roles activos: `super_admin`, `direccion`, `recepcion`, `medico`, `enfermeria`, `administracion` y `seguimiento`.
- Navegacion y acciones filtradas por permisos server-side.
- `captacion` permanece deprecado en base de datos para migrar usuarios existentes, sin modulos operativos.

### Recepcion

- Busqueda por nombre, telefono o codigo.
- Funnel de cuatro pasos con solo nombre, telefono y motivo obligatorios.
- Creacion o actualizacion de paciente y apertura de visita en una transaccion.
- Padron de pacientes, ficha permanente y edicion.
- Visitas activas, detalle, historial, ruta y abandono en un toque.

### Consulta

- Contexto de recepcion prellenado sin volver a pedir el motivo.
- Diagnosticos, hallazgos, plan, indicaciones, receta y evolucion.
- Ordenes para enfermeria, administracion o seguimiento.
- Salida flexible hacia enfermeria, administracion o cierre directo.

### Enfermeria Y Estudios

- Bandeja de tareas e indicaciones medicas.
- Signos vitales, aplicaciones, notas y estudios.
- Formularios colapsables segun el tipo de orden.
- Resultados visibles en consulta y ficha del paciente.

### Administracion E Inventario

- Ventas, pagos, saldos y movimientos de caja.
- Productos inventariables y descuento transaccional de stock.
- Rollback total y error visible cuando el stock es insuficiente.
- Entradas, ajustes autorizados y alertas de stock bajo.

### Seguimiento

- Tareas vencidas, del dia y proximas.
- Registro de llamadas, WhatsApp y resultados.
- Advertencia cuando el paciente prefiere no recibir contacto.
- Acceso compartido por recepcion y el rol dedicado de seguimiento.

### Dashboard

- Pacientes unicos del dia.
- Visitas activas totales y por area.
- Abandonos ocurridos durante el dia.
- Seguimientos de hoy y vencidos.
- Stock bajo y ultimas llegadas.

## Mapa De Rutas Vigente

| Ruta | Proposito |
| --- | --- |
| `/sigeco/login` | Login interno. |
| `/sigeco` | Dashboard operativo. |
| `/sigeco/recepcion` | Llegadas activas y padron de pacientes. |
| `/sigeco/recepcion/nuevo` | Funnel de llegada. |
| `/sigeco/recepcion/pacientes/[id]` | Ficha y edicion del paciente. |
| `/sigeco/recepcion/visitas/[id]` | Ruta e historial de la visita. |
| `/sigeco/consultas` | Bandeja y atencion medica. |
| `/sigeco/enfermeria` | Tareas, signos, aplicaciones y estudios. |
| `/sigeco/administracion` | Ventas, cobros y pendientes. |
| `/sigeco/seguimientos` | Tareas de contacto posterior. |
| `/sigeco/inventario` | Productos, stock, entradas y ajustes. |

Las rutas antiguas de pacientes y visitas solo existen como redirects de compatibilidad hacia Recepcion. El modulo interno de leads fue retirado; sus modelos y datos historicos permanecen sin UI.

## Validacion Tecnica De Cierre

Comandos requeridos:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm run build
```

Baseline V3.7:

- Suite rapida: 20 archivos, 69 tests.
- Suite de integracion: 10 archivos, 21 tests.
- Migraciones reproducibles hasta `20260710000000_v3_7_simplification`.
- Build de produccion Next.js validado desde un arbol limpio, con `next dev` detenido.

## QA Final V3.7

- Roles verificados: recepcion, seguimiento, medico, enfermeria, administracion y direccion.
- Accesos directos no autorizados redirigen al dashboard.
- Flujo real verificado: funnel minimo, visita activa, abandono en recepcion, salida de bandeja e historial persistente.
- Una visita cerrada no muestra acciones y la base bloquea su reapertura.
- Las 17 pantallas activas de Sigeco fueron recorridas a 390x844.
- Corregido el overflow horizontal de la tabla de Recepcion; el scroll queda dentro de la tabla.
- Las 10 rutas publicas cargan en 390x844 y 1440x900 sin scroll horizontal.
- Payload CMS conserva `/admin/login` y carga su formulario.

## Pendientes Posteriores

Estos pendientes fueron convertidos en tareas consecutivas dentro de [Tasks de mejoras integrales](./sigeco-mejoras-integrales/tasks.md). Esta sección resume el baseline V3.7; no debe usarse como un backlog separado.

### Bloqueantes Para Uso Clinico Amplio

1. Auditoria append-only de cambios clinicos, financieros, inventario, permisos y ruta.
2. Storage seguro con acceso, retencion y trazabilidad para adjuntos clinicos.
3. Auditoria formal de privacidad y permisos con casos negativos.
4. Procedimiento probado de backup, restauracion y respuesta a incidentes.
5. Politica operativa de sesiones, secretos y accesos no autorizados.

### Operacion

1. Realtime o polling formal para las bandejas entre areas.
2. Deteccion de telefono duplicado al editar pacientes.
3. Formatos imprimibles de receta y comprobante, si la clinica los requiere.
4. Reglas aprobadas para automatizar seguimientos.
5. Flujo de proveedores y compras.
6. Reasignacion de usuarios `captacion` en cada ambiente.

### Plataforma

1. Implementar [GitHub Actions](./github-actions-implementation-plan.md).
2. Resolver vulnerabilidades altas de dependencias.
3. Definir umbrales de cobertura para modulos criticos.
4. Preparar staging aislado y ejecutar la promocion completa.

## Siguiente Orden Recomendado

El orden anterior fue reemplazado por la numeración vigente:

1. Tarea 1: CI y control de dependencias.
2. Tarea 2: staging aislado.
3. Tarea 3: auditoria append-only.
4. Tareas 4-8: accesos, privacidad, adjuntos, recuperacion e incidentes.
5. Continuar secuencialmente desde la Tarea 9 de [tasks.md](./sigeco-mejoras-integrales/tasks.md).
