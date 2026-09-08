# Aislamiento Operativo Entre Sucursales

Fecha: 2026-09-08.

## Incidente Revisado

Después de registrar un paciente en Cochabamba, el dashboard de El Alto mostró
una visita activa. La inspección directa de la base confirmó dos registros
distintos:

- Cochabamba: una visita creada el 8 de septiembre, activa en Recepción.
- El Alto: otra visita creada el 28 de agosto, también activa en Recepción.

Por tanto, el valor `1` de El Alto no era una réplica ni un conteo de la visita
de Cochabamba. Era una visita antigua propia de El Alto que todavía conserva una
ruta activa. No se la cerró automáticamente porque hacerlo alteraría el
historial asistencial sin una decisión operativa.

## Hallazgos Corregidos

- El dashboard ya no admite una consulta sin sucursal: `branchCode` es
  obligatorio y todas sus métricas filtran la visita asociada.
- Las bandejas, contadores, detalles y acciones de seguimientos estaban sin una
  dimensión materializada de sede. `FollowUpTask` ahora tiene `branchCode`, y la
  creación valida que visita, venta, orden y trabajo correspondan a esa sede.
- Las reglas y candidatos de recordatorios supervisados eran globales. Las
  reglas ahora pertenecen a una sucursal, solo toman fuentes de esa sede y solo
  permiten responsables asignados a ella.
- Opiniones, solicitudes y casos de feedback podían listarse globalmente. Ahora
  se filtran por la sucursal de la visita; crear, reasignar o cancelar valida la
  misma frontera.
- El reporte de abandonos se limitó a la sucursal activa.
- El historial de ventas por paciente se limitó a la sucursal activa.
- Los accesos directos a recibos de venta, documentos versionados, recetas,
  comprobantes de Caja y documentos de Compras validan la sucursal antes de
  devolver contenido.
- La creación de visitas y el ingreso completo de Recepción requieren una sede
  explícita; ya no pueden caer silenciosamente en `el-alto`.

## Fronteras Conservadas Por Diseño

- `Patient` es una ficha maestra única. No se crean copias por sucursal; las
  visitas enlazadas conservan su propia `branchCode`. Esto permite reconocer al
  mismo paciente y preservar continuidad clínica sin mezclar indicadores,
  Caja, ventas, inventario ni trabajo operativo.
- Catálogos de productos, servicios y proveedores son maestros compartidos. El
  stock, los lotes, las compras, los movimientos y las ventas son por sede.
- Usuarios, asignaciones, auditoría y la vista consolidada de Dirección son
  globales de forma intencional y están sujetos a permisos.

## Interfaz

El cambio de sucursal usa ahora el componente de confirmación del sistema:
diálogo centrado en escritorio y panel inferior en móvil. Explica de qué sede se
sale, a cuál se entra y que se recargarán Caja, visitas, compras e inventario.

## Migración

`20260908010000_follow_up_branch_scope`:

- incorpora y rellena `FollowUpTask.branchCode` desde sus relaciones;
- incorpora `SupervisedReminderRule.branchCode`;
- reemplaza la clave global de reglas por `(branchCode, key)`;
- agrega índices y claves foráneas hacia `ClinicBranch`.

La migración queda preparada para el flujo de despliegue. No se aplicó a
staging ni producción durante esta tarea.

## Validación

- `pnpm lint`: aprobado.
- `pnpm typecheck`: aprobado.
- Se agregó una integración de regresión que crea una visita activa en
  Cochabamba y exige cero visitas activas en el resumen de El Alto.
- Por la política vigente del proyecto, pruebas de integración, build y QA de
  navegador quedan para el cierre acumulado.

## Pendiente Operativo

Dirección o Recepción debe revisar la visita de El Alto abierta desde el 28 de
agosto y decidir si continúa en atención o si corresponde registrar un cierre o
abandono. La corrección no toma esa decisión automáticamente.

**Commit sugerido:** `fix(sigeco): aislar datos operativos por sucursal`
