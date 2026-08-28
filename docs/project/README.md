# Project Documentation

Documentacion de gestion del proyecto, estado de versiones y preparacion de trabajo futuro. Este directorio no contiene procedimientos operativos ni detalles profundos de arquitectura; resume estado, decisiones vigentes, backlog y criterios para iniciar la siguiente version.

Usar este directorio para:

- Estado consolidado de una version.
- Preparacion de V3 y backlog priorizable.
- Decisiones de alcance que afecten varias areas.
- Resumenes ejecutivos que enlazan a la documentacion canonica.

## Guias

1. [Estado de implementacion V3](./v3-implementation-status.md): estado actual de Sigeco, resultados por fase, validaciones, pendientes y siguiente orden recomendado.
2. [Implementacion tecnica V3.7](./v3-technical-implementation.md): arquitectura vigente, contratos transaccionales, permisos y deploy.
3. [Estado de implementacion V2](./v2-implementation-status.md): baseline estable del sitio publico, CMS y marketing.
4. [Preparacion V3](./v3-readiness.md): criterios y decisiones previas para iniciar V3.
5. [Plan de limpieza de ownership de datos](./data-ownership-cleanup-plan.md): cierre de la separacion Payload/Prisma.
6. [Reportes por tarea](./task-reports/): evidencia de cada entrega implementada.
7. [Rediseno Sigeco (Marea)](./sigeco-redesign/tareas-de-rediseno.md): plan de tareas del rediseno del panel interno y su [progreso](./sigeco-redesign/progreso-de-diseno.md).
8. [Simplificacion Sigeco V3.7](./sigeco-simplificacion/tareas-de-simplificacion.md): plan cerrado de 10 tareas, progreso y backlog operativo/clinico posterior.
9. [Plan de GitHub Actions](./github-actions-implementation-plan.md): CI, pruebas con PostgreSQL y proteccion de ramas a implementar despues del cierre de V3.7.
10. [Sigeco desktop complementario](./sigeco-desktop/tareas-de-desktop.md): iniciativa cerrada de arquitectura de informacion y 10 tareas desktop, con preservacion movil y QA integral documentado.
11. [Mejoras futuras de Sigeco](./sigeco-mejoras-futuras/tareas-de-mejoras.md): antecedente tecnico de seguridad clinica, calidad de datos y nuevas funciones; ya no controla la ejecucion.
12. [Mejoras integrales de SIGECO](./sigeco-mejoras-integrales/tasks.md): plan principal reorganizado en 29 tareas consecutivas, con un unico archivo de [progreso](./sigeco-mejoras-integrales/progress.md).
13. [Lanzamiento por etapas de SIGECO](./sigeco-lanzamiento-por-etapas/tasks.md): activacion controlada de modulos desde el super administrador hasta que la Etapa 1 funcione entera en staging, con su [progreso](./sigeco-lanzamiento-por-etapas/progress.md). Las tareas que tocan produccion se separaron el 2026-08-28 en [tasks-produccion.md](./sigeco-lanzamiento-por-etapas/tasks-produccion.md) y estan congeladas.

## Documentacion relacionada

- [Indice general de docs](../README.md)
- [Arquitectura](../architecture/v2-architecture.md)
- [Ownership de datos](../architecture/data-ownership.md)
- [Sistema visual](../design/public-visual-system.md)
- [Operaciones](../operations/README.md)
