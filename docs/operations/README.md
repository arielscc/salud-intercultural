# Operations

Guias operativas para correr, configurar, validar, publicar y mantener Salud Intercultural. Este directorio esta orientado a desarrolladores y personal tecnico responsable de ambientes, CMS, datos, deploy y QA.

Usar este directorio para:

- Desarrollo local, variables de entorno, base de datos, seeds y deploy.
- Administracion de Payload CMS, media, formulario publico, analytics y plataformas externas.
- Checklists de accesibilidad, performance y troubleshooting.
- Procedimientos repetibles para el sitio publico, CMS y Sigeco V3.7.

No usar este directorio para roadmap, estado historico o decisiones de producto; eso vive en `docs/project`.

## Guias

1. [Desarrollo local](./local-development.md)
2. [Variables de entorno](./environment-variables.md)
3. [Staging aislado](./staging.md)
4. [Base de datos y migraciones](./database-migrations.md)
5. [Testing](./testing.md)
6. [Seeds y datos iniciales](./seeds.md)
7. [Admin y CMS](./admin-cms.md)
8. [Media e imagenes](./media.md)
9. [Leads](./leads.md)
10. [Analytics y eventos](./analytics.md)
11. [Flujo de ramas](./branch-flow.md)
12. [Deploy](./deploy.md)
13. [Plataformas externas](./external-platforms.md)
14. [Accesibilidad y UX responsive](./accessibility-responsive.md)
15. [Performance y Core Web Vitals](./performance.md)
16. [Errores comunes](./troubleshooting.md)
17. [Reportes de cambios por tarea](./task-change-reports.md)
18. [Desarrollo asistido con skills](./ai-assisted-development.md)
19. [Prueba manual del flujo completo V3 Sigeco](./sigeco-v3-full-flow-testing.md)
20. [Auditoría append-only de SIGECO](./audit-events.md)
21. [Usuarios, roles y sesiones de SIGECO](./internal-users-sessions.md)
22. [Permisos, privacidad, logs y secretos de SIGECO](./permissions-privacy-secrets.md)
23. [Adjuntos clínicos seguros](./clinical-attachments.md)

## Flujo recomendado

1. Trabajar cambios en `develop`.
2. Validar localmente con `pnpm lint`, `pnpm test`, `pnpm typecheck` y `pnpm run build`.
3. Si el cambio toca DB, migraciones o queries, correr `pnpm test:integration`.
4. Promover a `staging` para Preview Deployment.
5. Validar admin, CMS, formulario publico, analytics, sitio publico y Sigeco en staging.
6. Revisar accesibilidad, responsive y performance en staging.
7. Promover a `main` para produccion.

## Documentacion relacionada

- [Indice general de docs](../README.md)
- [Arquitectura V2](../architecture/v2-architecture.md)
- [Ownership de datos](../architecture/data-ownership.md)
- [Estado de implementacion V3](../project/v3-implementation-status.md)
