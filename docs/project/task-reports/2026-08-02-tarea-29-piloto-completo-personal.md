# Tarea 29 — Piloto Completo Con El Personal

Fecha: 2026-08-02. Entorno modificado: desarrollo local.

## Objetivo

Preparar el piloto operativo con el personal y ejecutar un ensayo técnico
completo antes de usar SIGECO en la operación real de El Alto.

## Resultado

- Se convirtió la guía general en un procedimiento reproducible de 30 casos,
  con orden fijo, responsables, rutas, campos, valores exactos, errores
  controlados, resultados esperados y evidencia.
- Se agregó un juego maestro identificable mediante `P29-R01`: paciente,
  consentimientos, consulta, orden de Enfermería, propuesta, dos productos,
  proveedor, dos compras, lotes, venta, seguimiento, reclamo, Caja y abandono.
- Se documentaron las rutas de cada pantalla y cómo conservar los IDs dinámicos
  que genera SIGECO.
- Se incluyeron permisos positivos y negativos por rol, responsabilidades
  separadas para Marlen y Yazmin, pruebas en teléfono/tableta/computadora,
  conexión lenta, doble envío, corte largo e incidente de sesión perdida.
- Se documentaron los documentos que deben resultar: receta, comprobante,
  cierre de Caja, compra, recepción, adjunto ficticio, contingencia, incidente
  y acta de aprobación.
- Se agregaron plantillas para evidencia, defectos, reconciliación y firma por
  área.
- La guía advierte que una visita creada manualmente desde Recepción no recibe
  automáticamente `isTestData=true`; por eso el recorrido completo comienza
  en desarrollo local y solo después se repite en staging sintético.
- Se ejecutó un recorrido local con un paciente completamente ficticio.
- Llegada, procedencia, fuente Facebook, consulta, firma, propuesta aceptada,
  venta, pago, comprobante, consentimiento, seguimiento y retorno quedaron
  enlazados.
- Se registró una corrección clínica como versión nueva, conservando la
  anterior.
- Se registró otro recorrido como abandono; el motivo, el punto y los
  pendientes permanecieron visibles y bloqueados.
- Caja abrió con Bs 100 ficticios, registró Bs 1 de cobro, Bs 10 de almuerzo y
  Bs 10 de compra urgente. Cerró con Bs 81 y diferencia cero.
- Una compra ficticia a crédito recibió 2 unidades de `Suero QA V3` en el lote
  `LOTE-PILOTO-29`, con costo Bs 3, ubicación separada y vencimiento propio el
  2 de agosto de 2027.
- El dashboard fue revisado en 390 × 844, 820 × 1180 y 1440 × 900 sin
  desbordamiento horizontal.
- El rol Recepción mostró solo sus módulos y un acceso directo a Consulta fue
  rechazado y redirigido. La cuenta local quedó restaurada a
  `super_admin` al finalizar.
- No se detectaron defectos críticos en el ensayo técnico.

## Archivos Modificados

- `docs/operations/staff-pilot.md`
- `docs/operations/README.md`
- `docs/project/sigeco-mejoras-integrales/tasks.md`
- `docs/project/sigeco-mejoras-integrales/progress.md`
- `docs/project/task-reports/README.md`
- `docs/project/task-reports/2026-08-02-tarea-29-piloto-completo-personal.md`

## Evidencia Local

- Paciente sintético: `SI-000013`, claramente identificado como piloto.
- Comprobante interno pagado y emitido en versión 1.
- Consulta finalizada y corregida con historial de versiones.
- Seguimiento realizado por WhatsApp, único canal autorizado, con resultado
  “Quiere volver”. No se envió ningún mensaje real.
- Caja cerrada y lote disponible con trazabilidad hasta la compra y recepción.
- Capturas y reporte de QA guardados localmente bajo `.gstack/qa-reports/`.

## Decisiones

- La Tarea 29 pasa de `Pendiente` a `En progreso`, no a `Terminada`.
- El ensayo técnico no sustituye el piloto con empleados, dispositivos físicos,
  red real y aprobación de Dirección.
- El piloto humano empieza en El Alto. Cochabamba permanece en preparación.
- Primero se ejecutan los 30 casos en `develop` y localhost. Después de aprobar
  local se repiten en staging. Cualquier uso de producción exige aviso y
  autorización expresa previa.
- No se inventan firmas ni aprobaciones del personal.
- `docs/operations/staff-pilot.md` pasa a ser la fuente operativa vigente para
  el piloto acumulado de las Tareas 1 a 29. La guía V3.7 permanece como
  referencia del recorrido anterior.
- Cada repetición usa un ID diferente (`P29-R01`, `P29-R02`, etc.) y no borra
  evidencia append-only para aparentar un resultado limpio.
- El reinicio de staging es opcional, destructivo para ese ambiente y exige
  coordinación; nunca se traslada como instrucción a producción.

## Validación

- Navegación autenticada y flujo completo en desarrollo local: aprobado.
- Caja y compra/recepción/lote: aprobados con datos ficticios.
- Corrección append-only y abandono con pendientes bloqueados: aprobados.
- Recepción permitida y Consulta denegada para el rol Recepción: aprobado.
- Responsive automatizado en teléfono, tableta y escritorio: aprobado.
- Lint y TypeScript: aprobados.
- 356 pruebas unitarias y 53 pruebas de integración: aprobadas.
- Control de dependencias y gate de seguridad local: aprobados.
- Build de producción local: aprobado.
- `git diff --check`: aprobado.
- Las rutas fueron comparadas con el árbol actual de páginas de SIGECO y todos
  los enlaces Markdown de la guía apuntan a documentos existentes.
- La ampliación de la guía no modificó código, migraciones, base local, staging
  ni producción.
- Persisten dos avisos conocidos y no bloqueantes: la deprecación de consultas
  concurrentes de `pg` durante integración y el trazado amplio de archivos de
  compras advertido por Turbopack durante el build.

## Pendientes

- Preparar las cuentas QA locales de Médico, Recepción, Enfermería,
  Administración, Seguimiento y Dirección.
- Ejecutar primero los 30 casos en `develop` y localhost con cada empleado.
- Probar teléfonos y tabletas físicas sobre la red real de la clínica.
- Confirmar stock físico, efectivo y responsables reales de El Alto.
- Resolver cualquier defecto crítico y obtener aprobación por área de Dirección.
- Después de aprobar local, preparar migraciones y cuentas para repetir el
  recorrido en staging.
- Avisar y pedir autorización antes de cualquier paso en producción.
- Ejecutar los 30 casos de la guía con `P29-R01` o un ID nuevo, completar las
  tablas de evidencia y obtener la firma real de Dirección.

## Commit Sugerido

`test(sigeco): validate clinic operation`
