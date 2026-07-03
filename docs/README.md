# Documentation

Documentacion oficial del proyecto Salud Intercultural. Este directorio esta organizado por responsabilidad para evitar duplicacion y dejar claro que se esta implementando, que resultado dejo cada entrega y que falta cerrar.

## Lectura Rapida

1. [Estado de implementacion V3](./project/v3-implementation-status.md): punto de entrada para ver el estado actual de Sigeco, resultados por fase, validaciones y pendientes.
2. [Implementacion tecnica V3](./project/v3-technical-implementation.md): roadmap tecnico y criterios de aceptacion por fase.
3. [Documento de Negocio V3.0](./masters/Documento_de_Negocio_V3_0.md): fuente funcional de verdad sobre lo que la clinica espera.
4. [Reportes por tarea](./project/task-reports/): evidencia de cambios implementados, decisiones, validacion y pendientes.
5. [Desarrollo asistido con skills](./operations/ai-assisted-development.md): workflow recomendado para planificar, revisar, probar y publicar con gstack/Codex.

## Estado General

| Version | Estado | Resultado |
| --- | --- | --- |
| V1 | Implementado | Sitio web institucional. |
| V2 | Implementado | CMS, marketing, SEO, analytics, media y leads publicos. |
| V3 | Implementado localmente hasta V3.6 | Sigeco cubre CRM interno, pacientes, visitas, consulta, enfermeria, ventas, seguimiento e inventario. |
| V4+ | Futuro | ERP clinico, automatizaciones, portal del paciente, multi-sucursal y expansion. |

## Directorios

1. [Architecture](./architecture/README.md): decisiones tecnicas, estructura del monolito modular, limites de dominio y convenciones de codigo.
2. [Design](./design/README.md): sistema visual publico, criterios de UI y reglas de experiencia.
3. [Operations](./operations/README.md): procedimientos diarios para desarrollo, deploy, variables, CMS, media, leads, analytics, QA y troubleshooting.
4. [Project](./project/README.md): estado de implementacion, preparacion V3, backlog y documentacion de gestion del producto.
5. [Masters](./masters/README.md): vision estrategica, procesos reales de la clinica, roles, flujos operativos y reglas de negocio no tecnicas.

## Regla De Ubicacion

- Si describe como esta construido el sistema, va en `architecture`.
- Si describe como debe verse o comportarse la interfaz, va en `design`.
- Si describe como operar, configurar, validar o publicar el sistema, va en `operations`.
- Si describe estado, roadmap, decisiones de version o preparacion futura, va en `project`.
- Si describe como trabaja la clinica, sus roles, procesos, flujos o reglas de negocio no tecnicas, va en `masters`.

## Antes De Crear Un Documento Nuevo

1. Revisar si ya existe un documento canonico relacionado.
2. Agregar la informacion al documento existente si comparte responsabilidad.
3. Crear un documento nuevo solo si tiene una responsabilidad clara y estable.
4. Actualizar el `README.md` del directorio correspondiente.
5. Evitar historiales extensos; mantener estado actual, decisiones vigentes y pendientes accionables.
