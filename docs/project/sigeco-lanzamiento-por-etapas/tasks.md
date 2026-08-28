# Tasks — Lanzamiento Por Etapas De SIGECO

Estado: plan creado el 2026-08-24 por decisión de Dirección para salir a
producción de forma controlada, módulo por módulo. **Alcance recortado el
2026-08-28: este archivo llega hasta que la Etapa 1 funcione entera en
staging, y ahí termina.**

Este plan no construye funcionalidad clínica nueva: casi todo SIGECO ya está
implementado localmente. Lo que resuelve es **cómo se enciende**. Introduce la
activación de módulos desde el super administrador, completa lo que falta para
que Administración y Caja funcionen solas, y cierra los pendientes de
plataforma que hoy bloquean cualquier salida.

Las tareas que tocan producción —despliegue, autorización de Dirección, backup
productivo y los cuatro lanzamientos por etapa— se movieron a
[tasks-produccion.md](./tasks-produccion.md) y están congeladas. El motivo es
el QA del 2026-08-28: encontró defectos que impiden operar, y desplegar un
defecto conocido cuesta más caro que arreglarlo antes.

La numeración representa el orden recomendado de implementación: la Tarea 1 se
realiza primero y la Tarea 12D cierra el plan. Las letras evitan renumerar:
hay reportes publicados que citan estos números.

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

**Excepción de este plan:** las Tareas 11 a 12D son el cierre acumulado. Ahí sí
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
- Desactivar las formas de cobro que la interfaz ya no ofrece (`card`,
  `transfer`, `other`), revisando antes si alguna venta histórica las usa. Un
  método activo que nadie puede elegir ensucia la conciliación de Caja.

**Criterios de aceptación:**

- El conteo físico coincide con el stock del sistema el día del lanzamiento.
- Los precios cargados son los que cobra la clínica hoy.
- No existen usuarios ni productos de prueba en producción.

**Commit sugerido:** `chore(sigeco): load stage one master data`

## Tarea 10B — Deuda Previa Al Plan

**Prioridad:** P0. **Responsable:** Plataforma. **Dependencias:** ninguna.

**Objetivo:** dejar la suite en verde antes de encender el CI, para que su
primer rojo signifique algo.

Se numera `10B` a propósito: se insertó el 2026-08-24, después de escribir el
plan, y renumerar las tareas siguientes invalidaría las referencias de ocho
reportes ya publicados.

**De dónde sale:** cinco pruebas fallaban desde antes de este plan, sin que
nadie las viera, porque desde el 2026-08-02 las pruebas no se corren por tarea.
Al diagnosticarlas no eran todas tests desactualizados.

**Alcance:**

- **Fuga del correo en la URL del login.** Regresión del 2026-08-18 (commit
  `7c7a430`): `getLoginErrorRedirect(email)` deja el correo del usuario interno
  en la URL y la página lo lee con `params.email`. Queda en el historial del
  navegador, en los logs del servidor y en la cabecera `Referer`. Conservar el
  valor escrito sin exponerlo.
- **Acción sin auditoría.** `validateAttributionEvidenceCodeAction` no pasa por
  `runAuditedAction`. Auditarla o dejar documentada la excepción con su motivo.
- **Mapa de acciones desactualizado.** `security-boundaries` declara 94 acciones
  y existen 104. Mientras esté roto, ese control deja de avisar si una acción
  nueva queda con el permiso equivocado.
- **Pruebas desactualizadas.** `paid-study.schema.test.ts` no envía `total`, que
  el esquema pide desde un cambio de agosto.

**Criterios de aceptación:**

- `pnpm test` termina sin fallos.
- Ningún fallo queda "explicado" sin corregir: o se arregla, o queda escrito por
  qué se acepta.
- El correo del usuario no viaja en ninguna URL y el formulario sigue
  conservando lo escrito.

**Commit sugerido:** `fix(sigeco): clear pre-plan test debt before CI`

---

## Fase C — Plataforma Y Etapa 1 Funcionando En Staging

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
- Verificar el recorrido **por la aplicación desplegada**, no solo por script
  contra la base. El 2026-08-27 el ensayo pasaba por script mientras el sitio
  desplegado no podía guardar nada: `sharp` no cargaba su librería nativa en la
  función de Vercel y toda escritura respondía 500. El build pasaba igual.

**Criterios de aceptación:**

- El ensayo recorre alta de cliente, venta, cobro, recibo, egreso, compra,
  recepción, stock y cierre de Caja sin defectos críticos.
- Ese mismo recorrido se completa **desde el navegador contra staging**, no
  solo desde el script.
- Un rol clínico en staging no alcanza ninguna pantalla apagada.
- Las barreras de aislamiento impiden apuntar a producción.

Lo que este QA encontró y no se arregla acá quedó como Tareas 12B, 12C y 12D.
La Tarea 12 no cierra hasta que las tres cierren: su propio alcance pide QA en
escritorio, y es ahí donde aparecieron.

**Commit sugerido:** `chore(sigeco): validate stage one on isolated staging`

## Tarea 12B — Listas Invisibles En Escritorio

**Prioridad:** P0. **Responsable:** Plataforma. **Dependencias:** Tarea 12.

**Objetivo:** que las dos pantallas nacidas en las Tareas 7 y 8 muestren sus
registros en escritorio, no solo en móvil.

**De dónde sale:** el QA de la Tarea 12, el 2026-08-28. `RecordList` lleva
`sm:hidden`: existe solo debajo de 640 px. Su par de escritorio es
`RecordTable`, con `hidden sm:block`. Veintiuna pantallas usan las dos; dos usan
solo la primera y en escritorio no muestran **nada** —ni los registros ni el
mensaje de vacío—. El patrón lo definieron las Tareas 1 y 2 del plan móvil, que
cerró el 2026-07-15; estas dos pantallas se escribieron el 2026-08-24, después,
y ninguna iniciativa cerrada iba a volver a pasar por ellas.

No es un detalle estético. En la Etapa 1, Administración vende desde una
computadora: hoy el buscador de cliente no lista a nadie a 1440 px, así que
**una venta no se puede iniciar**.

**Alcance:**

- `administracion/ventas/nueva/page.tsx`: el buscador de cliente. Se verificó
  contra la consulta que `getPatients` devuelve el paciente por nombre, teléfono
  o código interno; el fallo es de render, no de datos.
- `administracion/clientes/[id]/page.tsx`: la lista de ventas del cliente y su
  mensaje de vacío.
- Revisar que ninguna otra pantalla use `RecordList` sin su `RecordTable`, y
  dejar el control donde se note si vuelve a pasar.

**Criterios de aceptación:**

- Con un cliente registrado, `/sigeco/administracion/ventas/nueva` lo lista en
  390, 768, 1024, 1280 y 1440 px.
- Sin coincidencias, el mensaje de vacío se lee en los cinco anchos.
- Una venta se completa de punta a punta desde escritorio.
- Ninguna pantalla queda con `RecordList` sin `RecordTable`.

**Commit sugerido:** `fix(sigeco): restore desktop record tables in sales and client pages`

## Tarea 12C — La Base Que No Responde

**Prioridad:** P1. **Responsable:** Plataforma. **Dependencias:** ninguna.

**Objetivo:** que una base lenta o caída dé un error entendible en vez de dejar
la pantalla colgada, y que el arranque local no falle en la primera corrida.

**De dónde sale:** el mismo QA del 2026-08-28. Con PostgreSQL apagado, el
ingreso quedó en «Ingresando…» **treinta segundos**, sin timeout, sin mensaje y
sin volver a habilitar el botón. `src/modules/database/client.ts` construye
`PrismaPg` sin `connectionTimeoutMillis`, así que el pool espera para siempre.
En producción, un hipo de la base deja al personal frente a un botón muerto y
sin saber si el cobro entró.

En la misma sesión, `pnpm seed:demo` falló contra un contenedor recién creado:
`A query cannot be executed on an expired transaction. The timeout for this
transaction was 5000 ms, however 6256 ms passed`. En la segunda corrida pasa.
Quien siga `docs/operations/local-development.md` en una máquina limpia choca
con esto exactamente una vez, sin saber que basta reintentar.

**Alcance:**

- Timeout de conexión en el adaptador de Postgres, con un valor que distinga
  «la base tarda» de «la base no está».
- El formulario de ingreso recupera el botón y explica qué pasó. La Regla 10 ya
  lo exige; hoy no se cumple cuando el fallo es de conexión.
- `scripts/seed-demo-catalog.ts`: subir el timeout de la transacción o partirla.
  El costo medido fue 6256 ms contra un límite de 5000.
- Revisar si otros scripts de seed dependen de que la base ya esté caliente.

**Criterios de aceptación:**

- Con la base apagada, el ingreso responde con un error legible y el botón
  vuelve a habilitarse.
- `pnpm seed:demo` pasa en la **primera** corrida contra un contenedor recién
  creado.
- Ningún script de arranque depende de reintentar.

**Commit sugerido:** `fix(sigeco): fail fast when the database does not answer`

## Tarea 12D — Ruido De Interfaz Detectado En El QA

**Prioridad:** P2. **Responsable:** Plataforma. **Dependencias:** ninguna.

**Objetivo:** cerrar los tres restos que el QA encontró y que no impiden
operar, para que el siguiente QA no vuelva a reportarlos.

**De dónde sale:** el recorrido del 2026-08-28: 167 peticiones, ninguna con
error de servidor. Estos tres quedaron.

**Alcance:**

- Las tres rutas que redirigen a Recepción —`/sigeco/pacientes`,
  `/sigeco/pacientes/nuevo` y `/sigeco/visitas`— lanzan en cada visita
  `Uncaught TypeError: Failed to execute 'measure' on 'Performance':
  'LegacyPatientsPage' cannot have a negative time stamp`. No rompen la
  navegación; ensucian la consola donde se buscan errores reales.
- El alta de cliente **borra lo escrito** cuando la validación falla. Rechaza
  bien —«Ingresa un teléfono válido», y no guarda nada—, pero obliga a teclear
  todo de nuevo. Es la misma exigencia que la Tarea 10B ya aplicó al ingreso:
  informar el error sin perder el valor.
- Un descuento en cero se muestra como `-0.00 Bs`.

**Criterios de aceptación:**

- Consola sin errores en las tres rutas que redirigen.
- Un error de validación conserva lo que la persona escribió.
- Ningún importe se muestra como cero negativo.

**Commit sugerido:** `fix(sigeco): clean up QA-reported interface defects`

---

## Después De Este Plan

Cuando la Tarea 12D cierre, la Etapa 1 funciona entera en staging y este
archivo termina. Lo que sigue —backup productivo, gate de seguridad,
despliegue, documentación y los cuatro lanzamientos por etapa— está en
[tasks-produccion.md](./tasks-produccion.md), congelado hasta entonces.

---

## Gate De Cierre Por Tarea

Una tarea pasa a `Terminada` cuando cumple sus criterios de aceptación, tiene
migración y recuperación documentadas si aplica, pasa lint y tipos, pasa
pruebas, build y QA en el cierre acumulado (Tareas 11 a 12D), prueba los casos
permitidos y denegados por rol **y por módulo apagado**, se valida en web y
móvil, agrega su reporte en [task-reports](../task-reports/) y actualiza
[progress.md](./progress.md).
