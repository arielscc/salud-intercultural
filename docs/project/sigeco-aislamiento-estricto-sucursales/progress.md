# Progress — Aislamiento Operativo Y Continuidad Clínica Por Sucursal

Última actualización: 2026-09-11.

Plan: [tasks.md](./tasks.md)

## Estado General

Plan híbrido dividido en 17 tareas consecutivas. La frontera técnica ya cuenta
con un contrato ejecutable, un detector automático, un contexto autenticado de
sucursal obligatorio y roles operativos resueltos desde cada membresía. La
identidad queda global y solo conserva la capacidad de plataforma del super
administrador. La partición general de operaciones y RLS están implementados en
código; las migraciones todavía no se aplicaron. La identidad global del
paciente y su expediente por sucursal ya están separados. Leads, campañas,
entradas públicas y atribución ya exigen una
sede verificable y sus métricas se calculan localmente. El recorrido completo
de una visita —recepción, estados, ruta, pasos, trabajos, abandonos y tiempos—
ya materializa la sede y usa relaciones compuestas. La migración
`20260908120000_require_explicit_branch_code` queda vigilada por el detector:
elimina siete defaults de El Alto y hace explícitas las principales escrituras
operativas. Enfermería, estudios, adjuntos clínicos y paquetes de sesiones ya
materializan la sede; la continuidad de Enfermería queda separada de la historia
diagnóstica y los archivos usan permisos breves ligados al contexto activo.
Compras, recepciones, lotes, movimientos y alertas ya operan contra saldos
locales; el total global de inventario fue retirado y cada traslado conserva dos
comprobantes conciliados, uno por sede. Ventas, pagos, Caja y documentos también
quedaron materializados por sede. Seguimientos, recordatorios supervisados y
opiniones ya tienen tenencia directa; sus KPI usan conteos locales y los enlaces
públicos de opinión incorporan la sucursal emisora. Módulos y auditoría
distinguen operación local de eventos de plataforma. El barrido acumulado
cerró los últimos enlaces simples entre operaciones, particionó la idempotencia
por sede y añadió un chequeo SQL que enumera y rechaza cruces residuales. La
segunda barrera ya está preparada: PostgreSQL fuerza RLS sobre los 89 modelos
operativos, controlados y de auditoría; Prisma instala un contexto local por
transacción y la cuenta web queda separada del rol técnico propietario.

## Decisiones Confirmadas Por Dirección

- Todas las sucursales pertenecen a una sola clínica y entidad.
- El paciente conserva una identidad y contacto globales.
- Cada visita e historia clínica pertenece a la sede donde ocurrió.
- Médicos y enfermería pueden consultar antecedentes de otras sedes, en solo
  lectura, auditados y limitados a la información de su rol, porque rotan entre
  sucursales.
- Actualizar el contacto maestro de un paciente o proveedor se refleja para
  toda la clínica.
- Productos y proveedores conservan identidad global; stock, precios,
  condiciones y operaciones son locales.

## Resumen

| Estado | Cantidad |
| --- | ---: |
| Pendiente | 1 |
| En progreso | 2 |
| Bloqueada | 0 |
| Terminada | 14 |

## Progreso Por Fase

| Fase | Tareas | Estado | Resultado esperado |
| --- | --- | --- | --- |
| A. Frontera técnica | 1-4 | Terminada (4/4) | Contrato, contexto, roles y backfill seguro |
| B. Partición de dominios | 5-13 | Terminada en código (9/9; 7 con validación estática aprobada) | Maestros únicos y operaciones pertenecientes a una sede |
| C. Base de datos y cierre | 14-17 | En progreso (3/4) | Auditoría local, constraints, RLS y QA acumulado |

## Estado Por Tarea

| # | Tarea | Prioridad | Estado | Dependencias |
| --- | --- | --- | --- | --- |
| 1 | Contrato de tenencia y detector automático | P0 | Terminada | Ninguna |
| 2 | Contexto central de sucursal en servidor | P0 | Terminada | 1 |
| 3 | Roles y permisos por sucursal | P0 | Terminada | 2 |
| 4 | Herramientas de backfill y reconciliación | P0 | Terminada | 1-3 |
| 5 | Identidad global y expediente local del paciente | P0 | Terminada | 4 |
| 6 | Leads, campañas y entradas públicas | P0 | Terminada | 2, 4-5 |
| 7 | Visitas, recepción, rutas y tiempos | P0 | Terminada | 5 |
| 8 | Consulta, recetas, órdenes y catálogos clínicos | P0 | Implementada; validación acumulada pendiente | 7 |
| 9 | Enfermería, estudios, adjuntos y sesiones | P0 | Implementada; validación acumulada pendiente | 7-8 |
| 10 | Maestros comerciales y configuración por sucursal | P0 | Implementada; validación estática aprobada | 4 |
| 11 | Compras, stock, lotes, traslados y alertas | P0 | Implementada; validación estática aprobada | 10 |
| 12 | Ventas, pagos, Caja y documentos | P0 | Implementada; validación estática aprobada | 5, 7, 10-11 |
| 13 | Seguimientos, recordatorios, opiniones y reportes | P0 | Implementada; validación estática aprobada | 5-12 |
| 14 | Módulos y auditoría operativa | P0 | Terminada | 2-3, 13 |
| 15 | Barrido completo de aplicación y constraints | P0 | Terminada | 5-14 |
| 16 | PostgreSQL Row-Level Security | P0 | Terminada | 15 |
| 17 | Cierre acumulado y despliegue controlado | P0 | Pendiente | 1-16 |

## Preparación Ya Disponible

- Contrato canónico para los 112 modelos Prisma y chequeo automático de
  modelos, campos, relaciones, defaults y fallbacks de sucursal.
- Deuda heredada registrada con coincidencia exacta, responsable y tarea de
  retiro: 23 excepciones de modelo y 18 hallazgos de código asignados a tareas
  posteriores.
- `BranchRequestContext` resuelve usuario, asignación, sede activa y rol
  operativo exclusivamente desde sesión y membresías activas.
- `InternalUser` conserva la identidad y la capacidad global de plataforma;
  `InternalUserBranch` conserva rol, estado y sede predeterminada.
- Médicos y enfermería pueden mantener el mismo rol clínico activo en varias
  sedes por rotación. Los demás roles operativos conservan una sola sede activa.
- El selector clínico distingue `Trabajar en esta sucursal` de `Solo consultar`:
  la sede predeterminada es la única que admite escrituras y cambiarla no borra
  ninguna asignación ni dato histórico.
- Los superadministradores usan una sola cuenta y reciben todas las sedes
  activas o en preparación; cada request continúa limitado a la sede elegida.
- Caja, compras, seguimiento, opiniones, recordatorios y selección de personal
  validan pertenencia y rol en la sucursal de la operación.
- Páginas, Server Actions, APIs, documentos y jobs tienen fronteras explícitas;
  las acciones con IDs operativos comprueban la pertenencia antes de mutar.
- Una cookie inválida o la falta de sede conduce a selección segura y nunca a
  El Alto ni a la primera sucursal de la consulta.
- Activación de módulos materializada por sucursal.
- Selector de sucursal limitado a asignaciones del usuario.
- Superadministradores asignados a las sucursales existentes.
- Dashboard y varios flujos operativos ya filtran la sede activa.
- Migración preparada para retirar defaults de El Alto en siete tablas.
- Reconciliador determinista con `dry-run`, decisiones manuales por ID técnico,
  checksums antes/después y bloqueo explícito de `SET NOT NULL` ante pendientes.
- Primer adaptador para los accesos históricos de usuarios, compatible con el
  esquema anterior y posterior a la migración de roles por sucursal.
- `Patient` conserva una identidad corporativa única y versionada;
  `PatientBranchRecord` contiene estado, ficha y datos clínicos locales.
- Recepción dispone de coincidencia global exacta y crea la relación local sin
  duplicar; listas, fichas aproximadas y acceso de Administración quedan
  limitados a la sede activa.
- Visitas conservan una fotografía inmutable del nombre, documento, teléfono y
  dirección; los consentimientos de contacto y las notas tienen sucursal.
- El reconciliador de pacientes separa la migración estructural del
  endurecimiento para que ninguna ambigüedad clínica se resuelva por defecto.
- El formulario público resuelve la sede antes de persistir PII mediante una
  prueba firmada, hostname o configuración fija de servidor; un campo editable
  del navegador nunca decide ownership.
- Las campañas corporativas tienen asignaciones explícitas y sus leads,
  atribuciones, dashboards, deduplicación, idempotencia y exportaciones quedan
  limitados a una sede.
- Los reconciliadores de leads Prisma y Payload reportan únicamente IDs
  técnicos y el endurecimiento bloquea cualquier fila histórica pendiente.
- Visitas, check-ins, estados, rutas, pasos, trabajos, abandonos y eventos de
  tiempo exigen la sede y quedan unidos mediante claves compuestas.
- Las bandejas, detalles, derivaciones, reportes y el dashboard de recepción
  reciben una sucursal obligatoria; una ruta activa de Cochabamba no aparece en
  los conteos de El Alto.
- Estudios, signos vitales, aplicaciones, notas y resultados de Enfermería,
  paquetes y usos de sesiones exigen sede y relaciones compuestas con visita,
  expediente, orden o trabajo según corresponda.
- La continuidad de Enfermería exige rol local activo, visita, motivo y
  consentimiento. Dura 15 minutos y muestra únicamente signos, aplicaciones,
  notas, sesiones, órdenes necesarias y adjuntos de estudios de Enfermería.
- Los adjuntos incorporan la sede en metadatos, idempotencia, checksum, claves
  de storage y grants. Una lectura remota requiere la continuidad autorizada;
  cada grant dura dos minutos, se usa una vez y revalida usuario, rol y sede.
- El reconciliador de claves de archivos es `dry-run` por defecto y permite
  mover archivos antiguos después de la expansión, sin imprimir datos clínicos.
- Las compras y toda su evidencia materializan la sede; producto, proveedor,
  Caja, recepción, lote y documento se validan contra la misma operación local.
- `BranchInventoryBalance` es el único saldo materializado y se concilia con el
  libro append-only de movimientos de su sucursal. Las alertas y FEFO usan esa
  misma frontera y ya no existe un total operativo global en `InventoryItem`.
- Cada traslado genera una salida y una entrada inmutables en una sola
  transacción. La sede ve su comprobante local y Dirección puede contrastar
  ambos lados y la continuidad de lotes.

Estos avances no equivalen a aislamiento completo y no permiten adelantar la
Tarea 16.

### Tarea 8 — Implementación

- Consultas, versiones, diagnósticos, planes, resultados, recetas, ítems,
  evoluciones, notas y órdenes exigen sucursal y relaciones compuestas.
- Los catálogos clínicos conservan definiciones globales, con activación y
  frecuencia de uso locales. Las semillas requieren `--branch=<codigo>`.
- El perfil profesional se configura por usuario y sede; la receta usa el
  perfil de la sucursal de atención.
- La historia transversal se solicita desde un paciente/visita, solo por un
  médico asignado, con motivo y consentimiento de continuidad. El acceso
  registrado dura 15 minutos; se revalidan rol, asignación y consentimiento.
  Las visitas muestran su origen en modo de solo lectura. Las precargas para
  editar conservan exclusivamente la sede activa.
- Migraciones de expansión y endurecimiento preparadas, sin aplicar a una base.
  Los perfiles con varias sedes requieren atribución explícita antes de endurecer.
- Detalle y operación: [reporte T8](../task-reports/2026-09-10-tarea-8-consulta-recetas-ordenes-catalogos.md).

### Tarea 9 — Implementación

- La sede se volvió obligatoria para estudios, signos vitales, aplicaciones y
  notas de Enfermería, resultados de trabajos, adjuntos y paquetes/usos de
  sesiones. Las relaciones compuestas impiden enlazar padres de otra sede.
- Las cuatro APIs de adjuntos resuelven el usuario, rol y sucursal activos. El
  acceso ordinario solo encuentra archivos locales; la lectura remota exige un
  acceso de continuidad médica o de Enfermería válido y no habilita escritura.
- Enfermería dispone de una vista transversal limitada y auditada, sin
  diagnósticos, planes, recetas, evoluciones ni notas médicas.
- La aplicación de un insumo valida la visita de la sede antes de descontar el
  inventario local. Los paquetes y sus consumos tampoco cruzan sucursales.
- Migraciones de expansión y endurecimiento preparadas, sin aplicar. Los grants
  efímeros anteriores se revocan porque su sede histórica no es demostrable; no
  se elimina ningún adjunto. Las claves antiguas se reconcilian con el script
  seguro antes del endurecimiento.
- Detalle y operación: [reporte T9](../task-reports/2026-09-10-tarea-9-enfermeria-estudios-adjuntos-sesiones.md).

### Tarea 10 — Implementación

- Maestros comerciales globales y configuración de proveedor, producto, servicio
  y medio de pago quedan separados por sucursal.
- Inventario, Compras, Catálogo, Enfermería, Estudios, Órdenes y cobros leen la
  configuración local y rechazan maestros no habilitados en la sede activa.
- El alta inline de compras admite productos nuevos y conserva sus datos
  canónicos/locales sin duplicar identidades globales.
- La composición canónica de tratamientos se valida contra todas sus sedes y
  la cobertura preparada comprueba identidad compartida, configuración local y
  rechazo de catálogos comerciales no habilitados.
- Migración expansiva, endurecimiento y reconciliador explícito preparados, sin
  ejecución sobre ninguna base.
- Detalle y operación: [reporte T10](../task-reports/2026-09-10-tarea-10-maestros-comerciales-configuracion-sucursal.md).

### Tarea 11 — Implementación

- Compras, líneas, pagos, recepciones, documentos, lotes, ajustes, movimientos,
  traslados y alertas exigen sucursal y usan relaciones compuestas donde existe
  un padre operativo local.
- El saldo global de `InventoryItem` fue eliminado. Cada escritura actualiza el
  saldo local y registra su movimiento; constraints diferidos impiden cerrar
  una transacción si ambos valores no reconcilian.
- FEFO solo recorre lotes disponibles de la sede activa. Un lote creado por
  traslado conserva la trazabilidad mediante la asignación origen/destino, sin
  enlazarse a la compra de otra sucursal.
- Cada traslado exige dos sedes y configuraciones activas, autorización sobre
  ambas, stock suficiente y comprobantes de salida/entrada simétricos.
- Migraciones de expansión y endurecimiento preparadas, sin aplicar. El nuevo
  reconciliador es `dry-run` por defecto, no modifica movimientos y exige una
  decisión explícita para alertas históricas ambiguas.
- Detalle y operación: [reporte T11](../task-reports/2026-09-10-tarea-11-compras-stock-lotes-traslados-alertas.md).

### Tarea 12 — Implementación

- Ventas, líneas, pagos, entregas, sesiones, movimientos, conciliaciones,
  egresos y beneficiarios quedan sujetos a relaciones compuestas por sucursal.
- Los cobros, descuentos, correcciones y cierres bloquean y consultan sus
  registros dentro de la sede activa; no existen listados ni agregaciones
  monetarias con sucursal opcional.
- Los documentos generados materializan la sede. Sus números, versiones y
  huellas se particionan por sucursal, y lectura, impresión, descarga, anulación
  o restauración tratan un ID de otra sede como inexistente.
- Migraciones de expansión y endurecimiento preparadas, sin aplicar. El
  diagnóstico de Caja es de solo lectura y nunca reescribe evidencia financiera.
- Detalle y operación: [reporte T12](../task-reports/2026-09-10-tarea-12-ventas-pagos-caja-documentos.md).

### Tarea 13 — Implementación

- Intentos e historial de seguimiento, plantillas, versiones de reglas,
  candidatos y eventos de revisión materializan `branchCode` y se enlazan a
  padres, expedientes y responsables mediante claves compuestas.
- Solicitudes, respuestas, casos y eventos de opinión quedan bajo la sede de la
  visita. Los enlaces públicos incluyen la sede en el token y la búsqueda usa
  `(branchCode, tokenHash)`; sustituir el prefijo invalida el acceso.
- Bandejas, resúmenes y KPI de continuidad/calidad filtran directamente la sede.
  La comparación corporativa de `/sigeco/sucursales` sigue siendo la única vista
  transversal explícita y conserva su autorización exclusiva para Dirección y
  super administración.
- Migraciones expansiva y de endurecimiento preparadas, sin aplicar. El
  reconciliador es `dry-run`, solo admite decisiones explícitas para plantillas
  sin padre y no modifica evidencia de seguimientos u opiniones.
- Detalle y operación: [reporte T13](../task-reports/2026-09-10-tarea-13-seguimientos-recordatorios-opiniones-reportes.md).

### Tarea 14 — Implementación

- El historial de módulos exige una sede y dejó de mostrar los 13 eventos
  legacy como si pertenecieran simultáneamente a todas las sucursales.
- Auditoría distingue `platform` de `branch`; toda acción operativa materializa
  la sede y PostgreSQL prepara un `CHECK` que rechaza combinaciones inválidas.
- Dirección consulta solo la auditoría de la sede activa. La auditoría global de
  autenticación, identidad, membresías y mantenimiento exige
  `platformRole=super_admin`.
- Las lecturas transversales de médicos y enfermería registran paciente, sede
  solicitante, sedes de origen y motivo sin copiar contenido clínico.
- Migraciones expansiva y de endurecimiento preparadas, sin aplicar. El
  reconciliador es `dry-run` y exige decisión explícita y checksum para cada
  evento histórico ambiguo.
- Detalle y operación: [reporte T14](../task-reports/2026-09-11-tarea-14-modulos-auditoria-operativa.md).

### Tarea 15 — Implementación

- El detector recorre código productivo y scripts, rechaza sucursales
  predeterminadas y exige idempotencia compuesta en cada modelo operativo.
- Las relaciones de historial de consentimientos, movimiento/venta,
  movimiento/renglón y paquete/venta incluyen la sede en la FK; un ID global
  ya no basta para formar esos enlaces.
- Venta, pago, Caja, compra, recepción, ajustes y movimientos usan claves de
  idempotencia locales. El traslado las particiona por su sede de origen.
- Los accesos residuales por ID de compras, lotes, estudios pagados y el ensayo
  de lanzamiento fueron reforzados con el mismo ámbito de sucursal.
- `pnpm branch:isolation:sql` enumera filas sin sede y cruces redundantes entre
  paciente/visita, venta/pago, Caja, compra/recepción/lote y documento/fuente;
  falla si cualquier conteo no es cero.
- Los seeds, ensayos, verificaciones y simulacros ya no eligen El Alto ni
  Cochabamba por omisión: exigen una variable de sede explícita.
- Migración de constraints preparada, sin aplicar. El chequeo SQL se ejecutará
  contra las bases restauradas y de staging durante la Tarea 17.
- Detalle y operación: [reporte T15](../task-reports/2026-09-11-tarea-15-barrido-aplicacion-constraints.md).

### Tarea 16 — Implementación

- La migración crea `sigeco_web` sin ownership, `BYPASSRLS`, administración de
  roles, creación de schema ni `TRUNCATE`, y separa `sigeco_maintenance` como
  propietario técnico. Ninguno recibe una contraseña desde el repositorio.
- Las 86 tablas de operación, los dos accesos transversales controlados y
  `AuditEvent` activan y fuerzan RLS. `USING` limita lecturas y `WITH CHECK`
  rechaza escrituras cuya sede no sea la activa o cuyo modo sea consulta.
- Cada unidad Prisma con contexto corre en una transacción interactiva y fija
  `app.branch_code`, usuario, rol, modo y acceso temporal mediante
  `set_config(..., true)`. Los valores mueren al cerrar la transacción y no
  contaminan otra solicitud que reutilice la conexión.
- Super administración y Dirección no reciben bypass: operan en la sede
  seleccionada. La lectura remota exige médico o Enfermería activos, paciente,
  consentimiento vigente, motivo, sede solicitante, sedes consultadas y acceso
  no vencido; ninguna política transversal habilita escritura.
- Enfermería queda restringida a signos, aplicaciones, notas, sesiones,
  órdenes de su área y adjuntos derivados de estudios de Enfermería. El
  contexto temporal se restaura al terminar la consulta y los grants de
  archivos revalidan sede, usuario, rol y vencimiento.
- Campañas y métricas técnicas iteran sucursales explícitamente. Prisma CLI,
  seeds, reconciliaciones y herramientas administrativas admiten
  `MAINTENANCE_DATABASE_URL`; staging y producción ya no pueden ejecutar el
  wrapper técnico usando silenciosamente la credencial web.
- El detector exige roles, ownership, `ENABLE/FORCE ROW LEVEL SECURITY`, una
  política materializada para todo modelo no global y los seis parámetros
  transaccionales RLS. No quedan excepciones temporales.
- Migración preparada, sin aplicar. La matriz negativa, la reutilización real
  del pool y las pruebas contra una restauración/staging corresponden al cierre
  acumulado de la Tarea 17.
- Detalle y operación: [reporte T16](../task-reports/2026-09-11-tarea-16-postgresql-row-level-security.md).

## Próximo Paso

Ejecutar la Tarea 17: cierre acumulado y despliegue controlado. Allí se aplican
las migraciones sobre bases desechables/restauradas y staging, se ejecuta la
matriz negativa completa y se valida el pool con los roles provisionados.
