# Progress — Lanzamiento Por Etapas De SIGECO

Última actualización: 2026-08-24.

Plan de ejecución: [tasks.md](./tasks.md)

## Estado General

Plan creado el 2026-08-24. Las Tareas 1 y 2 tienen implementación local: el
catálogo de módulos, el mapa de permisos y los helpers de activación viven en
`src/features/modules/`, y el estado de cada módulo con su historial append-only
ya está en base (migración `20260824210000_module_activation`, aplicada en
desarrollo).

Con las Tareas 3 y 4 el lanzamiento por etapas ya se ve y se aplica: una página
o una acción de un módulo apagado se rechaza en el servidor y queda auditada como
`module.disabled`, y el menú, el inicio y los enlaces cruzados dejaron de
ofrecerla. Falta la pantalla del super administrador (Tarea 5); mientras tanto,
los módulos se encienden con `pnpm modules:set`.

Con los once módulos activos el sistema se comporta igual que antes de este
plan.

SIGECO tiene implementación local de todos los módulos operativos, pero no
tiene forma de exponer solo una parte al personal. Este plan agrega la
activación controlada de módulos desde el super administrador, completa lo que
falta para que Administración y Caja funcionen sin la ruta clínica, y cierra los
pendientes de plataforma que hoy bloquean cualquier salida a producción.

La Etapa 1 lanza `administracion`, `inventario`, `compras` y `catalogo`. Las
etapas siguientes encienden Recepción, Consulta, Enfermería y, por último,
seguimiento, opiniones y reportes.

Este plan **no reemplaza** a [mejoras integrales](../sigeco-mejoras-integrales/tasks.md)
ni al [dashboard del médico](../sigeco-medico-dashboard/tasks.md): toma de ellos
los pendientes que bloquean el lanzamiento (CI, staging, backup, gate de
seguridad) y los ordena como camino a producción. El estado de aquellas tareas
se sigue llevando en sus propios archivos.

## Resumen

| Estado | Cantidad |
| --- | ---: |
| Pendiente | 16 |
| En progreso | 4 |
| Bloqueada | 0 |
| Terminada | 0 |
| Descartada | 0 |

## Progreso Por Fase

| Fase | Tareas | Estado | Gate |
| --- | --- | --- | --- |
| A. Activación controlada de módulos | 1-6 | En progreso | Un módulo apagado es inalcanzable y auditable |
| B. Etapa 1: Caja y Administración | 7-10 | Pendiente | Se vende y cobra sin ruta clínica |
| C. Plataforma y salida a producción | 11-16 | Pendiente | Producción autorizada y Etapa 1 encendida |
| D. Etapas siguientes | 17-20 | Pendiente | Cada módulo se enciende con QA y capacitación |

## Estado Por Tarea

| # | Tarea | Prioridad | Estado | Dependencias |
| --- | --- | --- | --- | --- |
| 1 | Catálogo de módulos y mapa de permisos | P0 | En progreso | Ninguna |
| 2 | Estado de activación y su historial | P0 | En progreso | 1 |
| 3 | Gate de módulos en servidor | P0 | En progreso | 1-2 |
| 4 | Navegación e inicio según módulos activos | P0 | En progreso | 3 |
| 5 | Pantalla de activación del super administrador | P0 | Pendiente | 3-4 |
| 6 | Modo solo lectura del módulo apagado | P1 | Pendiente | 5 |
| 7 | Alta mínima de cliente desde Administración | P0 | Pendiente | 4 |
| 8 | Venta directa sin visita | P0 | Pendiente | 7 |
| 9 | Listado y búsqueda de ventas | P1 | Pendiente | 8 |
| 10 | Datos maestros reales de la Etapa 1 | P0 | Pendiente | 8-9 |
| 11 | CI remoto y protección de ramas | P0 | Pendiente | Fases A y B |
| 12 | Staging aislado y ensayo de la Etapa 1 | P0 | Pendiente | 11 |
| 13 | Backup y restauración probados en remoto | P0 | Pendiente | 12 |
| 14 | Cierre del gate de seguridad | P0 | Pendiente | 13 |
| 15 | Despliegue y activación de la Etapa 1 | P0 | Pendiente | 14 |
| 16 | Documentación al día | P1 | Pendiente | 15 |
| 17 | Lanzamiento de Recepción | P1 | Pendiente | 15 |
| 18 | Lanzamiento de Consulta | P1 | Pendiente | 17 |
| 19 | Lanzamiento de Enfermería | P1 | Pendiente | 18 |
| 20 | Lanzamiento de seguimiento, opiniones y reportes | P2 | Pendiente | 19 |

## Decisiones Vigentes

- **Activación global**, no por sucursal. La dimensión por sede queda como
  migración aditiva futura si Cochabamba necesita otro ritmo.
- **Un módulo se puede apagar** con motivo obligatorio y auditoría; conserva los
  datos y el trabajo abierto en solo lectura para Dirección.
- **Solo el super administrador** activa o desactiva. Dirección ve estado e
  historial.
- **Dependencias duras:** Consulta requiere Recepción; Enfermería requiere
  Consulta; Compras requiere Inventario.
- **En la Etapa 1 se cobra a un cliente identificado**, dado de alta con un
  formulario mínimo desde Administración, sin abrir visita.
- **El comprobante de la Etapa 1 es el recibo interno vigente.** La facturación
  fiscal no está en alcance.
- **La Etapa 1 sale a producción real**, no a una instalación local.
- El super administrador no evade el gate de módulos: un módulo apagado lo está
  para todos.

## Riesgos Conocidos

- **Orden invertido respecto del recorrido del paciente.** Lo natural sería
  lanzar Recepción antes que Administración. Durante la Etapa 1 el personal
  registrará clientes en un lugar que después deja de ser el habitual; hay que
  decirlo explícitamente en la capacitación.
- **Dinero e inventario reales desde el primer día.** Backup probado (Tarea 13)
  y auditoría activa son condición previa, no mejora posterior.
- **Deuda documental de agosto.** Alrededor de catorce commits sin reporte ni
  actualización de progreso; se salda en la Tarea 16.
- **181 commits de diferencia entre `develop` y `main`.** La promoción de la
  Tarea 15 es grande y debe revisarse con CI verde, no fusionarse a ciegas.
- **Permiso nuevo sin módulo.** Si alguien agrega un `InternalPermission` y no lo
  mapea, quedaría fuera del gate. La prueba de cobertura de la Tarea 1 existe
  para impedirlo.
- **Deuda de pruebas previa al plan.** Cinco pruebas fallaban ya el 2026-08-24
  por cambios de agosto que nunca se validaron. Son anteriores a este plan, pero
  bloquean el cierre acumulado de la Tarea 11.
- **Orden de despliegue.** El gate consulta `ModuleActivation` en cada página
  protegida: la migración de la Tarea 2 debe aplicarse antes de publicar el
  código de la Tarea 3.

## Próximo Trabajo

Tarea 5: la pantalla `/sigeco/modulos` del super administrador. La escritura ya
existe (`setModuleActivation`, con dependencias duras y motivo obligatorio) y la
lectura también (`getModuleActivationStates`, `getModuleActivationHistory`), así
que la tarea es la interfaz, los permisos nuevos `modules_read` y
`modules_manage` —que deberán mapearse a `core`— y la auditoría de cada cambio.

## Registro

### 2026-08-24 — Tarea 4 Implementada (Navegación E Inicio Según Módulos Activos)

- `canUse` en `src/features/modules/access.ts` repite en la interfaz la misma
  condición que aplica el servidor: permiso del rol más módulo lanzado, con el
  mismo `module` opcional. Una sola regla para mostrar y para bloquear.
- Cada `SigecoNavItem` declara su módulo; el menú de escritorio y el de móvil
  filtran por permiso y módulo. El layout lee `getActiveModules()` una vez por
  request, en paralelo con la sucursal activa.
- El dashboard no ejecuta las consultas de los módulos apagados. Su mensaje vacío
  distingue "tu rol no tiene módulos" de "tu módulo todavía no se lanzó": lo
  primero manda a pedir permisos que la persona ya tiene.
- Diez enlaces cruzados en seis archivos quedaron condicionados al módulo destino
  (ficha → venta y seguimiento, visita y abandonos → seguimiento, inventario y
  lotes → compra, catálogo → producto). Se oculta el enlace, no el dato ya
  visible. La búsqueda de pacientes del encabezado exige `recepcion`, porque lleva
  a la ficha.
- Validación: typecheck y lint limpios; 437 de 442 pruebas unitarias, con doce
  nuevas. `SidebarNav.test.tsx` comprueba el criterio de aceptación literal: en la
  Etapa 1 el menú muestra Caja, Catálogo, Inventario, Compras y el núcleo, y nada
  clínico.
- Se ajustó una prueba de privacidad que verificaba el texto literal del control
  de la búsqueda de pacientes; el control no se debilitó, se reforzó con el
  módulo.
- Estado: **En progreso** según el gate del plan. Detalle:
  [reporte de tarea](../task-reports/2026-08-24-lanzamiento-tarea-4-navegacion-modulos.md).

### 2026-08-24 — Tarea 3 Implementada (Gate De Módulos En Servidor)

- `requirePermission` y `runAuditedAction` verifican el módulo además del
  permiso. Dos funciones cubren las 50 páginas y las 126 acciones auditadas.
  `requireModule` queda disponible para rutas sin permiso propio.
- Ambas aceptan un `module` opcional: cuando varios módulos comparten un permiso,
  manda la pantalla. Se fijó en trece páginas y tres acciones; el caso más
  delicado fue `/sigeco/sucursales`, que administra sedes pero está protegida con
  `reports_read` y habría quedado apagada justo en la Etapa 1.
- El rechazo por módulo se audita como `module.disabled` con el módulo, la acción
  intentada y el permiso; el rechazo por permiso conserva su forma. Los dos
  avisan distinto al usuario (`modulo-no-disponible` y `permiso-denegado`).
- El super administrador no evade el gate. Los permisos retirados de leads quedan
  bloqueados incluso para él.
- `scripts/module-gate.test.ts` falla si una página o acción usa un permiso
  compartido sin decidir su módulo; las excepciones están listadas con su
  justificación. Se verificó que las dos comprobaciones fallan de verdad.
- Adición fuera de la letra de la tarea: `setModuleActivation` en la capa de
  queries y el script `pnpm modules:set`. Sin ellos el entorno local quedaba
  inutilizable hasta la Tarea 5, que reutilizará esa misma función.
- Validación: typecheck y lint limpios; 425 de 430 pruebas unitarias aprobadas,
  con 20 nuevas. Reglas de activación verificadas contra la base de desarrollo.
- **Deuda previa detectada:** cinco pruebas ya fallaban en `HEAD`
  (`paid-study.schema` x2, `audit-coverage`, `privacy-controls` y el mapa de
  acciones de `security-boundaries`). Hay que saldarlas antes del cierre
  acumulado de la Tarea 11.
- Estado: **En progreso** según el gate del plan. Detalle:
  [reporte de tarea](../task-reports/2026-08-24-lanzamiento-tarea-3-gate-modulos.md).

### 2026-08-24 — Tarea 2 Implementada (Estado De Activación Y Su Historial)

- Modelos `ModuleActivation` y `ModuleActivationEvent`, con `actorRole` guardado
  como fotografía histórica y referencias a `InternalUser` con `RESTRICT`, para
  que borrar una cuenta no borre quién encendió un módulo.
- Migración aditiva `20260824210000_module_activation`: crea las tablas, instala
  el trigger que rechaza `UPDATE` y `DELETE` sobre el historial —el mismo patrón
  de `AuditEvent`—, siembra los once módulos con solo `core` activo y registra el
  encendido del núcleo como primer evento.
- Lecturas en `src/modules/database/queries/modules.ts`: `getActiveModules()`
  memoizado por request con `cache` de React, `getModuleActivationStates()` que
  une catálogo y base para la pantalla de la Tarea 5, y
  `getModuleActivationHistory()`.
- Un módulo del catálogo sin fila queda apagado y una fila con código retirado se
  ignora; el núcleo se resuelve por la marca `alwaysActive`, así que ni siquiera
  un cambio manual en base puede dejar el sistema sin acceso.
- Verificado a mano contra la base de desarrollo: once filas, solo `core` activo,
  evento inicial presente, y `UPDATE`/`DELETE` sobre el historial rechazados por
  PostgreSQL. `prisma migrate status` sin desvío.
- Validación: lint, typecheck y 35 pruebas unitarias aprobadas, incluida la
  verificación del archivo de migración. La prueba de integración quedó escrita y
  sin ejecutar, para el cierre acumulado.
- Estado: **En progreso** según el gate del plan. Detalle:
  [reporte de tarea](../task-reports/2026-08-24-lanzamiento-tarea-2-estado-activacion-modulos.md).

### 2026-08-24 — Tarea 1 Implementada (Catálogo De Módulos Y Mapa De Permisos)

- `src/features/modules/catalog.ts`: once módulos con nombre, descripción,
  dependencias duras y orden; `core` marcado como permanente. Incluye las cuatro
  etapas de lanzamiento como documentación ejecutable.
- `src/features/modules/permission-modules.ts`: los 64 valores de
  `InternalPermission` mapeados a los módulos que los habilitan. Un permiso queda
  habilitado con que **uno** de sus módulos esté activo, que es lo que permite a
  Administración leer y crear fichas en la Etapa 1 sin Recepción.
- `src/features/modules/activation.ts`: helpers puros, sin Prisma ni
  `server-only`. Además de los tres pedidos por el plan se agregó
  `resolveDeactivationBlockers`, porque una dependencia dura sin su reverso
  permitiría apagar Recepción dejando Consulta encendida.
- Los cinco permisos de leads quedan retirados: ningún módulo los habilita. Se
  verificó que las acciones de `features/crm` no tienen consumidores.
- Decisión con consecuencia visible: `followups_*` los habilita solo
  `seguimientos`, así que hasta la Etapa 4 el médico no verá la tarjeta de
  agendar seguimiento. Se puede adelantar activando ese módulo, que solo depende
  de `recepcion`. **Pendiente de confirmación de Dirección.**
- Corrección al plan: la Tarea 7 mencionaba `patients_write`, que no existe en el
  enum; los permisos reales son `patients_create` y `patients_update`.
- Validación: lint y typecheck sin errores; 31 pruebas propias aprobadas,
  incluida la de cobertura que falla si un permiso nuevo queda sin mapear.
  Suite completa, integración, build y QA quedan para el cierre acumulado.
- Estado: **En progreso** según el gate del plan. Detalle:
  [reporte de tarea](../task-reports/2026-08-24-lanzamiento-tarea-1-catalogo-modulos.md).

### 2026-08-24 — Creación Del Plan

- Dirección decidió lanzar por etapas, empezando por Administración y Caja.
- Se confirmaron las decisiones de activación: global, reversible con motivo,
  exclusiva del super administrador y con dependencias duras.
- Se analizó el acoplamiento real en el código: `requirePermission` y
  `runAuditedAction` son los dos únicos puntos de guarda del sistema, lo que
  permite aplicar el gate de módulos sin tocar las 50 páginas ni las 126
  acciones auditadas una por una.
- Se identificaron los tres bloqueos reales de una Etapa 1 sin ruta clínica:
  `Sale.patientId` y `Payment.patientId` obligatorios, el alta de pacientes
  disponible solo en el funnel de Recepción, y la bandeja de Administración
  alimentada únicamente por `VisitWorkItem`.
- Se definieron 20 tareas en cuatro fases.
