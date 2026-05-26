# Operaciones V2

Guias operativas para mantener Salud Intercultural V2. Estan orientadas a desarrolladores o personal tecnico.

## Guias

1. [Desarrollo local](./desarrollo-local.md)
2. [Variables de entorno](./variables-entorno.md)
3. [Base de datos y migraciones](./base-datos-migraciones.md)
4. [Seeds y datos iniciales](./seeds.md)
5. [Admin y CMS](./admin-cms.md)
6. [Leads](./leads.md)
7. [Analytics y eventos](./analytics.md)
8. [Deploy](./deploy.md)
9. [Accesibilidad y UX responsive](./accesibilidad-responsive.md)
10. [Performance y Core Web Vitals](./performance.md)
11. [Errores comunes](./errores-comunes.md)

## Flujo recomendado

1. Trabajar cambios en `develop`.
2. Validar localmente con `pnpm lint`, `pnpm test`, `pnpm typecheck` y `pnpm run build`.
3. Promover a `staging` para Preview Deployment.
4. Validar admin, CMS, leads, analytics y sitio paUblico en staging.
5. Revisar accesibilidad, responsive y performance en staging.
6. Promover a `main` para producciaIn.

## DocumentaciaIn relacionada

- [Arquitectura V2](../architecture-v2.md)
- [Variables de entorno](../env-configuration.md)
- [Seeds y reset local](../seeding-local.md)
- [Checklist dominio](../domain-platforms-setup-checklist.md)
