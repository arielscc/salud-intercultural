# Ajuste — Retiro Del Rol Seguimiento

Fecha: 2026-08-02. Entorno modificado: código en `develop`. Relacionado con las
Tareas 4, 5 y 15. Incluye una migración de datos (no aplicada aún).

Aplica el modo de ejecución vigente: se implementó y se corrieron lint y
typecheck; QA de navegador (gstack), pruebas y build quedan pendientes para el
cierre acumulado.

## Motivo

Dirección decidió que el seguimiento de pacientes lo haga Recepción. Se retira
el rol interno `seguimiento`.

## Resultado

- El rol `seguimiento` queda **deprecado** (mismo patrón que `captacion`): no se
  asigna a cuentas nuevas, no aparece en el selector y conserva solo
  `internal_access`.
- Migración de datos que reasigna a **Recepción** las cuentas que tenían ese rol
  (p. ej. Yazmin). El valor permanece en el enum de Prisma por el historial y la
  auditoría; no se borra.
- Recepción ya contaba con los permisos y la política para trabajar todos los
  seguimientos (clínicos y administrativos); **no se agregaron permisos nuevos**.
- Se retiró `seguimiento` de la política de clasificación y de las consultas de
  asignación de seguimientos.
- El área de ruta del paciente `seguimiento` (etapa del recorrido) NO se tocó;
  es un concepto distinto del rol.

## Archivos

- `src/features/internal-auth/permissions.ts`: `seguimiento` en
  `deprecatedInternalRoles` y con permisos `["internal_access"]`.
- `src/features/internal-auth/schemas/user-management.schema.ts`: se retira de
  `activeInternalRoleSchema`.
- `src/features/follow-ups/policy.ts`: se retira del cálculo de quién trabaja y
  crea seguimientos.
- `src/modules/database/queries/follow-ups.ts`: visibilidad y asignación sin
  `seguimiento`.
- `src/app/(internal)/sigeco/(app)/recepcion/pacientes/[id]/page.tsx`: tipos de
  seguimiento creables sin la rama `seguimiento`.
- `scripts/set-internal-user-role.ts`: ejemplo de uso con un rol vigente.
- Pruebas actualizadas: `permissions.test.ts`, `follow-ups/policy.test.ts`,
  `user-management.schema.test.ts`, `internal-users.integration.test.ts`.
- Migración `prisma/migrations/20260802120000_reassign_seguimiento_to_reception`.
- Docs: `permissions-privacy-secrets.md` (matriz sin columna Seguimiento),
  `follow-up-classification.md`, `internal-users-sessions.md`,
  `sigeco-mejoras-integrales/tasks.md` y `progress.md`.

## Validación

- `pnpm lint`: aprobado.
- `pnpm typecheck`: aprobado.

## Pendientes (cierre acumulado)

- Aplicar la migración en local/staging (`pnpm db:migrate` / `staging:migrate`)
  y confirmar que las cuentas con rol seguimiento quedan en Recepción.
- QA de navegador (gstack): selector de roles sin Seguimiento, seguimientos
  trabajados por Recepción, negativos por rol.
- `pnpm test`, `pnpm test:integration` y `pnpm run build`.
- Repaso de redacción del rol retirado ya realizado en `staff-pilot.md` (caso
  P29-17, cuentas QA, tabla de personal, permisos y firmas; también se corrigió
  la regla de contraseña a mínimo 6) y en `tasks.md` (responsabilidades, Caja e
  inventario). Queda pendiente, sin bloquear, el repaso de los documentos de
  negocio/estrategia en `docs/masters/` que mencionan a Yazmin como persona. Los
  reportes históricos no se modifican porque son evidencia.

## Commit Sugerido

`feat(sigeco): retire seguimiento role and move follow-ups to reception`
