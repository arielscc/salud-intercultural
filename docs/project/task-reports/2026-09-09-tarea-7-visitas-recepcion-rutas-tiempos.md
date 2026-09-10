# Tarea 7: Visitas, Recepción, Rutas Y Tiempos

## Fecha

2026-09-09.

## Objetivo

Materializar y asegurar la sucursal en todo el recorrido de una visita para
que ninguna cola, contador, estado o evento operativo mezcle sedes.

## Cambios Implementados

- `Visit` conserva `branchCode` obligatorio, enlaza la identidad global con el
  expediente local y hace la idempotencia única por sucursal.
- Check-in, historial de estados, ruta, pasos, tareas, discontinuaciones y
  eventos de tiempo exigen `branchCode` y se relacionan con su padre mediante
  claves compuestas.
- Creación de visitas, derivaciones, abandonos, trabajos de Enfermería y
  Administración, estudios pagados y medición de tiempos propagan la sede
  autenticada en cada lectura y escritura.
- Bandejas, detalles, contadores y reportes del recorrido dejaron de aceptar
  una sede opcional. El dashboard agrupa rutas e historiales directamente por
  la sucursal activa.
- Seeds y pruebas de integración declaran la sede. Se agregó cobertura para el
  rechazo de un hijo asociado a una visita de otra sucursal y se conserva el
  caso de una visita activa de Cochabamba invisible en el dashboard de El Alto.

## Migración Y Reconciliación

- `20260909170000_visit_flow_branch_scope` expande y rellena desde relaciones
  inequívocas ya existentes.
- `20260909180000_harden_visit_flow_branch_scope` bloquea datos incompletos o
  eventos inconsistentes y luego activa `NOT NULL`, unicidad local y FKs
  compuestas.
- No se ejecutaron migraciones ni se modificó ninguna base de datos.

## Decisiones Técnicas

- La identidad del paciente sigue siendo global; la visita y todo su recorrido
  son locales a la sede de atención.
- Se conserva una sola discontinuación, un check-in y una ruta por visita. La
  clave compuesta añade aislamiento sin cambiar esa cardinalidad del negocio.
- `VisitAreaTimeEvent` debe coincidir tanto con la visita como con el paso de
  ruta, evitando una combinación válida por separado pero incoherente entre
  ambas relaciones.
- La Tarea 7 no agrega pantallas ni funciones de negocio nuevas; endurece la
  tenencia de los flujos existentes. Consulta clínica, Enfermería y Caja se
  completan en sus tareas posteriores.

## Validación

- `pnpm lint`: aprobado sin errores.
- `pnpm typecheck`: aprobado; regeneró Prisma/Payload, validó TypeScript y el
  detector confirmó 103 modelos clasificados con 47 excepciones temporales de
  modelo y 32 hallazgos de código para tareas posteriores.
- Ambos comandos mostraron una advertencia porque el proyecto exige Node 22 y
  la sesión actual usa Node 24.19.0; no produjo errores de validación.
- Integración, migraciones reales, build y QA de navegador quedan reservados
  para la Tarea 17 según la política del proyecto.

**Commit sugerido:** `feat(sigeco): enforce branch ownership across visits`
