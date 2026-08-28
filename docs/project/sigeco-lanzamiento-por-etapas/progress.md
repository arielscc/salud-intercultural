# Progress — Lanzamiento Por Etapas De SIGECO

Última actualización: 2026-08-28.

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

La Fase B ya cubre los tres bloqueos de código: Administración registra al
cliente de mostrador sin abrir visita, arma la venta por su cuenta y encuentra
una venta anterior por cliente, estado y fecha. El cobro, el descuento de stock y
el recibo son los de siempre.

La Tarea 10 entregó la herramienta —plantilla, cargador y verificación— pero
**depende de datos que solo tiene la clínica**: productos, precios, umbrales,
proveedores, conteo físico y personal. No puede darse por terminada hasta que
Administración y Dirección completen la plantilla y la carga corra contra la
base que se va a usar.

Con eso la Fase B queda cerrada en implementación y el plan pasa a la Fase C.
Desde el 2026-08-28 esa fase **termina en staging**: el QA encontró defectos que
impiden operar y Dirección decidió resolverlos antes de mirar producción. Las
tareas de despliegue se movieron a [tasks-produccion.md](./tasks-produccion.md).

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
| Pendiente | 8 |
| En progreso | 13 |
| Bloqueada | 0 |
| Terminada | 0 |
| Descartada | 0 |

## Progreso Por Fase

| Fase | Tareas | Estado | Gate |
| --- | --- | --- | --- |
| A. Activación controlada de módulos | 1-6 | En progreso | Un módulo apagado es inalcanzable y auditable |
| B. Etapa 1: Caja y Administración | 7-10 | En progreso | Se vende y cobra sin ruta clínica |
| B+. Deuda previa al plan | 10B | En progreso | La suite queda en verde antes del CI |
| C. Plataforma y salida a producción | 11-16 | En progreso | Producción autorizada y Etapa 1 encendida |
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
| 9 | Listado y búsqueda de ventas | P1 | En progreso | 8 |
| 10 | Datos maestros reales de la Etapa 1 | P0 | En progreso | 8-9 |
| 10B | Deuda previa al plan | P0 | En progreso | Ninguna |
| 11 | CI remoto y protección de ramas | P0 | En progreso | Fases A y B |
| 12 | Staging aislado y ensayo de la Etapa 1 | P0 | En progreso | 11 |
| 12B | Listas invisibles en escritorio | P0 | En progreso | 12 |
| 12C | La base que no responde | P1 | Pendiente | Ninguna |
| 12D | Ruido de interfaz detectado en el QA | P2 | Pendiente | Ninguna |

Las Tareas 13 a 20 salieron de este plan el 2026-08-28 y viven congeladas en
[tasks-produccion.md](./tasks-produccion.md). Este archivo llega hasta que la
Etapa 1 funcione entera en staging.

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
- **Dinero e inventario reales desde el primer día.** Backup probado (Tarea 13,
  hoy en `tasks-produccion.md`) y auditoría activa son condición previa, no
  mejora posterior.
- **Deuda documental de agosto.** Alrededor de catorce commits sin reporte ni
  actualización de progreso; se salda en la Tarea 16, hoy en
  `tasks-produccion.md`.
- **181 commits de diferencia entre `develop` y `main`.** La promoción de la
  Tarea 15 es grande y debe revisarse con CI verde, no fusionarse a ciegas.
- **Lo que pasa el QA por script puede fallar en el navegador.** El 2026-08-27 el
  ensayo daba once pasos en verde mientras el sitio desplegado no guardaba nada.
  Un recorrido que no toca la aplicación desplegada no prueba que funcione.
- **Una pantalla nueva puede nacer sin su mitad de escritorio.** Los planes móvil
  y desktop cerraron en julio; `RecordList` sin `RecordTable` no lo detecta nada
  hoy. La Tarea 12B debe dejar ese control puesto.
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

Desbloquear staging: faltan dos secretos que no se pueden inventar, el Blob
privado para adjuntos clínicos (`STAGING_CLINICAL_BLOB_READ_WRITE_TOKEN`) y
`PAYLOAD_SIGECO_INTEGRATION_SECRET`. Con eso, `pnpm staging:check` pasa, se
promueve `develop → staging`, se aplican las 54 migraciones pendientes y se corre
`pnpm stage-one:rehearse` contra staging.

Después, Tarea 13: backup y restauración probados en remoto.

En paralelo, la Tarea 10 espera datos de la clínica: la plantilla está en
`docs/operations/plantillas/` y el procedimiento en
`docs/operations/stage-one-master-data.md`.

## Registro

### 2026-08-28 — Tarea 12B Implementada (Listas Invisibles En Escritorio)

**Las dos pantallas ya muestran sus registros desde 640 px.**
`administracion/ventas/nueva` y `administracion/clientes/[id]` usaban
`RecordList` —que lleva `sm:hidden`— sin su par `RecordTable`. Desde 640 px no
mostraban nada: ni los registros ni el mensaje de vacío, y sin error que lo
delatara. Se descartó primero que fuera de datos: `getPatients` devuelve el
paciente por nombre, teléfono y código. Era render.

Las dos siguen ahora el molde de `administracion/clientes/page.tsx`. En la ficha
del cliente, el mensaje de vacío estaba escrito dos veces en JSX suelto; se
extrajo a una constante para que la card y la tabla no diverjan.

**El control que faltaba:** `record-list-pairing.test.ts` recorre
`src/app/(internal)` y falla nombrando cualquier archivo con `<RecordList` sin
`<RecordTable`. Se verificó que falla de verdad, quitando el bloque de una de
las pantallas y comprobando que la prueba la señala. Una segunda prueba exige al
menos veinte pares completos, para que la primera no pase por vacía.

**Validación:** lint, typecheck y las dos pruebas nuevas en verde. Los cuatro
casos —buscador con y sin coincidencias, ficha con y sin ventas— medidos en 390,
768, 1024, 1280 y 1440 px, sin desplazamiento lateral en ninguno. Y una venta
completa desde escritorio a 1440 px: buscar, abrir el cliente desde la tabla,
crear la venta y cobrar 50 Bs. La Caja del día estaba cerrada y el sistema pidió
apertura excepcional con motivo, que es lo correcto. Antes de este cambio el
recorrido no pasaba del primer paso.

Detalle: [reporte de tarea](../task-reports/2026-08-28-lanzamiento-tarea-12b-listas-escritorio.md).

### 2026-08-28 — Alcance Recortado A Staging Y Tres Tareas Nuevas

**El despliegue de staging no podía guardar nada.** El ensayo de los once pasos
pasaba, pero corría por script contra la base. Al probarlo por el navegador,
toda escritura devolvía 500: suspender un módulo, cerrar sesión y el formulario
público de contacto. El log dio la causa: `ERR_DLOPEN_FAILED: libvips-cpp.so`.
`payload.config.ts` importa `sharp` de forma estática, así que cualquier ruta
que toque Payload lo carga, y el rastreo de Next no incluía la librería nativa
—ningún `require` la pide: la resuelve el enlazador dinámico desde el RPATH—.
El build pasaba igual. **No era de staging: es de empaquetado, y producción
habría caído igual.**

Arreglado en dos archivos: `pnpm-workspace.yaml` fija `nodeLinker: hoisted`
—sin él, el empaquetador de Vercel rechaza la función por enlaces simbólicos— y
`next.config.mjs` agrega la librería al rastreo. Verificado en local: los 97
rastreos de ruta la incluyen. Falta confirmarlo en staging desplegado.

**El criterio del rol clínico pasa.** Con `qa.medico`, las nueve rutas apagadas
rebotan a `/sigeco`. Tres devuelven `permiso-denegado` en vez de
`modulo-no-disponible`, y **es correcto**: el médico no tiene `feedback_read`
ni `reports_read`, y el rechazo por permiso ocurre antes del gate. Repetido con
`qa.direccion`, que sí los tiene, las cinco dan `modulo-no-disponible`. Las seis
cuentas QA se probaron en escritorio; Recepción y Enfermería ven solo lo suyo.
Sin analítica, contactos bloqueados y sin desplazamiento lateral.

**El QA local encontró cinco defectos.** Se levantó la base local —no existía:
ni Postgres, ni Docker— y se recorrió la aplicación entera: 167 peticiones,
40 rutas, el día completo con datos falsos —paciente, Caja en 150, venta de
115, cobro, comprobante, compra de 180, pago a proveedor, recepción con lote,
stock 20 → 19 → 29 y cierre conciliado en 85—. **Cero respuestas 500.** El
ciclo de suspender y reactivar un módulo funciona en local, lo que confirma que
el fallo de staging era solo el empaquetado.

Lo que sí falló quedó como tareas nuevas:

- **Tarea 12B (P0):** `RecordList` lleva `sm:hidden` y su par de escritorio es
  `RecordTable`. Dos pantallas usan solo la primera, así que en escritorio no
  muestran ni los registros ni el mensaje de vacío. Una de ellas es el buscador
  de cliente de «Nueva venta»: **desde una computadora no se puede iniciar una
  venta**. Nacieron el 2026-08-24, después de que los planes móvil y desktop
  cerraran; ninguna iniciativa iba a volver a pasar por ellas.
- **Tarea 12C (P1):** el adaptador de Postgres no fija `connectionTimeoutMillis`,
  así que con la base caída el ingreso queda en «Ingresando…» indefinidamente.
  Y `pnpm seed:demo` falla en frío por una transacción que excede 5000 ms.
- **Tarea 12D (P2):** las tres rutas legacy lanzan un `TypeError` de
  `performance.measure` en cada visita; el alta de cliente pierde lo escrito al
  fallar la validación; un descuento en cero se muestra como `-0.00 Bs`.

**No es defecto, pero explica la lentitud local:** una petición tardó 5,2
minutos, de los cuales 5,2 fueron de Next. Justo antes, Turbopack escribió su
caché de desarrollo durante 5 minutos, bloqueando el servidor. Escrito el caché,
la misma página sirve en 357 ms.

**Decisión de Dirección: el plan llega hasta staging.** Las Tareas 13 a 20
—backup productivo, gate de seguridad, despliegue, documentación y los cuatro
lanzamientos por etapa— se movieron a
[tasks-produccion.md](./tasks-produccion.md), congeladas. Primero se resuelve
todo lo que falla; desplegar un defecto conocido cuesta más caro que arreglarlo
antes. La Tarea 12 no cierra hasta que 12B, 12C y 12D cierren.

### 2026-08-26 — Tarea 12: Ensayo Listo, Staging Bloqueado Por Dos Secretos

**Las ocho barreras de aislamiento funcionan.** Se verificaron una por una
levantando una configuración válida de staging y rompiéndola de a un campo: base
productiva, dominio productivo, schema compartido, comunicaciones habilitadas,
analytics real, ambiente productivo, Blob de media productivo y falta del Blob
clínico. Las ocho bloquean, y la configuración correcta sí pasa.

**El ensayo quedó como script:** `pnpm stage-one:rehearse` recorre los once pasos
de la Etapa 1 —encender módulos, producto con stock, abrir Caja, alta de cliente
sin visita, venta con descuento de stock, cobro, recibo, egreso, compra con
recepción y lote, suspender y reactivar un módulo, cerrar Caja— y **verifica cada
uno**. Ejecutado contra PostgreSQL real: 11 pasos sin defectos, con la Caja
cuadrando en 35 Bs y diferencia cero.

Corre solo contra bases `staging`, `test` o `dev`, exige confirmar el nombre a
mano y marca todo lo que crea con el prefijo `ENSAYO-<fecha>`.

**Dos reglas del negocio que el ensayo documentó ejecutándolas:** una compra en
efectivo se paga al confirmarla y no admite pago aparte; un cierre que cuadra no
pasa por Dirección.

**Staging no puede arrancar:** faltan `STAGING_CLINICAL_BLOB_READ_WRITE_TOKEN` y
`PAYLOAD_SIGECO_INTEGRATION_SECRET`. Además tiene 12 de 66 migraciones aplicadas
y la rama está 175 commits atrás. Nada de eso es código.

Detalle: [reporte de tarea](../task-reports/2026-08-26-lanzamiento-tarea-12-staging-ensayo.md).

### 2026-08-25 — Tarea 11 Implementada (CI Remoto Y Cierre Acumulado)

**Los seis controles pasan juntos por primera vez:** lint 14,6 s, typecheck,
480 pruebas unitarias en 93 archivos, 94 de integración en 24 archivos con las 67
migraciones desde base vacía, build y auditoría de dependencias.

Las pruebas de integración nunca se habían ejecutado. Arrancaron con **18 fallos
de 94** y destaparon:

- **Un defecto real de once días:** el commit `fa15696` fijó
  `requiresInventoryEntry` en `false`, y `createPurchaseDraftRecord` exige ese
  campo en `true` para enlazar un gasto urgente con una orden de compra. La
  trazabilidad "compra urgente → orden → stock" era imposible. Se restauró el
  campo como opcional; **queda decisión de Dirección** sobre si el diálogo debe
  volver a preguntarlo o si el enlace se retira.
- **Una regla sin pruebas:** el rechazo de una Caja de otro día
  (`session_stale_open`, 2026-08-14) rompió cinco archivos de integración sin que
  nadie se enterara. Los fixtures usaban fechas escritas a mano.
- **Contaminación entre archivos:** seis pruebas hacen
  `TRUNCATE … "InternalUser" CASCADE`, y PostgreSQL propaga a `ModuleActivation`.
  Mis pruebas de módulos ahora preparan su propio estado base.
- Dos fixtures míos que no respetaban el orden de dependencias, y un texto que
  cambió sin que la prueba siguiera.

**Dependencias:** cinco de siete vulnerabilidades altas resueltas con versiones
forzadas en `pnpm-workspace.yaml`; las dos de `image-size` no tienen corrección
publicada y quedaron aceptadas explícitamente con su justificación.

**`pnpm lint` volvió a ser usable:** ESLint 9 recorría `.data/` (47 MB de
adjuntos locales). De no terminar, a 14,6 segundos.

**Ejecución remota en verde.** El workflow no estaba sin publicar como decía el
plan: existía y llevaba en rojo desde el 9 de agosto. Fallaba porque `pnpm test`
y `pnpm test:integration` no generaban el cliente de Prisma, que vive en
`src/generated/` y no se versiona; en un checkout limpio ningún archivo que
importara Prisma podía cargar. `typecheck` y `build` sí lo generaban, y por eso
esos dos jobs pasaban. Corregido en los cuatro scripts de prueba.

Ejecución `32868540365`: los cinco jobs en verde. Auditoría 31 s, Quality 1 m 24 s,
Integración 2 m 55 s, Build 1 m 30 s, Unitarias 1 m 35 s.

**Protección aplicada** en `staging` y `main`: cinco checks obligatorios con
`strict`, cero aprobaciones —trabaja una sola persona y GitHub no deja aprobar el
propio PR—, `enforce_admins` activo, sin force-push ni borrado, y auto-merge
habilitado. `develop` queda libre a propósito.

**Para informar:** el repositorio es público. No hay fuga de datos, pero la matriz
de permisos y los controles de seguridad son legibles por cualquiera. Conviene
revisarlo antes de operar con datos reales.

Detalle: [reporte de tarea](../task-reports/2026-08-25-lanzamiento-tarea-11-cierre-acumulado-ci.md).

### 2026-08-24 — Tarea 10B Implementada (Deuda Previa Al Plan)

- **Fuga corregida:** el ingreso fallido dejaba el correo del usuario en la URL
  desde el 2026-08-18 (commit `7c7a430`), y de ahí pasaba al historial, a los
  logs y al `Referer`. Ahora viaja en una cookie de dos minutos, `httpOnly`,
  limitada a la ruta del login y borrada al ingresar bien. El formulario sigue
  llegando con el correo escrito.
- **Mapa de permisos al día:** `security-boundaries` declaraba 94 acciones y
  existían 104. Mientras estuvo desfasado, ese control dejó de avisar si una
  acción nueva quedaba con el permiso equivocado.
- **Acción de lectura documentada:** `validateAttributionEvidenceCodeAction` se
  sumó a `nonCriticalReadActions`, el mecanismo que ya existía para consultas que
  validan permiso y no escriben.
- **Campo opcional que no lo era:** `paidStudyOrderSchema.total` fallaba si la
  clave no llegaba, pese a documentarse como opcional. Se corrigió el esquema, no
  la prueba.
- **`pnpm test`: 93 archivos, 479 pruebas, 0 fallos.** Primera suite
  completamente verde desde el 2026-08-02.
- Anotado para después: `optionalMoneyString` en `sale.schema.ts` repite la forma
  frágil que provocó el fallo de `total`.
- Estado: **En progreso** según el gate del plan. Detalle:
  [reporte de tarea](../task-reports/2026-08-24-lanzamiento-tarea-10b-deuda-previa.md).

### 2026-08-24 — Ajustes Al Plan Tras Diagnosticar La Deuda Previa

Decisiones de Dirección después de revisar qué quedaba fuera del plan:

- **Tarea 10B nueva.** Los cinco fallos que se venían arrastrando no eran todos
  tests desactualizados. Se les da tarea propia en vez de esconderlos dentro del
  cierre acumulado de la Tarea 11, que además asumía una suite verde que no
  existe. Se numera `10B` para no invalidar las referencias de los reportes ya
  publicados.
- **Formas de cobro sin uso, a la Tarea 10.** `card`, `transfer` y `other` siguen
  activas aunque la interfaz solo ofrezca efectivo y QR; es limpieza de datos de
  la base que se va a usar, igual que los precios.
- **Guía operativa adelantada a la Tarea 15.** Estaba en la 16, que va después
  del lanzamiento: sin la guía escrita antes, la capacitación de Administración
  se hace de memoria. Los reportes atrasados sí se quedan en la 16.

### 2026-08-24 — Tarea 10 Implementada Parcialmente (Datos Maestros De La Etapa 1)

- **Los datos no los puede poner el desarrollo.** Productos, precios, umbrales,
  proveedores, conteo físico y personal los tiene la clínica; inventar un precio
  sería peor que no cargarlo, porque se cobra igual que uno real. Se entrega la
  herramienta completa y la tarea queda esperando los datos.
- `pnpm stage-one:check` revisa sin corregir: módulos de la Etapa 1 encendidos,
  El Alto activa, ausencia de datos de prueba, productos con precio y unidad,
  **stock igual a la suma de sus movimientos**, personal mínimo y formas de cobro.
  Termina con error si falta algo bloqueante.
- `pnpm stage-one:load` carga proveedores, productos y catálogo desde un archivo
  que la clínica completa. Exige el nombre de la base escrito a mano y un
  responsable con cuenta activa, rechaza códigos `DEMO-`/`QA-`, falla con
  mensaje concreto si falta un dato y es idempotente.
- El stock entra como **movimiento de inventario** con la cantidad contada, el
  responsable y el motivo del conteo, no como número escrito a mano.
- Plantilla en `docs/operations/plantillas/` y procedimiento en
  [stage-one-master-data.md](../../operations/stage-one-master-data.md). El
  archivo real vive en `.data/`, que no se versiona.
- **Hallazgos:** la base de desarrollo no pasaría la verificación (30 productos y
  13 ofertas de demostración, 3 proveedores y 1 usuario de prueba, nadie con rol
  Administración), y quedaron activas formas de cobro que la interfaz ya no
  ofrece —`card`, `transfer`, `other`— que conviene desactivar antes de lanzar.
- Al limpiar la prueba, PostgreSQL rechazó borrar el movimiento de stock: la
  garantía append-only funcionando. Se neutralizó con un ajuste compensatorio.
- Validación: typecheck y lint limpios; 474 de 479 pruebas. Cargador probado
  contra desarrollo: precio, umbral, unidad y stock correctos, movimiento con su
  motivo y clave, reintento sin duplicar, y las cinco barreras rechazando con
  mensaje accionable.
- Estado: **En progreso**, a la espera de los datos de la clínica. Detalle:
  [reporte de tarea](../task-reports/2026-08-24-lanzamiento-tarea-10-datos-maestros.md).

### 2026-08-24 — Tarea 9 Implementada (Listado Y Búsqueda De Ventas)

- `getSalesPage`, `countSales` y `getSalesPageTotals` comparten una sola
  condición: cliente, estado, fechas y sucursal. La búsqueda es del cliente y
  reutiliza `patientSearchWhere`, así que sirve nombre, teléfono, código interno
  y alias de una ficha fusionada.
- Los totales suman el **conjunto filtrado**, no la página visible: sumar solo lo
  que se ve daría otro número al pasar de página y haría dudar del sistema.
- `/sigeco/administracion/ventas` con tres indicadores, filtros por cliente,
  estado y fecha, tarjetas en móvil y tabla en escritorio con fecha, cliente,
  conceptos, total, saldo, estado y quién registró. Una venta sin visita se marca
  como **Mostrador**.
- Los estados salen del modelo: "Sin cobrar" (`pending`) y "Con saldo"
  (`partial`) quedaron separados. Juntarlos, como sugería el texto del plan,
  habría escondido la diferencia que sirve para saber a quién reclamar.
- Fechas por período —hoy, 7 días, 30 días, cualquiera— igual que Recepción: se
  opera con un toque en el teléfono y evita rangos mal escritos.
- Validación: typecheck y lint limpios; 474 de 479 pruebas unitarias. Verificado
  contra la base de desarrollo con sus seis ventas reales: la paginación devolvió
  cinco de seis, los conceptos mostraron los primeros con su cantidad real, la
  búsqueda por nombre acertó, los filtros dieron 1 con saldo y 4 pagadas, y los
  totales del listado coincidieron exactamente con la suma directa de la tabla.
- Estado: **En progreso** según el gate del plan. Detalle:
  [reporte de tarea](../task-reports/2026-08-24-lanzamiento-tarea-9-listado-ventas.md).

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
