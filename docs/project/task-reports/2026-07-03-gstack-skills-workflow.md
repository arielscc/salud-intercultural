# Tarea: Workflow De Skills Gstack

## Fecha

2026-07-03

## Objetivo

Analizar el estado historico, actual y futuro del proyecto para instalar y documentar un workflow de skills que ayude a mantener desarrollo profesional, solido, verificable y alineado a lo que la clinica espera.

## Cambios Implementados

- Se revisaron documentos maestros, arquitectura, operaciones, roadmap tecnico V3 y reportes de tareas V3.1A a V3.6.
- Se clono y analizo `https://github.com/garrytan/gstack`.
- Se instalo gstack globalmente para Codex desde una copia persistente en `~/.gstack/repos/gstack`.
- Se enlazaron las skills generadas en `~/.codex/skills/gstack-*`.
- Se documento un workflow recomendado para usar skills en planificacion, implementacion, debugging, QA, revision, seguridad, release y documentacion.
- Se enlazo la nueva guia desde el indice de operaciones.

## Archivos Modificados

- `docs/operations/ai-assisted-development.md`
- `docs/operations/README.md`
- `docs/project/task-reports/2026-07-03-gstack-skills-workflow.md`

## Decisiones Tecnicas

- La instalacion de gstack se dejo global para Codex, no vendorizada dentro del repositorio, para evitar copiar una herramienta externa grande dentro del proyecto.
- La documentacion del workflow vive en `docs/operations/` porque define un procedimiento repetible de desarrollo, QA y release.
- Se priorizaron skills que protegen los riesgos reales del proyecto: datos clinicos, permisos, Prisma, transacciones, mobile-first, QA de Sigeco, seguridad y deploy.
- Las skills iOS, Supabase y exploraciones visuales generativas quedaron como no prioritarias porque no corresponden al alcance actual de V3.

## Validacion

- gstack instalado en `~/.gstack/repos/gstack`.
- Version verificada: `1.58.5.0`.
- Symlinks verificados en `~/.codex/skills/gstack-*`.
- Binario `gstack-browse` verificado con `--help`.
- No se ejecutaron tests del proyecto porque el cambio en el repositorio fue solo documentacion.

## Pendientes

- Reiniciar Codex para que la sesion cargue todas las skills nuevas instaladas.
- Evaluar si en el futuro se quiere agregar un archivo raiz `AGENTS.md` o `CLAUDE.md` con reglas cortas para agentes.
- Configurar `gstack-setup-deploy` cuando se vaya a automatizar la verificacion de deploy.
