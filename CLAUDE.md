# Reglas De Trabajo Con Asistentes De IA

Convenciones que un asistente debe respetar en este repositorio. Complementan la
documentación de `docs/`, no la reemplazan.

## Git: nunca commitear ni empujar

El asistente **no ejecuta `git add`, `git commit`, `git push` ni `git reset`**.
Termina cada tarea dejando los cambios en el árbol de trabajo y entregando el
**mensaje de commit redactado**; quien commitea y empuja es el desarrollador.

Si en una tarea concreta se autoriza commitear o empujar, esa autorización vale
**solo para esa tarea**. No se extiende a la siguiente.

Motivo: el 2026-08-25 un permiso puntual se tomó como permanente. El historial
divergió —dos commits en paralelo sobre el mismo árbol de trabajo— y un
`git add -A` subió una captura de pantalla a este repositorio, que es público.

## Modo de ejecución por tarea

Por tarea se corren **solo `pnpm lint` y `pnpm typecheck`**. Las pruebas, la
integración, el build y el QA de navegador se ejecutan en el cierre acumulado.

Decisión de Dirección del 2026-08-02. Detalle en
[progress.md del plan integral](docs/project/sigeco-mejoras-integrales/progress.md).

## Secretos y datos reales

No se inventan. Los `.env`, tokens y credenciales salen de Vercel, del tarball de
archivos privados o de quien los administra. Un valor inventado se usa igual que
uno real: un precio inventado se cobra, un stock inventado descuadra la Caja.

## Dónde está el estado del proyecto

- [Estado de implementación V3](docs/project/v3-implementation-status.md)
- [Lanzamiento por etapas](docs/project/sigeco-lanzamiento-por-etapas/tasks.md) y su [progreso](docs/project/sigeco-lanzamiento-por-etapas/progress.md)
- [Reportes por tarea](docs/project/task-reports/)
- [Documento de Negocio V3.0](docs/masters/Documento_de_Negocio_V3_0.md)

Cada tarea cierra actualizando el `progress.md` de su plan y agregando un reporte
fechado en `docs/project/task-reports/`.
