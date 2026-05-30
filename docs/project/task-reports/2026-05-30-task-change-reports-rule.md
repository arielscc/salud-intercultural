# Tarea: Regla De Reportes De Cambios

## Fecha

2026-05-30

## Objetivo

Documentar que toda tarea futura de implementacion debe cerrar con un archivo `.md` que liste los cambios realizados, validaciones y pendientes.

## Cambios Implementados

- Se creo la guia operativa para reportes de cambios por tarea.
- Se definio la ubicacion canonica `docs/project/task-reports/`.
- Se agrego una plantilla base para futuros reportes.
- Se documento cuando crear o no crear un reporte.
- Se agregaron reglas de privacidad para evitar datos sensibles o informacion clinica real.
- Se enlazo la guia desde el README de operaciones.
- Se creo el directorio de reportes con un README inicial.

## Archivos Modificados

- `docs/operations/task-change-reports.md`
- `docs/project/task-reports/README.md`
- `docs/operations/README.md`
- `docs/project/task-reports/2026-05-30-task-change-reports-rule.md`

## Decisiones Tecnicas

- Los reportes viven en `docs/project/task-reports/` porque son registro de entregas y cambios, no procedimientos operativos.
- La instruccion vive en `docs/operations/task-change-reports.md` porque define un procedimiento repetible para futuras tareas.

## Validacion

- No se ejecutaron tests porque el cambio fue solo documentacion.

## Pendientes

- Aplicar esta regla en cada tarea futura de implementacion.
