# Progress — Lanzamiento Por Etapas De SIGECO

Última actualización: 2026-08-24.

Plan de ejecución: [tasks.md](./tasks.md)

## Estado General

Plan creado el 2026-08-24. Las Tareas 1 y 2 tienen implementación local: el
catálogo de módulos, el mapa de permisos y los helpers de activación viven en
`src/features/modules/`, y el estado de cada módulo con su historial append-only
ya está en base (migración `20260824210000_module_activation`, aplicada en
desarrollo).

Con las Tareas 3, 4 y 5 el lanzamiento por etapas ya se opera desde la
interfaz: una página o una acción de un módulo apagado se rechaza en el servidor
y queda auditada, el menú y el inicio dejaron de ofrecerla, y el super
administrador enciende y apaga módulos desde `/sigeco/modulos` con dependencias
explicadas, motivo obligatorio e historial. Dirección lo ve en solo lectura.

Con la Tarea 6 la Fase A está completa en implementación local: un módulo
suspendido conserva la consulta para Dirección y el super administrador, bloquea
toda escritura y lista el trabajo que quedó abierto. Sigue en pie el gate de
cierre: nada pasa a `Terminada` antes del cierre acumulado de las Tareas 11 y 12.

La Fase B ya cubre los dos bloqueos principales: Administración registra al
cliente de mostrador sin abrir visita y arma la venta por su cuenta, sin esperar
la derivación del médico. El cobro, el descuento de stock y el recibo son los de
siempre. Falta el listado de ventas (Tarea 9) y la carga de datos maestros
reales (Tarea 10).

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
| Pendiente | 12 |
| En progreso | 8 |
| Bloqueada | 0 |
| Terminada | 0 |
| Descartada | 0 |

## Progreso Por Fase

| Fase | Tareas | Estado | Gate |
| --- | --- | --- | --- |
| A. Activación controlada de módulos | 1-6 | En progreso | Un módulo apagado es inalcanzable y auditable |
| B. Etapa 1: Caja y Administración | 7-10 | En progreso | Se vende y cobra sin ruta clínica |
| C. Plataforma y salida a producción | 11-16 | Pendiente | Producción autorizada y Etapa 1 encendida |
| D. Etapas siguientes | 17-20 | Pendiente | Cada módulo se enciende con QA y capacitación |

## Estado Por Tarea

| # | Tarea | Prioridad | Estado | Dependencias |
| --- | --- | --- | --- | --- |
| 1 | Catálogo de módulos y mapa de permisos | P0 | En progreso | Ninguna |
| 2 | Estado de activación y su historial | P0 | En progreso | 1 |
| 3 | Gate de módulos en servidor | P0 | En progreso | 1-2 |
| 4 | Navegación e inicio según módulos activos | P0 | En progreso | 3 |
| 5 | Pantalla de activación del super administrador | P0 | En progreso | 3-4 |
| 6 | Modo solo lectura del módulo apagado | P1 | En progreso | 5 |
| 7 | Alta mínima de cliente desde Administración | P0 | En progreso | 4 |
| 8 | Venta directa sin visita | P0 | En progreso | 7 |
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

Tarea 9: listado y búsqueda de ventas. Hoy una venta anterior solo se alcanza
desde la ficha del cliente o desde los cobros del día; falta
`/sigeco/administracion/ventas` con filtros por fecha, estado y cliente.
`getSalesSummary` y las consultas de cobros ya existen: el trabajo es la
paginación, los filtros que falten y la tabla que no desborde en móvil.

## Registro

### 2026-08-24 — Tarea 8 Implementada (Venta Directa Sin Visita)

- `createSaleOrderAction`, `createSaleOrderRecord` y `AdministrationChargeDialog`
  ya existían desde el commit `5668da9` y **no tenían ningún consumidor**. La
  acción ya contemplaba el caso sin tarea administrativa y el esquema ya aceptaba
  `visitId` y `workItemId` vacíos: esta tarea armó el recorrido, no reescribió la
  venta.
- `/sigeco/administracion/ventas/nueva` en dos pasos: a quién se le vende
  —búsqueda por nombre, teléfono o código, con acceso al alta de la Tarea 7— y
  qué se le vende, con el catálogo de servicios y tratamientos, los productos
  vendibles de la sucursal activa y texto libre.
- Entradas nuevas: "Nueva venta" en el encabezado de `/sigeco/administracion` y
  en la ficha del cliente, que abre el paso 2 con ese cliente ya elegido.
- El cobro, el descuento de stock, el rollback por stock insuficiente, la
  idempotencia y el recibo son los de siempre, en el detalle de la venta. Una
  venta de mostrador y una derivada del médico son la misma `Sale`; lo único que
  cambia es que una no tiene `visitId`.
- Los errores de la venta de mostrador volvían a `/sigeco/administracion`, que no
  muestra mensajes de error: ahora vuelven a la pantalla donde se estaba armando,
  con el cliente elegido y el motivo explicado.
- Validación: typecheck y lint limpios; 474 de 479 pruebas unitarias. Verificado
  contra la base de desarrollo: `visitId: null | workItemId: null`, total 13000
  sobre 15000 con 2000 de descuento calculado en servidor, y el reintento con la
  misma clave devolvió la misma venta.
- Estado: **En progreso** según el gate del plan. Detalle:
  [reporte de tarea](../task-reports/2026-08-24-lanzamiento-tarea-8-venta-directa-sin-visita.md).

### 2026-08-24 — Tarea 7 Implementada (Alta Mínima De Cliente Desde Administración)

- `administracion` suma `patients_create` y `patients_update`; sigue sin
  `visits_create`, porque registrar una llegada es otra cosa.
- `registerWalkInClientAction` crea la ficha con nombre y teléfono reutilizando
  `createPatientRecord`, sin `Visit`, `PatientRoute` ni `VisitWorkItem`.
- Antes de crear, muestra las fichas parecidas y deja elegir: usar la encontrada
  o confirmar que es otra persona. La acción **devuelve** las candidatas en lugar
  de redirigir, porque poner nombres y teléfonos en la URL los deja en el
  historial, en los logs y en el referer.
- Tres pantallas nuevas bajo `/sigeco/administracion/clientes`, todas fijadas al
  módulo `administracion`. La ficha usa una consulta propia que trae contacto y
  no trae alergias ni antecedentes: Administración no los necesita para cobrar.
- **No se agregó documento de identidad**, pese a que el plan lo mencionaba: el
  modelo no lo tiene y el funnel de Recepción tampoco lo pide. Agregarlo solo acá
  obligaría a decidir si entra en la detección de duplicados y si debe ser único;
  es una decisión sobre la identidad del paciente, no un agregado de esta tarea.
- Validación: typecheck y lint limpios; 466 de 471 pruebas unitarias.
  Verificado contra la base de desarrollo: ficha creada con código interno,
  `visitas: 0 | rutas: 0 | tareas: 0`, duplicado detectado por teléfono, y la
  ficha de prueba eliminada al terminar.
- Estado: **En progreso** según el gate del plan. Detalle:
  [reporte de tarea](../task-reports/2026-08-24-lanzamiento-tarea-7-alta-minima-cliente.md).

### 2026-08-24 — Tarea 6 Implementada (Modo Solo Lectura Del Módulo Apagado)

- `permission-access.ts` clasifica los 66 permisos como lectura o escritura, con
  prueba de cobertura. La clasificación se declara: `reminders_review` y
  `patient_duplicates_review` registran decisiones y son escritura aunque no lo
  digan.
- `getModuleAccessState()` distingue **suspendido** (estuvo lanzado y se apagó)
  de **sin lanzar**. Solo el primero conserva la lectura, porque solo ahí hay
  trabajo abierto que resolver.
- `resolveModuleAccess` devuelve `allowed`, `read_only` o `blocked`, y la usan
  las tres capas: guarda de página, guarda de acción e interfaz. `read_only`
  nunca aparece con un permiso de escritura, ni para el super administrador.
- 44 indicadores de escritura en 26 páginas pasaron de `roleHasPermission` a
  `canUse`, así que una pantalla suspendida se dibuja sin sus botones de guardar.
  Los indicadores de lectura se dejaron intactos a propósito: convertirlos habría
  vaciado la pantalla y anulado el objetivo.
- `getModulePendingWork` cuenta lo que quedó abierto en cada módulo suspendido
  (visitas sin cerrar, ventas con saldo, Cajas sin cerrar, tareas, alertas) y se
  muestra en su tarjeta.
- Corrección al mapa: "No continuará" lo registran cuatro áreas, no solo
  Recepción; `visit_discontinuations_*` quedó habilitado por las cuatro.
- Procedimiento documentado en
  [operations/module-launch-suspension.md](../../operations/module-launch-suspension.md).
- Validación: typecheck y lint limpios; 466 de 471 pruebas unitarias, con 29
  nuevas. Verificado contra la base de desarrollo suspendiendo Caja: Dirección
  obtiene `read_only` en lectura y `blocked` en escritura, el rol Administración
  queda bloqueado en ambas, y los pendientes reportaron datos reales.
- Estado: **En progreso** según el gate del plan. Detalle:
  [reporte de tarea](../task-reports/2026-08-24-lanzamiento-tarea-6-solo-lectura-modulo-apagado.md).

### 2026-08-24 — Tarea 5 Implementada (Pantalla De Activación Del Super Administrador)

- Permisos nuevos `modules_read` y `modules_manage` (migración
  `20260824220000_module_management_permissions`), mapeados a `core` a
  propósito: si el gate pudiera bloquearlos, un módulo apagado por error dejaría
  el sistema sin forma de volver a encenderlo. Dirección recibe `modules_read`.
- `/sigeco/modulos` muestra las cuatro etapas, cada módulo con estado,
  dependencias, desde cuándo y quién, y el historial completo. Distingue
  `Lanzado`, `Sin lanzar` y `Suspendido`: confundir los dos últimos borraría la
  información que hace falta en un incidente.
- Encender pide confirmación; apagar pide motivo escrito. Cuando una dependencia
  bloquea no hay botón deshabilitado: se nombra el módulo que falta encender o
  apagar antes.
- El shell avisa de los módulos suspendidos, solo a quien tiene `modules_read`;
  para el resto la consulta ni se ejecuta.
- La acción comparte `setModuleActivation` con `pnpm modules:set`, así que no hay
  dos caminos con reglas distintas. Se audita como `module.activate` o
  `module.deactivate` para poder filtrar los apagados.
- **Cambio de alcance más amplio:** `requirePermission` y `requireModule` ahora
  auditan el rechazo antes de redirigir (`page.denied` y `module.disabled`). El
  criterio de la tarea lo pedía y la auditoría de páginas no existía en todo el
  sistema. Obligó a separar `appendAuditEvent` en `src/modules/audit/append.ts`
  para romper un ciclo de imports; la API pública no cambió.
- Validación: typecheck y lint limpios; 450 de 455 pruebas unitarias, con trece
  nuevas que cubren las guardas y el esquema del formulario. Migración aplicada y
  verificada en desarrollo.
- Estado: **En progreso** según el gate del plan. Detalle:
  [reporte de tarea](../task-reports/2026-08-24-lanzamiento-tarea-5-pantalla-modulos.md).

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
