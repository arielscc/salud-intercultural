# Tarea 2: Contexto Central De Sucursal En Servidor

## Fecha

2026-09-09.

## Objetivo

Hacer que toda operación interna obtenga la sucursal desde una autoridad única
del servidor, vinculada a la sesión y a las asignaciones del usuario, sin poder
sustituirla mediante cookies, parámetros, formularios o IDs de otra sede.

## Cambios Implementados

- Se creó `BranchRequestContext`, que reúne identidad autenticada, sucursal
  activa, origen de la asignación, rol operativo, sedes disponibles y capacidad
  de cambio. Hasta la Tarea 3, el rol operativo conserva el rol global actual.
- La resolución se memoiza por request y valida la cookie únicamente contra
  sucursales asignadas y activas. Una cookie inválida se rechaza; no cae en otra
  sede.
- Sin cookie solo se acepta una membresía activa marcada explícitamente como
  predeterminada. Ya no existen fallbacks a El Alto ni a la primera fila.
- Se agregaron fronteras para páginas, selección de sede, APIs, exportaciones y
  jobs. Las APIs distinguen sesión ausente, contraseña pendiente y sucursal no
  resuelta mediante estados seguros.
- Se agregó `/sigeco/seleccionar-sucursal` para recuperar una sesión sin sede
  válida sin renderizar datos operativos.
- El layout interno y las guardas de permisos/módulos exigen el contexto antes
  de cargar el panel. `runAuditedAction` hace lo mismo en las Server Actions y
  adjunta automáticamente la sucursal a la auditoría.
- El cambio obligatorio de contraseña quedó como la única acción auditada sin
  sucursal, mediante una allowlist cerrada. Ninguna otra acción puede declarar
  el modo `branchless`.
- Las acciones con IDs de entidades operativas principales realizan una
  consulta previa por `(id, branchCode)`. Un ID inexistente y uno de otra sede
  reciben el mismo rechazo y la mutación no se ejecuta.
- Los `branchCode` enviados por formularios de Caja, compras, recepciones y
  traslados se comparan contra el contexto; la escritura utiliza siempre el
  código autenticado del servidor.
- Cambiar de sucursal revalida todo el layout `/sigeco` antes de renderizar la
  nueva sede. El selector conserva el modal de confirmación y solo ofrece
  asignaciones activas.
- Los cuatro endpoints privados de documentos y las cuatro rutas de adjuntos
  clínicos exigen la frontera de API. Documentos, recibos y comprobantes se
  consultan con la sucursal activa.
- Los reportes de recorrido y tiempos dejaron de aceptar la sede desde la URL y
  se calculan exclusivamente para la sucursal del contexto.
- La creación y edición de usuarios ya no elige El Alto ni la primera sede si
  falta una asignación predeterminada explícita.

## Protección De IDs Operativos

La frontera común verifica actualmente visitas, tareas de área, ventas,
compras, sesiones y movimientos de Caja, seguimientos, lotes, traslados,
pedidos médicos y documentos generados. La consulta busca directamente dentro
de la sede activa; no realiza una búsqueda global previa que revele existencia.

Los tipos todavía registrados como deuda temporal se materializarán y
endurecerán en sus tareas de dominio. Esta Tarea 2 no reemplaza las relaciones
compuestas ni RLS previstas para las Tareas 5–16.

## Archivos Principales

- `src/features/branches/context.ts`
- `src/features/branches/boundaries.ts`
- `src/features/branches/actions.ts`
- `src/features/branches/active-branch.ts`
- `src/app/(internal)/sigeco/seleccionar-sucursal/page.tsx`
- `src/modules/audit/service.ts`
- `src/modules/database/queries/branch-ownership.ts`
- `src/modules/permissions/index.ts`
- `src/modules/clinical-attachments/api-auth.ts`
- `src/modules/database/queries/branches.ts`
- `src/modules/database/queries/internal-users.ts`
- `src/modules/database/queries/patient-journey.ts`
- `src/modules/database/queries/area-times.ts`

## Decisiones Técnicas

- La cookie selecciona una asignación; nunca concede acceso.
- Las sucursales en preparación pueden estar asignadas, pero no son una sede
  operativa seleccionable hasta pasar a estado activo.
- Un formulario puede conservar `branchCode` para detectar una pestaña vieja,
  pero ese valor es informativo y nunca llega a ser fuente de autoridad.
- Los errores por ID ajeno se registran como `entity_not_found`, igual que un
  ID inexistente, para no confirmar que el dato existe en otra sede.
- Pacientes, proveedores y productos continúan como maestros globales conforme
  al modelo híbrido confirmado por Dirección.

## Validación

- `pnpm lint`: aprobado.
- `pnpm typecheck`: aprobado después de corregir las firmas de la frontera
  auditada. El comando incluyó Prisma, tipos de Payload, rutas de Next.js,
  TypeScript y el detector de tenencia.
- El detector aprobó los 100 modelos y reportó 63 excepciones temporales de
  modelo y 42 hallazgos temporales de código, nueve menos que al terminar la
  Tarea 1.
- Se escribieron casos para cookie manipulada, sede no asignada, ausencia de
  default, discrepancia de formulario e ID operativo ajeno. No se ejecutaron
  pruebas, build, integración ni QA de navegador, de acuerdo con la política
  vigente por tarea.
- El entorno mostró una advertencia porque usa Node `v24.19.0` y el proyecto
  declara Node 22; no afectó las validaciones.

## Pendientes

- Tarea 3: materializar roles y permisos distintos por sucursal.
- Tareas 5–14: completar los campos y relaciones locales de cada dominio,
  retirando las 63 excepciones de modelo y los 42 hallazgos de código.
- Tareas 15–16: cerrar constraints compuestos y habilitar RLS como segunda
  defensa en PostgreSQL.
- Tarea 17: ejecutar pruebas, integración, build y QA acumulado.

**Commit sugerido:** `feat(sigeco): centralize authenticated branch context`
