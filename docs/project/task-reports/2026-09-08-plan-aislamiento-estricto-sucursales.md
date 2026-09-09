# Plan De Aislamiento Estricto Por Sucursal

## Fecha

2026-09-08.

## Objetivo

Convertir la decisión de aislar toda la información operativa por sucursal en
un plan seguro y ejecutable por tareas independientes.

## Cambios Implementados

- Se creó un plan de 17 tareas dividido en frontera técnica, partición de
  dominios y endurecimiento de PostgreSQL.
- Se definió una allowlist global mínima: identidad/sesión, sucursales,
  membresías y definiciones técnicas de módulos.
- Se estableció `branchCode` obligatorio, contexto autenticado, relaciones
  compuestas y RLS como cuatro defensas complementarias.
- Se definió un proceso de migración expandir-rellenar-reconciliar-endurecer que
  bloquea cualquier asignación automática ambigua.
- Se incluyeron pacientes, clínica, Caja, inventario, catálogos, archivos,
  campañas, seguimiento, módulos y auditoría.
- Se creó un tablero de progreso con las 17 tareas pendientes y sus
  dependencias.

## Archivos Modificados

- `docs/project/sigeco-aislamiento-estricto-sucursales/tasks.md`
- `docs/project/sigeco-aislamiento-estricto-sucursales/progress.md`
- `docs/project/README.md`
- `docs/project/task-reports/README.md`
- `docs/project/task-reports/2026-09-08-plan-aislamiento-estricto-sucursales.md`

## Decisiones Técnicas

- No se implementa como una sola migración porque hay datos sin sede o con
  huellas potencialmente múltiples que necesitan reconciliación humana.
- El superadministrador sigue siendo una identidad global, pero trabaja bajo la
  sucursal activa y no recibe bypass de RLS durante el uso normal.
- Los datos usados históricamente por varias sedes se particionan en registros
  independientes; no conservan una ficha de negocio compartida.
- Los traslados entre sedes requieren comprobantes locales o deben desactivarse,
  porque un único registro visible por ambas violaría el aislamiento estricto.

## Validación

- Revisión de cobertura contra los modelos Prisma y los hallazgos del
  diagnóstico de sucursales.
- `pnpm lint`: aprobado.
- `pnpm typecheck`: aprobado.
- No se ejecutan pruebas, build ni QA de navegador en una tarea de planificación.

## Pendientes

- Las 17 tareas permanecen pendientes.
- La siguiente tarea es Contrato de tenencia y detector automático.

**Commit sugerido:** `docs(sigeco): plan strict branch isolation rollout`
