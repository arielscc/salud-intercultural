# Tarea: Usuario De Prueba Local Para Sigeco

## Fecha

2026-05-30

## Objetivo

Crear un usuario local para entrar a `/sigeco` y probar la primera entrega de V3.1A.

## Cambios Implementados

- Se aplico la migracion V3.1A en la base local `salud_intercultural_dev`.
- Se creo un usuario interno con rol `super_admin` mediante `pnpm internal:seed`.

## Archivos Modificados

- `docs/project/task-reports/2026-05-30-sigeco-usuario-prueba-local.md`

## Decisiones Tecnicas

- El usuario creado es solo para entorno local.
- No se modifico `.env`; las credenciales se pasaron por variables de entorno solo durante el comando de seed.

## Validacion

- `pnpm db:migrate`: paso fuera del sandbox y aplico `20260530000000_v3_1a_internal_crm`.
- `pnpm internal:seed`: paso y creo `sigeco@saludintercultural.local`.

## Pendientes

- Probar login manualmente en `http://localhost:3000/sigeco/login`.
- Cambiar credenciales si se reutiliza el entorno local con otras personas.
