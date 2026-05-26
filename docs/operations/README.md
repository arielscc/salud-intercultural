# Operaciones V2

Guias operativas para mantener Salud Intercultural V2. Estan orientadas a desarrolladores o personal tecnico.

## Guias

1. [Desarrollo local](./local-development.md)
2. [Variables de entorno](./environment-variables.md)
3. [Base de datos y migraciones](./database-migrations.md)
4. [Seeds y datos iniciales](./seeds.md)
5. [Admin y CMS](./admin-cms.md)
6. [Media e imagenes](./media.md)
7. [Leads](./leads.md)
8. [Analytics y eventos](./analytics.md)
9. [Flujo de ramas](./branch-flow.md)
10. [Deploy](./deploy.md)
11. [Accesibilidad y UX responsive](./accessibility-responsive.md)
12. [Performance y Core Web Vitals](./performance.md)
13. [Errores comunes](./troubleshooting.md)

## Flujo recomendado

1. Trabajar cambios en `develop`.
2. Validar localmente con `pnpm lint`, `pnpm test`, `pnpm typecheck` y `pnpm run build`.
3. Promover a `staging` para Preview Deployment.
4. Validar admin, CMS, media, leads, analytics y sitio publico en staging.
5. Revisar accesibilidad, responsive y performance en staging.
6. Promover a `main` para produccion.

## Documentacion relacionada

- [Arquitectura V2](../architecture/architecture-v2.md)
- [Checklist dominio](../domain-platforms-setup-checklist.md)
