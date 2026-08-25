# Tasks — Lanzamiento Por Etapas De SIGECO

Estado: plan creado el 2026-08-24 por decisión de Dirección para salir a
producción de forma controlada, módulo por módulo.

Este plan no construye funcionalidad clínica nueva: casi todo SIGECO ya está
implementado localmente. Lo que resuelve es **cómo se enciende**. Introduce la
activación de módulos desde el super administrador, completa lo que falta para
que Administración y Caja funcionen solas, y cierra los pendientes de
plataforma que hoy bloquean cualquier salida a producción.

La numeración representa el orden recomendado de implementación: la Tarea 1 se
realiza primero y la Tarea 20 cierra el plan.

Control de avance: [progress.md](./progress.md)

## Fuentes Utilizadas

### Documentación funcional

- [Documento de Negocio V3.0](../../masters/Documento_de_Negocio_V3_0.md)
- [Estado de implementación V3](../v3-implementation-status.md)
- [Tasks de mejoras integrales](../sigeco-mejoras-integrales/tasks.md) y su [progreso](../sigeco-mejoras-integrales/progress.md)
- [Tasks del dashboard del médico](../sigeco-medico-dashboard/tasks.md) y su [progreso](../sigeco-medico-dashboard/progress.md)

### Documentación técnica

- [Implementación técnica V3.7](../v3-technical-implementation.md)
- [Plan de GitHub Actions](../github-actions-implementation-plan.md)
- [Staging aislado](../../operations/staging.md)
- [Deploy](../../operations/deploy.md) y [flujo de ramas](../../operations/branch-flow.md)
- [Backup y restauración](../../operations/backup-restore.md)
- [Respuesta a incidentes](../../operations/incident-response.md)
- [Usuarios, roles y sesiones](../../operations/internal-users-sessions.md)
- [Permisos, privacidad, logs y secretos](../../operations/permissions-privacy-secrets.md)
- [Auditoría append-only](../../operations/audit-events.md)
- [Caja, egresos y cierre diario](../../operations/cash-sessions-expenses-close.md)

### Implementación actual

- [Permisos por rol](../../../src/features/internal-auth/permissions.ts)
- [Guardas de sesión y permiso](../../../src/modules/permissions/index.ts)
- [Acciones auditadas](../../../src/modules/audit/)
- [Ítems de navegación](../../../src/components/internal/nav-items.ts)
- [Navegación desktop](../../../src/components/internal/DesktopSidebarNav.tsx) y [móvil](../../../src/components/internal/SidebarNav.tsx)
- [Layout de SIGECO](../../../src/app/(internal)/sigeco/(app)/layout.tsx)
- [Contexto de sucursal](../../../src/features/branches/context.ts)
- [Queries de ventas y cobros](../../../src/modules/database/queries/sales.ts)
- [Queries de Caja](../../../src/modules/database/queries/cash.ts)
- [Alta de pacientes y llegada](../../../src/modules/database/queries/reception.ts)
- [Modelo Prisma](../../../prisma/schema.prisma)

## Qué Existe Actualmente

SIGECO tiene implementación local completa de recepción, consulta, enfermería,
administración, Caja, inventario, compras, seguimientos, opiniones, reportes y
multi-sucursal. Lo que **no** existe es una forma de exponer solo una parte del
sistema al personal.

Puntos de apoyo que este plan aprovecha:

- `requirePermission` es la única guarda de página y `runAuditedAction` la única
  guarda de acción sensible. Interceptar esos dos puntos alcanza para cubrir las
  50 páginas y las 126 acciones auditadas del sistema.
- La navegación se arma desde `sigecoNavItems` y se filtra en dos componentes.
- El rol `administracion` ya tiene los permisos de venta, cobro, Caja,
  inventario, compras y catálogo.
- `Sale` y `Payment` aceptan `visitId` nulo: una venta puede existir sin visita.
- `CashSession`, `InventoryItem`, `Purchase` y `GeneratedDocument` no dependen de
  la ruta clínica.

Limitaciones reales que este plan resuelve:

- `Sale.patientId` y `Payment.patientId` son obligatorios y el único alta de
  paciente es el funnel de Recepción, que abre visita, ruta y tarea.
- La bandeja de Administración se alimenta solo de `VisitWorkItem` derivados por
  el médico; no hay un punto de entrada propio para una venta de mostrador.
- No existe un listado de ventas, solo el detalle de una venta concreta.

## Decisiones De Dirección (2026-08-24)

1. **Se lanza por etapas.** La primera etapa es Administración y Caja, sin
   módulos clínicos.
2. **La activación es una función del producto**, controlada desde el super
   administrador, no un cambio de despliegue ni una variable de entorno.
3. **La activación es global**, no por sucursal. Agregar la dimensión sucursal
   más adelante será una migración aditiva.
4. **Un módulo activo se puede apagar** con motivo obligatorio y auditoría. El
   apagado oculta el módulo y bloquea escrituras nuevas; conserva los datos y el
   trabajo abierto, visible en solo lectura para Dirección.
5. **Solo el super administrador activa o desactiva.** Dirección ve estado e
   historial.
6. **Las dependencias entre módulos son duras:** no se activa Enfermería sin
   Consulta, ni Consulta sin Recepción.
7. **En la Etapa 1 se cobra a un cliente identificado**, dado de alta con un
   formulario mínimo desde Administración, sin abrir visita.
8. **El comprobante de la Etapa 1 es el recibo interno vigente.** La facturación
   fiscal no forma parte de este plan.
9. **La Etapa 1 sale a producción real**, no a una PC local.

## Catálogo De Módulos

| Módulo | Nombre visible | Cubre | Depende de |
| --- | --- | --- | --- |
| `core` | Núcleo | Inicio, mi cuenta, usuarios, auditoría, sucursales, configuración de documentos | Siempre activo |
| `administracion` | Caja y Administración | Ventas, cobros, pagos, Caja, egresos, cierre, recibos | `core` |
| `inventario` | Inventario | Productos, proveedores, stock, lotes, ajustes, traslados | `core` |
| `compras` | Compras | Órdenes, pagos a proveedor, recepciones | `inventario` |
| `catalogo` | Catálogo | Servicios, tratamientos y estudios vendibles | `core` |
| `recepcion` | Recepción | Llegadas, ficha del paciente, visitas, duplicados, consentimientos, abandono | `core` |
| `consulta` | Consulta médica | Consulta, catálogos clínicos, pedido del médico, propuestas, recetas | `recepcion` |
| `enfermeria` | Enfermería | Tareas, signos, aplicaciones, estudios, sesiones de servicio | `consulta` |
| `seguimientos` | Seguimiento | Tareas de contacto y recordatorios supervisados | `recepcion` |
| `opiniones` | Opiniones | Encuestas, reclamos y casos | `recepcion` |
| `reportes` | Reportes | Recorrido completo, tiempos por área, captación | `recepcion` |

El catálogo y las dependencias viven en código, versionados. La base de datos
solo guarda el **estado** de cada módulo y su historial.

## Etapas De Lanzamiento

| Etapa | Módulos que se activan | Resultado |
| --- | --- | --- |
| 1 | `administracion`, `inventario`, `compras`, `catalogo` | Administración vende, cobra, emite recibo, maneja stock y compras, abre y cierra Caja. |
| 2 | `recepcion` | Se registran llegadas y fichas; las ventas empiezan a colgar de una visita. |
| 3 | `consulta`, luego `enfermeria` | Flujo clínico completo; la bandeja de Administración se alimenta de derivaciones. |
| 4 | `seguimientos`, `opiniones`, `reportes` | Contacto posterior, calidad y medición. |

Cada etapa se activa cuando la anterior está estable. Nada de lo construido en
una etapa se descarta en la siguiente: la venta de mostrador convive con la
venta derivada de una visita.

## Responsabilidades Que El Sistema Debe Respetar

- **Super administrador:** activa y desactiva módulos, con motivo y auditoría.
  No reemplaza autorizaciones de Dirección sobre la operación.
- **Dirección:** decide cuándo se lanza cada etapa, revisa estado e historial de
  activación y los indicadores del módulo lanzado.
- **Administración:** en la Etapa 1 registra clientes, vende, cobra, emite el
  recibo, registra egresos, maneja stock y compras, y cierra Caja.
- **Recepción, Médico y Enfermería:** entran en las etapas 2 y 3; hasta entonces
  no deben ver módulos incompletos.

## Reglas Para Todas Las Tareas

1. Un módulo apagado **oculta y bloquea**, nunca borra. Los datos, ventas,
   pagos, historia y adjuntos se conservan intactos.
2. El bloqueo por módulo se valida **en servidor** para páginas, queries,
   acciones, archivos y exportaciones. Ocultar el enlace no es un control.
3. El bloqueo por módulo es **distinto** de la falta de permiso: mensajes,
   redirecciones y auditoría deben poder diferenciarlos.
4. Activar y desactivar genera auditoría append-only con usuario, fecha, motivo
   y estado anterior.
5. Las migraciones son aditivas y se prueban desde una base vacía y una copia
   restaurada.
6. No se debilita ningún permiso existente. El módulo es una condición
   adicional, nunca un atajo.
7. Dinero en centavos, calculado en servidor; fechas operativas en
   `America/La_Paz`.
8. Idempotencia en pagos, ventas, egresos y movimientos de stock.
9. Validar UI en 390, 768, 1024, 1280 y 1440 px.
10. Todo formulario muestra guardando, guardado o error; nunca confirma antes de
    la respuesta del servidor.
11. Cada tarea actualiza [progress.md](./progress.md) y agrega su reporte en
    [task-reports](../task-reports/).
12. Cada tarea incluye pruebas unitarias, integración cuando toca datos, casos
    negativos por rol y por módulo apagado, lint, tipos, build y QA aplicables.
    Siguen siendo requisitos del gate de cierre; el modo de ejecución vigente
    define cuándo se corren.

## Modo De Ejecución Vigente

Se mantiene la decisión del 2026-08-02: durante la implementación de cada tarea
solo se ejecutan `pnpm lint` y `pnpm typecheck`. QA de navegador, pruebas y
build se ejecutan en el cierre acumulado.

**Excepción de este plan:** las Tareas 11 a 15 son el cierre acumulado. Ahí sí
se ejecutan pruebas, integración, build, QA y los simulacros completos. Ninguna
tarea de la Fase A o B pasa a `Terminada` antes de ese cierre.

---

## Fase A — Activación Controlada De Módulos

## Tarea 1 — Catálogo De Módulos Y Mapa De Permisos

**Prioridad:** P0. **Responsable:** Plataforma. **Dependencias:** ninguna.

**Objetivo:** declarar en código qué módulos existen, qué dependencias tienen y
qué permiso pertenece a cuál, sin tocar todavía la base ni la UI.

**Alcance:**

- Tipo `SigecoModuleCode` y catálogo con nombre visible, descripción corta,
  dependencias duras y orden de presentación.
- Mapa `permission -> módulos que la habilitan`. Un permiso compartido entre
  módulos (por ejemplo `patients_read`, que usan Recepción y Administración)
  declara todos los módulos que lo habilitan; basta uno activo.
- Los permisos del núcleo (`internal_access`, `users_manage`, `audit_read`,
  `documents_configure`) pertenecen a `core` y nunca se bloquean.
- Helpers puros y aptos para cliente: `moduleIsActive`, `permissionIsEnabled` y
  `resolveActivationBlockers` (qué dependencia falta para activar un módulo).
- Prueba de cobertura: todo valor de `InternalPermission` está mapeado a al
  menos un módulo. Un permiso nuevo sin mapear falla la prueba.

**Criterios de aceptación:**

- El catálogo declara los once módulos y sus dependencias.
- Ningún permiso queda sin módulo.
- Los helpers no importan Prisma ni `server-only`.

**Commit sugerido:** `feat(sigeco): declare module catalog and permission map`

## Tarea 2 — Estado De Activación Y Su Historial

**Prioridad:** P0. **Responsable:** Plataforma. **Dependencias:** Tarea 1.

**Objetivo:** persistir qué módulos están activos y conservar cada cambio.

**Alcance:**

- Modelo `ModuleActivation`: código del módulo, estado, `activatedAt`,
  `activatedById`, `deactivatedAt`, `deactivatedById`, `note`.
- Modelo `ModuleActivationEvent` append-only: módulo, estado anterior, estado
  nuevo, motivo, usuario, fecha. Sin update ni delete, como `AuditEvent`.
- Migración aditiva que crea las filas de los once módulos. `core` queda activo;
  el resto inactivo. Una base existente no cambia de comportamiento hasta que se
  active un módulo.
- Query `getActiveModules()` cacheada por request y `getModuleActivationHistory`.
- Un módulo del catálogo sin fila en base se trata como inactivo, nunca como
  activo por omisión.

**Criterios de aceptación:**

- La migración corre desde una base vacía y desde una copia restaurada.
- El historial no admite update ni delete.
- `getActiveModules()` devuelve `core` en una base recién migrada.

**Commit sugerido:** `feat(sigeco): persist module activation state and history`

## Tarea 3 — Gate De Módulos En Servidor

**Prioridad:** P0. **Responsable:** Plataforma. **Dependencias:** Tareas 1-2.

**Objetivo:** que una página o acción de un módulo apagado no se pueda ejecutar,
aunque se conozca la URL.

**Alcance:**

- `requirePermission` verifica también que algún módulo que habilita ese permiso
  esté activo. Si no, redirige al inicio con un aviso de módulo no disponible,
  distinto del aviso de permiso denegado.
- `runAuditedAction` aplica la misma verificación antes de ejecutar y registra el
  rechazo como `module.disabled` con el módulo y la acción intentada.
- `requireModule(code)` para rutas que pertenecen a un módulo concreto aunque
  compartan permiso con otro.
- Las cuatro acciones que llaman `requirePermission` directamente quedan
  cubiertas por el mismo cambio.
- El super administrador **no** evade el gate: un módulo apagado está apagado
  para todos. Lo que puede hacer es encenderlo.

**Criterios de aceptación:**

- Con `recepcion` apagado, `/sigeco/recepcion` redirige al inicio y la acción de
  llegada es rechazada y auditada.
- El rechazo por módulo se distingue del rechazo por permiso en la auditoría.
- Ninguna página existente cambia de comportamiento con todos los módulos
  activos.

**Commit sugerido:** `feat(sigeco): enforce module gate on pages and actions`

## Tarea 4 — Navegación E Inicio Según Módulos Activos

**Prioridad:** P0. **Responsable:** Plataforma. **Dependencias:** Tarea 3.

**Objetivo:** que el personal solo vea lo que está lanzado.

**Alcance:**

- Cada `SigecoNavItem` declara su módulo; la navegación filtra por permiso **y**
  módulo activo, en desktop y en móvil.
- El layout de `(app)` lee los módulos activos una vez y los provee al shell,
  igual que hoy hace con el contexto de sucursal.
- El dashboard de inicio muestra únicamente las tarjetas de módulos activos y no
  ejecuta las queries de los apagados.
- Enlaces cruzados entre módulos (por ejemplo, de una venta hacia la visita) se
  ocultan cuando el módulo destino está apagado.

**Criterios de aceptación:**

- En Etapa 1 la navegación muestra Caja, Inventario, Compras, Catálogo y las
  entradas del núcleo; nada clínico.
- El inicio no muestra indicadores vacíos de módulos apagados.
- No queda ningún enlace que lleve a una pantalla bloqueada.

**Commit sugerido:** `feat(sigeco): filter navigation by active modules`

## Tarea 5 — Pantalla De Activación Del Super Administrador

**Prioridad:** P0. **Responsable:** Super administrador. **Dependencias:** Tareas 3-4.

**Objetivo:** activar y desactivar módulos desde la interfaz, con control y
evidencia.

**Alcance:**

- Ruta `/sigeco/modulos`, permiso nuevo `modules_manage`, exclusivo de
  `super_admin`. Dirección accede en solo lectura con `modules_read`.
- Lista de módulos con estado, dependencias, qué habilita y desde cuándo.
- Activar exige confirmación y bloquea cuando falta una dependencia, explicando
  cuál. Desactivar exige **motivo obligatorio**.
- Historial visible por módulo: quién, cuándo, motivo y estado anterior.
- Aviso en el shell cuando hay un módulo apagado por incidente, visible solo
  para Dirección y super administrador.

**Criterios de aceptación:**

- Activar `enfermeria` con `consulta` apagada es rechazado con el motivo exacto.
- Desactivar sin motivo es rechazado.
- Un usuario de otro rol que abre `/sigeco/modulos` es redirigido y auditado.

**Commit sugerido:** `feat(sigeco): add module activation screen for super admin`

## Tarea 6 — Modo Solo Lectura Del Módulo Apagado

**Prioridad:** P1. **Responsable:** Plataforma. **Dependencias:** Tarea 5.

**Objetivo:** que apagar un módulo no esconda el trabajo a medias.

**Alcance:**

- Un módulo apagado bloquea toda escritura nueva y conserva la lectura para
  Dirección y super administrador, con un aviso permanente de módulo suspendido.
- El trabajo abierto al momento del apagado (visitas activas, tareas, ventas con
  saldo) queda listado en una vista de pendientes del módulo suspendido.
- Reactivar un módulo no reabre nada por su cuenta: el trabajo pendiente vuelve
  a estar disponible tal como quedó.
- Documentar el procedimiento en `docs/operations/`.

**Criterios de aceptación:**

- Con un módulo apagado, Dirección ve sus pendientes y nadie puede escribir.
- Apagar y reactivar no altera ningún registro.
- El procedimiento queda documentado como respuesta operativa, no como
  improvisación.

**Commit sugerido:** `feat(sigeco): keep disabled modules readable for direccion`

---

## Fase B — Etapa 1: Caja Y Administración

## Tarea 7 — Alta Mínima De Cliente Desde Administración

**Prioridad:** P0. **Responsable:** Administración. **Dependencias:** Tarea 4.

**Objetivo:** poder cobrarle a alguien sin abrir una visita ni depender de
Recepción.

**Alcance:**

- Formulario corto: nombre completo y teléfono obligatorios; documento y
  observación opcionales. Crea `Patient` **sin** `Visit`, `PatientRoute` ni
  `VisitWorkItem`.
- Permisos `patients_create` y `patients_update` agregados al rol
  `administracion` (hoy solo tiene `patients_read`).
- Reutiliza la detección de duplicados existente: si hay coincidencia por
  teléfono o nombre, se ofrece la ficha encontrada antes de crear otra.
- La ficha creada así es una ficha normal: cuando se active Recepción admite
  visitas sin duplicarse ni migrarse.
- Auditoría de la creación con origen `administracion`.

**Criterios de aceptación:**

- Administración crea un cliente y le cobra en la misma sesión, sin visita.
- Un teléfono ya registrado ofrece la ficha existente en lugar de duplicarla.
- Con `recepcion` activo, la misma ficha recibe una llegada normal.

**Commit sugerido:** `feat(sigeco): let administration register walk-in clients`

## Tarea 8 — Venta Directa Sin Visita

**Prioridad:** P0. **Responsable:** Administración. **Dependencias:** Tarea 7.

**Objetivo:** que Administración inicie una venta por su cuenta, sin esperar la
derivación de un médico.

**Alcance:**

- Acción "Nueva venta" en `/sigeco/administracion`: buscar cliente o crearlo,
  armar líneas desde el catálogo, el inventario o texto libre, aplicar descuento
  dentro del tope vigente y cobrar.
- Reutiliza `createSaleOrderAction` con `visitId` y `workItemId` vacíos,
  `AdministrationChargeDialog` y `createPaymentAction`. No se duplica lógica de
  venta ni de Caja.
- Exige Caja abierta, igual que cualquier cobro. Idempotente por clave de
  operación.
- Descuenta stock cuando la línea es un producto inventariable, con el rollback
  actual si no alcanza.
- Emite el recibo interno desde el detalle de la venta.

**Criterios de aceptación:**

- Una venta de mostrador queda registrada con líneas, cobro, movimiento de Caja
  y recibo, sin visita asociada.
- Sin Caja abierta el cobro se rechaza con el mensaje vigente.
- Reintentar el envío no duplica la venta ni el pago.

**Commit sugerido:** `feat(sigeco): create counter sales without a visit`

## Tarea 9 — Listado Y Búsqueda De Ventas

**Prioridad:** P1. **Responsable:** Administración. **Dependencias:** Tarea 8.

**Objetivo:** encontrar una venta anterior sin conocer su identificador.

**Alcance:**

- Ruta `/sigeco/administracion/ventas` con filtros por fecha, estado
  (pendiente, con saldo, pagada) y cliente, y búsqueda por nombre o teléfono.
- Columnas: fecha, cliente, conceptos resumidos, total, saldo, estado y quién
  registró. Enlace al detalle vigente.
- Reutiliza `getSalesSummary` y las queries existentes; agrega solo la paginación
  y los filtros que falten.
- Móvil en tarjetas, escritorio en tabla, según el sistema visual vigente.

**Criterios de aceptación:**

- Se encuentra una venta de una semana atrás por nombre del cliente.
- Los totales del listado coinciden con los del detalle y con Caja.
- La tabla no desborda horizontalmente a 390 px.

**Commit sugerido:** `feat(sigeco): add sales listing with filters`

## Tarea 10 — Datos Maestros Reales De La Etapa 1

**Prioridad:** P0. **Responsable:** Administración y Dirección. **Dependencias:** Tareas 8-9.

**Objetivo:** que el sistema arranque con los datos reales de la clínica, no con
datos de demostración.

**Alcance:**

- Carga de productos con precio de venta, costo referencial, umbral de descuento
  y unidad; proveedores con contacto; servicios y tratamientos vendibles.
- Stock inicial por conteo físico, registrado como entrada de inventario con
  responsable y fecha, no como número escrito a mano.
- Sucursal El Alto activa; usuarios reales con su rol y contraseña temporal.
- Verificación de que ningún dato sintético de demostración quede en la base
  productiva.

**Criterios de aceptación:**

- El conteo físico coincide con el stock del sistema el día del lanzamiento.
- Los precios cargados son los que cobra la clínica hoy.
- No existen usuarios ni productos de prueba en producción.

**Commit sugerido:** `chore(sigeco): load stage one master data`

---

## Fase C — Plataforma Y Salida A Producción

## Tarea 11 — CI Remoto Y Protección De Ramas

**Prioridad:** P0. **Responsable:** Plataforma. **Dependencias:** Fases A y B.

**Objetivo:** que ningún cambio llegue a `staging` o `main` sin pasar los
controles. Corresponde a la Tarea 1 del plan integral, todavía en progreso.

**Alcance:**

- Publicar `.github/workflows/ci.yml` y observar una ejecución remota completa:
  lint, typecheck, unitarias, integración con PostgreSQL efímero y build.
- Configurar protección de ramas en `develop`, `staging` y `main`.
- Resolver las vulnerabilidades altas de dependencias o dejarlas justificadas.
- Aquí se ejecuta el **cierre acumulado** de las Fases A y B: suite completa,
  integración y build.

**Criterios de aceptación:**

- Una ejecución remota verde sobre el commit que se va a promover.
- Un PR que falla no puede fusionarse.
- El cierre acumulado queda registrado con números concretos de pruebas.

**Commit sugerido:** `ci(sigeco): enable remote checks and branch protection`

## Tarea 12 — Staging Aislado Y Ensayo De La Etapa 1

**Prioridad:** P0. **Responsable:** Plataforma. **Dependencias:** Tarea 11.

**Objetivo:** probar el lanzamiento completo antes de tocar producción.
Corresponde a la Tarea 2 del plan integral.

**Alcance:**

- Base, schema Payload, Blob y secretos exclusivos de staging; `pnpm env:check`
  aprobado; comunicaciones bloqueadas y datos sintéticos.
- Desplegar la rama `staging` y ejecutar migraciones.
- Ensayo real de activación: arrancar con todo apagado, activar la Etapa 1,
  operar un día simulado, apagar un módulo con motivo y volver a activarlo.
- QA autenticado por rol y por módulo apagado, en móvil y escritorio.

**Criterios de aceptación:**

- El ensayo recorre alta de cliente, venta, cobro, recibo, egreso, compra,
  recepción, stock y cierre de Caja sin defectos críticos.
- Un rol clínico en staging no alcanza ninguna pantalla apagada.
- Las barreras de aislamiento impiden apuntar a producción.

**Commit sugerido:** `chore(sigeco): validate stage one on isolated staging`

## Tarea 13 — Backup Y Restauración Probados En Remoto

**Prioridad:** P0. **Responsable:** Plataforma y Dirección. **Dependencias:** Tarea 12.

**Objetivo:** poder recuperar dinero e inventario reales. Corresponde a la Tarea
7 del plan integral, hoy demostrada solo en local.

**Alcance:**

- Copia cifrada automática y programada de la base productiva y de los adjuntos.
- Restauración completa ejecutada en un entorno aislado, cronometrada, con
  verificación de que Caja, ventas, pagos y stock quedan consistentes.
- Retención, custodia de la clave y responsable definidos por Dirección.
- Documentar el resultado en `docs/operations/backup-restore.md`.

**Criterios de aceptación:**

- Existe una restauración remota comprobada, con fecha y tiempo medido.
- La copia corre sola y su fallo es visible.
- Dirección conoce y aprueba el procedimiento de recuperación.

**Commit sugerido:** `chore(sigeco): prove remote backup and restore`

## Tarea 14 — Cierre Del Gate De Seguridad

**Prioridad:** P0. **Responsable:** Plataforma y Dirección. **Dependencias:** Tarea 13.

**Objetivo:** levantar los bloqueos remotos que hoy impiden autorizar
producción. Corresponde a las Tareas 5, 6 y 8 del plan integral.

**Alcance:**

- Auditoría de privacidad y permisos con casos negativos ejecutada en remoto,
  incluyendo los nuevos rechazos por módulo apagado.
- Blob Store clínico privado verificado; en la Etapa 1 debe estar configurado
  aunque el módulo clínico esté apagado.
- Simulacro de incidentes sobre el entorno remoto y `pnpm security:gate:local`
  sin bloqueos pendientes.
- Autorización expresa y firmada de Dirección para producción.

**Criterios de aceptación:**

- No queda evidencia remota pendiente en el gate.
- Un acceso no autorizado queda registrado y bloqueado en remoto.
- La autorización de producción está documentada con fecha y responsable.

**Commit sugerido:** `chore(sigeco): close remote security gate`

## Tarea 15 — Despliegue Y Activación De La Etapa 1

**Prioridad:** P0. **Responsable:** Plataforma, Dirección y Administración. **Dependencias:** Tarea 14.

**Objetivo:** poner la Etapa 1 en producción y encenderla.

**Alcance:**

- Promoción `develop -> staging -> main` con las 181 diferencias acumuladas,
  revisadas y con CI verde.
- Proyecto de producción configurado: dominio, variables, Blob, `APP_ENV`,
  `DATABASE_ENVIRONMENT`; `pnpm db:deploy` sobre la base productiva.
- Con todos los módulos apagados salvo `core`, el super administrador activa
  `inventario`, `catalogo`, `compras` y `administracion`.
- Capacitación de Administración y acompañamiento durante los primeros días,
  con un canal definido para reportar problemas.
- Plan de reversa escrito: qué se apaga, quién decide y cómo se sigue operando
  en papel mientras tanto.

**Criterios de aceptación:**

- El primer día real cierra Caja con la diferencia explicada.
- Ningún módulo no lanzado es alcanzable en producción.
- El plan de reversa está escrito y entendido antes de encender.

**Commit sugerido:** `chore(sigeco): release stage one to production`

## Tarea 16 — Documentación Al Día

**Prioridad:** P1. **Responsable:** Plataforma. **Dependencias:** Tarea 15.

**Objetivo:** que la documentación vuelva a reflejar el sistema real.

**Alcance:**

- Reportes de los cambios de agosto que quedaron sin documentar: editor de
  recetas, catálogo de diagnósticos y plantillas, catálogo de hallazgos,
  anulación de documentos, seguimientos en espera de pago, sesiones
  excepcionales de Caja, métodos de pago reducidos a efectivo y QR, desglose de
  Caja, historial de ventas del paciente, cola de consultas con médico a cargo y
  mejoras de login.
- Actualizar `v3-implementation-status.md` con las etapas de lanzamiento y el
  estado real de cada módulo.
- Guía operativa del lanzamiento por etapas en `docs/operations/`.
- Actualizar los `progress.md` de los planes integral y del médico.

**Criterios de aceptación:**

- Ningún cambio implementado queda sin reporte.
- El estado publicado coincide con lo que hay en producción.
- Existe una guía de operación para el personal de la Etapa 1.

**Commit sugerido:** `docs(sigeco): update status and pending task reports`

---

## Fase D — Etapas Siguientes

Estas tareas no construyen funcionalidad: **verifican y encienden** módulos que
ya están implementados. Cada una se ejecuta cuando la etapa anterior está
estable y Dirección lo decide.

## Tarea 17 — Lanzamiento De Recepción

**Prioridad:** P1. **Responsable:** Dirección y Recepción. **Dependencias:** Tarea 15.

**Objetivo:** encender Recepción sobre una Etapa 1 en marcha.

**Alcance:**

- QA en staging del módulo con datos provenientes de la Etapa 1: fichas creadas
  por Administración que ahora reciben visitas.
- Verificar consentimientos, duplicados, abandono y que las ventas de mostrador
  anteriores sigan intactas y consultables.
- Capacitar a Recepción; activar `recepcion`; acompañar los primeros días.
- Confirmar que la venta directa sigue disponible y que ahora convive con la
  venta asociada a una visita.

**Criterios de aceptación:**

- Un cliente de la Etapa 1 recibe su primera visita sin crear una ficha nueva.
- Las ventas anteriores conservan su historia.
- Administración no pierde ninguna capacidad al encender Recepción.

**Commit sugerido:** `chore(sigeco): release reception module`

## Tarea 18 — Lanzamiento De Consulta

**Prioridad:** P1. **Responsable:** Dirección y Médico. **Dependencias:** Tarea 17.

**Objetivo:** encender la consulta médica y el pedido del médico.

**Alcance:**

- QA en staging de consulta, catálogos clínicos, pedido del médico, propuesta y
  recetas, incluyendo la cola con médico a cargo y prioridades.
- Verificar que el pedido del médico llega a la bandeja de Administración y se
  confirma y cobra con el flujo ya implementado.
- Capacitar al médico; activar `consulta`; acompañar.

**Criterios de aceptación:**

- Un pedido armado por el médico se cobra en Administración sin intervención
  técnica.
- La consulta se cierra con firma y las correcciones quedan versionadas.
- El descuento respeta el tope y su validación.

**Commit sugerido:** `chore(sigeco): release consultation module`

## Tarea 19 — Lanzamiento De Enfermería

**Prioridad:** P1. **Responsable:** Dirección y Enfermería. **Dependencias:** Tarea 18.

**Objetivo:** encender la ejecución clínica en Enfermería.

**Alcance:**

- QA en staging de tareas, signos, aplicaciones, estudios y sesiones de servicio,
  con la regla de pago previo antes de derivar.
- Verificar el consumo de sesiones a lo largo de varias visitas y el abandono
  por inactividad.
- Capacitar a Enfermería; activar `enfermeria`; acompañar.

**Criterios de aceptación:**

- Un suero pagado llega a Enfermería con sus indicaciones y se ejecuta.
- Las sesiones usadas y restantes coinciden con lo cobrado.
- Ninguna ejecución ocurre sin pago cuando la regla lo exige.

**Commit sugerido:** `chore(sigeco): release nursing module`

## Tarea 20 — Lanzamiento De Seguimiento, Opiniones Y Reportes

**Prioridad:** P2. **Responsable:** Dirección y Recepción. **Dependencias:** Tarea 19.

**Objetivo:** cerrar el ciclo con contacto posterior y medición.

**Alcance:**

- QA en staging de seguimientos, recordatorios supervisados, encuestas, reclamos
  y los reportes de recorrido, tiempos y captación.
- Confirmar que el contacto respeta el consentimiento vigente y que no existe
  envío automático sin aprobación humana.
- Aprobar en producción las reglas reales de recordatorios y los textos de
  consentimiento pendientes.
- Activar `seguimientos`, `opiniones` y `reportes`.

**Criterios de aceptación:**

- Ningún contacto sale sin consentimiento y sin aprobación de una persona.
- Los reportes reconcilian con Caja y con las visitas registradas.
- Dirección revisa indicadores reales, no de demostración.

**Commit sugerido:** `chore(sigeco): release follow-up, feedback and reports`

---

## Gate De Cierre Por Tarea

Una tarea pasa a `Terminada` cuando cumple sus criterios de aceptación, tiene
migración y recuperación documentadas si aplica, pasa lint y tipos, pasa
pruebas, build y QA en el cierre acumulado (Tareas 11-12), prueba los casos
permitidos y denegados por rol **y por módulo apagado**, se valida en web y
móvil, agrega su reporte en [task-reports](../task-reports/) y actualiza
[progress.md](./progress.md).
