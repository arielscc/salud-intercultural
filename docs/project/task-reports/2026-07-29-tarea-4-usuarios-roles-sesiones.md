# Reporte De Cambios — Tarea 4: Usuarios, Roles Y Sesiones

## Fecha

2026-07-29.

## Objetivo

Administrar las cuentas del personal desde SIGECO, cerrar accesos de forma
inmediata y permitir que cada empleado controle sus propias sesiones.

## Cambios

- Se agregó `users_manage`, exclusivo de `super_admin`.
- Se creó `/sigeco/usuarios` para administración completa en escritorio.
- Se creó `/sigeco/usuarios/[userId]` para rol, estado, desbloqueo, cambio
  obligatorio y revocación de sesiones.
- Se creó `/sigeco/mi-cuenta` para cambiar contraseña y cerrar sesiones propias.
- Se creó `/sigeco/cambiar-contrasena` para el primer ingreso o un cambio forzado.
- Las cuentas nuevas reciben una contraseña temporal y quedan obligadas a cambiarla.
- Las sesiones nuevas guardan una etiqueta corta de dispositivo, no el user-agent completo.
- Los cambios de rol o estado revocan las sesiones existentes.
- Todas las acciones importantes generan auditoría append-only.

## Archivos Principales

- `prisma/migrations/20260729160000_manage_internal_users_sessions/migration.sql`.
- `src/features/internal-auth/user-management-actions.ts`.
- `src/features/internal-auth/schemas/user-management.schema.ts`.
- `src/modules/database/queries/internal-users.ts`.
- `src/app/(internal)/sigeco/(app)/usuarios`.
- `src/app/(internal)/sigeco/(app)/mi-cuenta/page.tsx`.
- `src/app/(internal)/sigeco/cambiar-contrasena/page.tsx`.
- `docs/operations/internal-users-sessions.md`.

## Decisiones Técnicas

- Un empleado tiene una cuenta individual; no se crean cuentas compartidas.
- `captacion` no aparece como rol asignable.
- Nadie puede cambiar su propio rol o desactivar su propia cuenta.
- El último super administrador activo no puede desactivarse ni degradarse.
- La comprobación del último super administrador y el cambio de acceso se
  ejecutan en una transacción serializable para evitar dos degradaciones
  simultáneas.
- Cambiar rol o estado revoca todas las sesiones para aplicar el acceso inmediatamente.
- Cambiar contraseña conserva la sesión actual y cierra las demás.
- El cambio obligatorio también bloquea server actions, no solo las pantallas.
- Las contraseñas no se incluyen en auditoría ni en URLs.

## Validación

- Migración aditiva aplicada correctamente en `salud_intercultural_dev`.
- `pnpm test`: 33 archivos y 123 pruebas unitarias aprobadas.
- `pnpm lint`: aprobado sin advertencias.
- `pnpm typecheck`: aprobado.
- `pnpm run build`: aprobado; las rutas de usuarios, cuenta y cambio obligatorio
  fueron generadas como dinámicas.
- Pruebas negativas de `users_manage` para todos los roles no autorizados.
- Pruebas de esquema para rol deprecado, contraseña temporal y confirmación.
- Pruebas para bloqueo de acciones mientras existe cambio obligatorio.
- Pruebas de integración preparadas para último super administrador, cambio
  propio, revocación inmediata y rol deprecado.

## Pendiente

- Ejecutar la integración en PostgreSQL efímero mediante CI.
- Aplicar la migración en staging.
- Probar en staging creación, desactivación, desbloqueo y revocación con las
  siete cuentas QA.
- Completar QA visual autenticado en 390, 768, 1024, 1280 y 1440 px.

## Commit Sugerido

`feat(sigeco): manage users roles and sessions`
