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
24. [Backup y restauración comprobada](./backup-restore.md)
25. [Respuesta a incidentes y gate de seguridad](./incident-response.md)
26. [Consentimientos y preferencias de contacto](./patient-consents.md)
27. [Departamento y procedencia geográfica](./geographic-origin.md)
28. [Fuentes de captación y atribución](./capture-attribution.md)
29. [Duplicados y fusión de pacientes](./patient-duplicates.md)
30. [Actualización de bandejas operativas](./operational-queue-refresh.md)
31. [Resultado de la propuesta de tratamiento](./treatment-proposal-outcomes.md)
32. [Tipos y resultados de seguimiento](./follow-up-classification.md)
33. [Abandono, bloqueo y pendientes](./visit-discontinuations.md)
34. [Correcciones, cierre y firma clínica](./clinical-record-versioning.md)
35. [Caja, egresos y cierre diario](./cash-sessions-expenses-close.md)
36. [Catálogo de productos y proveedores](./product-catalog-suppliers.md)
37. [Compras, recepciones, lotes y stock](./purchases-receipts-batches-stock.md)
38. [Recetas y comprobantes versionados](./versioned-prescriptions-receipts.md)
39. [Reporte del recorrido completo](./patient-journey-report.md)
40. [Tiempo de atención por área](./area-service-times.md)
41. [Recordatorios automatizados y supervisados](./supervised-reminders.md)
42. [Encuestas, opiniones y reclamos](./patient-feedback-complaints.md)
43. [Móvil y conectividad lenta](./mobile-slow-connectivity.md)
44. [Integración segura Payload-SIGECO](./payload-sigeco-integration.md)
45. [Operación multi-sucursal](./multi-branch-operations.md)
46. [Guía reproducible del piloto completo con el personal](./staff-pilot.md)

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
