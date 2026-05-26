# Operations

Guias operativas para correr, configurar, validar, publicar y mantener Salud Intercultural. Este directorio esta orientado a desarrolladores y personal tecnico responsable de ambientes, CMS, datos, deploy y QA.

Usar este directorio para:

- Desarrollo local, variables de entorno, base de datos, seeds y deploy.
- Administracion de Payload CMS, media, leads, analytics y plataformas externas.
- Checklists de accesibilidad, performance y troubleshooting.
- Procedimientos repetibles que deben seguirse en V2 y servir como base para V3.

No usar este directorio para roadmap, estado historico o decisiones de producto; eso vive en `docs/project`.

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
11. [Plataformas externas](./external-platforms.md)
12. [Accesibilidad y UX responsive](./accessibility-responsive.md)
13. [Performance y Core Web Vitals](./performance.md)
14. [Errores comunes](./troubleshooting.md)

## Flujo recomendado

1. Trabajar cambios en `develop`.
2. Validar localmente con `pnpm lint`, `pnpm test`, `pnpm typecheck` y `pnpm run build`.
3. Promover a `staging` para Preview Deployment.
4. Validar admin, CMS, media, leads, analytics y sitio publico en staging.
5. Revisar accesibilidad, responsive y performance en staging.
6. Promover a `main` para produccion.

## Documentacion relacionada

- [Indice general de docs](../README.md)
- [Arquitectura V2](../architecture/v2-architecture.md)
- [Estado de implementacion V2](../project/v2-implementation-status.md)
