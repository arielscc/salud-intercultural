# Ajuste Del Plan Al Modelo Híbrido De Sucursales

## Fecha

2026-09-08.

## Objetivo

Actualizar el plan de aislamiento después de confirmar que todas las
sucursales pertenecen a una sola clínica, que los médicos rotan entre sedes y
que los contactos maestros deben actualizarse corporativamente.

## Cambios Implementados

- Se reemplazó la separación absoluta por tres capas: maestros globales,
  operaciones locales y acceso transversal controlado.
- `Patient` conserva una identidad global; cada sede crea un expediente local y
  cada visita guarda una fotografía histórica de los datos usados.
- Solo el rol médico puede consultar historia clínica de otras sedes, en solo
  lectura, con paciente/motivo definidos y auditoría.
- Recepción obtiene coincidencia exacta global durante una llegada para evitar
  duplicados, pero no puede navegar listas de otras sedes.
- Administración accede al paciente ligado a una operación local y puede
  actualizar el contacto maestro para toda la clínica, sin ver historia remota.
- `Supplier` e `InventoryItem` permanecen como identidades globales; condiciones,
  precios, disponibilidad, compras y stock se separan por sucursal.
- Se ajustaron constraints, auditoría, RLS, pruebas y criterios de cierre para
  reconocer la excepción médica de lectura sin permitir escritura remota.

## Archivos Modificados

- `docs/project/sigeco-aislamiento-estricto-sucursales/tasks.md`
- `docs/project/sigeco-aislamiento-estricto-sucursales/progress.md`
- `docs/project/README.md`
- `docs/project/task-reports/README.md`
- `docs/project/task-reports/2026-09-08-plan-modelo-hibrido-sucursales.md`

## Decisiones Técnicas

- Una identidad compartida no significa un expediente compartido: los datos
  clínicos conservan siempre la sucursal de origen.
- El superadministrador no recibe acceso clínico transversal por su rol; debe
  trabajar en la sede seleccionada salvo otra función explícita.
- La lectura médica remota tendrá políticas `SELECT` separadas. Las políticas
  de escritura continuarán obligando a usar la sucursal activa.
- Los datos vigentes de contacto se versionan globalmente y los documentos
  históricos no se recalculan cuando cambian.

## Validación

- El plan mantiene 17 tareas y sus dependencias originales.
- Se revisaron las tareas de pacientes, clínica, adjuntos, catálogos,
  inventario, auditoría, constraints, RLS y cierre acumulado.
- `pnpm lint`: aprobado.
- `pnpm typecheck`: aprobado.
- No se ejecutan pruebas, build ni QA de navegador en una tarea de planificación.

## Pendientes

- Implementar las 17 tareas en orden.
- La próxima tarea continúa siendo Contrato de tenencia y detector automático.

**Commit sugerido:** `docs(sigeco): adopt hybrid multi-branch data model`
