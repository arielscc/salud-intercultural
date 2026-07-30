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
| Consentimientos | En progreso | Cinco finalidades, historial y bloqueo implementados localmente; producción espera aprobación expresa de textos. |
| Resultado de propuestas | En progreso | El médico registra la decisión; aceptación crea una instrucción, no una venta automática. |
| Clasificación de seguimientos | En progreso | Tipo, prioridad, responsable y resultado separados; llamadas médicas escaladas al médico. |
| Abandono y pendientes | En progreso | Punto, motivo, área y pendientes conservados; tareas abiertas quedan bloqueadas y recuperables. |
| Versiones y firma clínica | En progreso | Borrador, cierre, autor y correcciones comparables implementados en desarrollo local. |
| Compras y lotes | En progreso | Compra, pago, recepción parcial, costo histórico, lote y stock enlazados localmente. |

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
- Visitas activas, detalle, historial y ruta completa.
- “No continuará” con motivo obligatorio, pendientes persistentes y reporte
  por causa.
- Consentimientos separados por finalidad, canales, versión y forma de confirmación.

### Consentimientos Y Contacto

- Seguimiento, recordatorios, educación, promociones e imagen/voz son
  decisiones independientes.
- El retiro conserva el historial y bloquea nuevas llamadas o WhatsApp.
- La ficha permite demostrar el texto exacto aceptado.
- La preferencia antigua no se considera autorización.
- Producción permanece bloqueada hasta que Dirección apruebe expresamente la
  versión de textos configurada.

### Consulta

- Contexto de recepcion prellenado sin volver a pedir el motivo.
- Diagnosticos, hallazgos, plan, indicaciones, receta y evolucion.
- Borradores versionados y cierre con usuario, fecha y hora.
- Correcciones como nuevas versiones, con motivo e historial comparable.
- Una corrección no cambia órdenes, ventas ni aplicaciones relacionadas.
- Una visita con consulta en borrador no puede cerrarse como completada.
- Resultado append-only de la propuesta con motivo, médico, visita y fecha.
- Una aceptación crea una orden explícita para Administración; la venta y el
  pago se registran después.
- `Necesita tiempo` genera trabajo para Recepción/Marlen únicamente con
  consentimiento vigente.
- Ordenes para enfermeria, administracion o seguimiento.
- Salida flexible hacia enfermeria, administracion o cierre directo.

### Enfermeria Y Estudios

- Bandeja de tareas e indicaciones medicas.
- Signos vitales, aplicaciones, notas y estudios.
- Formularios colapsables segun el tipo de orden.
- Resultados visibles en consulta y ficha del paciente.

### Adjuntos Clínicos

- PDF e imágenes en storage privado separado de Payload.
- Relaciones con paciente, visita, estudio y usuario.
- Carga múltiple, cámara móvil, compresión JPG, progreso y reintento sin duplicar.
- Acceso temporal de un uso, checksum, cuarentena y auditoría.
- Eliminación de contenido reservada al super administrador.

### Administracion E Inventario

- Ventas, pagos, saldos y movimientos de caja.
- Productos inventariables y descuento transaccional de stock.
- Catálogo administrable con categoría, uso, precio, costo referencial,
  activación y versiones.
- Proveedores con contacto, asociaciones múltiples y uno preferido.
- Costos y contactos visibles por permisos; disponibilidad clínica sin costos.
- Rollback total y error visible cuando el stock es insuficiente.
- Entradas, ajustes autorizados y alertas de stock bajo.
- Compras en borrador y confirmadas, pagos reales y saldos a crédito.
- Recepciones parciales idempotentes con lotes, vencimientos y costos
  históricos.
- FEFO excluye vencidos; daños, mermas y devoluciones requieren autorización.

### Seguimiento

- Tareas vencidas, del dia y proximas.
- Tipos de evolución, retorno, recuperación de tratamiento, administrativo y
  llamada médica.
- Prioridad, responsable, vencimiento, relación clínica/administrativa y
  resultado visibles sin leer notas.
- `No responde` y `Reprogramado` conservan la tarea pendiente con nueva fecha.
- `Empeoró` o `Escalado al médico` crean una llamada médica urgente.
- Recepción/Marlen trabaja seguimientos clínicos; Comunicación/Yazmin solo
  gestiones administrativas.
- Advertencia cuando el paciente prefiere no recibir contacto.
- Llamadas y WhatsApp disponibles en móvil según consentimiento.

### Abandono Y Pendientes

- Abandono, cancelación y atención completada son cierres diferentes.
- El abandono conserva el estado y área donde se detuvo la visita.
- Motivo, usuario, fecha, nota y pendientes quedan registrados.
- Tareas y órdenes abiertas pasan a bloqueadas; no desaparecen ni se presentan
  como terminadas.
- El seguimiento de recuperación solo se crea con consentimiento vigente y se
  asigna a Recepción/Marlen.
- Recepción, Médico, Enfermería y Administración pueden usar “No continuará”.
- Dirección dispone de un reporte por motivo, fecha y pendiente.

### Dashboard

- Pacientes unicos del dia.
- Visitas activas totales y por area.
- Abandonos ocurridos durante el dia.
- Seguimientos de hoy y vencidos.
- Stock bajo y ultimas llegadas.

### Captación Y Atribución

- Fuente original del paciente conservada sin reescritura.
- Fuente principal y canales de apoyo históricos por cada visita.
- Facebook se pregunta de forma general.
- Cuenta social, campaña y tráfico orgánico o pagado solo se completan mediante
  códigos verificables.
- Reporte agregado por fecha, ciudad y departamento con llegadas, propuestas,
  ventas e ingresos cobrados.
- Catálogo administrable por Dirección y super administrador.

## Mapa De Rutas Vigente

| Ruta | Proposito |
| --- | --- |
| `/sigeco/login` | Login interno. |
| `/sigeco` | Dashboard operativo. |
| `/sigeco/recepcion` | Llegadas activas y padron de pacientes. |
| `/sigeco/recepcion/nuevo` | Funnel de llegada. |
| `/sigeco/recepcion/duplicados` | Cola de posibles fichas duplicadas. |
| `/sigeco/recepcion/duplicados/[candidateId]` | Comparación y simulación de fusión. |
| `/sigeco/recepcion/abandonos` | Reporte de abandono, punto de salida y pendientes. |
| `/sigeco/recepcion/pacientes/[id]` | Ficha y edicion del paciente. |
| `/sigeco/recepcion/visitas/[id]` | Ruta e historial de la visita. |
| `/sigeco/consultas` | Bandeja y atencion medica. |
| `/sigeco/enfermeria` | Tareas, signos, aplicaciones y estudios. |
| `/sigeco/administracion` | Ventas, cobros y pendientes. |
| `/sigeco/seguimientos` | Tareas de contacto posterior. |
| `/sigeco/inventario` | Productos, stock, entradas y ajustes. |
| `/sigeco/inventario/lotes` | Lotes, vencimientos, FEFO y ajustes autorizados. |
| `/sigeco/compras` | Compras, pagos, recepciones y trazabilidad de stock. |
| `/sigeco/atribucion` | Comparación de fuentes, cuentas, ventas e ingresos. |

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
2. Activación remota del backup coordinado y simulacro de restauración; el
   procedimiento cifrado ya está probado localmente con base y adjuntos.
3. Cierre remoto de la auditoría de privacidad y permisos con casos negativos.
4. Verificación del Blob Store clínico privado en staging.
5. Cierre de las evidencias remotas que el gate de seguridad mantiene
   bloqueadas. Dirección ya aprobó el runbook y el funcionamiento del gate; esa
   decisión no autoriza producción.

### Operacion

1. Validación acumulada en staging del polling controlado de bandejas y de la
   detección y fusión segura de pacientes.
2. Medición del piloto de bandejas antes de evaluar SSE o WebSocket.
3. Validación acumulada en staging de recetas, comprobantes y reporte del
   recorrido completo ya implementados localmente.
4. Reglas aprobadas para automatizar seguimientos.
5. Validación acumulada del flujo de compras, recepciones y lotes en staging.
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
5. Cerrar integración y QA acumulados de las Tareas 9-15 y continuar con la
   Tarea 16 de [tasks.md](./sigeco-mejoras-integrales/tasks.md).
