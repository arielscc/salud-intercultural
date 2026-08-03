# Ajuste — Edición De Nombre Y Nueva Política De Contraseñas

Fecha: 2026-08-02. Entorno modificado: código en `develop` (sin migración, sin
base). Relacionado con la Tarea 4 (usuarios, roles y sesiones).

Aplica el modo de ejecución vigente: se implementó y se corrieron lint y
typecheck; QA de navegador (gstack), pruebas y build quedan pendientes para el
cierre acumulado.

## Motivo

- En `/sigeco/usuarios/[userId]` no se podía corregir el nombre de un empleado
  registrado por error.
- La contraseña exigía 12 caracteres; Dirección pidió bajar el mínimo a 6 pero
  reforzar la composición y rechazar contraseñas inseguras o con patrones.

## Resultado

### 1. Edición de nombre

- Nueva tarjeta "Nombre del empleado" en el detalle de usuario para corregir el
  nombre visible.
- Corregir el nombre no cierra sesiones (a diferencia de cambiar rol o estado).
- La acción queda auditada como `user.profile.update`.

### 2. Política de contraseñas

- Mínimo **6** caracteres (antes 12), máximo 128.
- Debe incluir **mayúsculas, minúsculas y números**.
- Se rechazan contraseñas comunes o con patrones fáciles usando la librería
  `@zxcvbn-ts` (diccionarios común y en español), con puntaje mínimo de 2 sobre 4.
- La regla es única y se aplica por igual a la contraseña temporal que crea el
  super administrador y al cambio propio de contraseña de cualquier usuario.
- La contraseña nueva sigue teniendo que ser diferente de la anterior.
- Mensajes de error específicos: contraseña débil, contraseñas que no coinciden,
  nombre inválido.

## Archivos

- `src/features/internal-auth/password-policy.ts` (nuevo): reglas y validación
  con `@zxcvbn-ts`.
- `src/features/internal-auth/schemas/user-management.schema.ts`: contraseña con
  la nueva política, `nameSchema` reutilizable y `updateInternalUserProfileSchema`.
- `src/modules/database/queries/internal-users.ts`:
  `updateManagedInternalUserProfile`.
- `src/features/internal-auth/user-management-actions.ts`:
  `updateManagedInternalUserProfileAction` y errores específicos de contraseña.
- `src/app/(internal)/sigeco/(app)/usuarios/[userId]/page.tsx`: tarjeta de
  nombre y mensaje `invalid-name`.
- `src/app/(internal)/sigeco/(app)/usuarios/page.tsx`: mínimo 6, texto de ayuda
  y mensaje `weak-password`.
- `src/components/internal/PasswordChangeForm.tsx`: mínimo 6, textos y errores.
- `src/features/internal-auth/schemas/user-management.schema.test.ts`: pruebas
  actualizadas a la política nueva.
- `docs/operations/internal-users-sessions.md`: reglas actualizadas.
- Dependencias: `@zxcvbn-ts/core`, `@zxcvbn-ts/language-common`,
  `@zxcvbn-ts/language-es-es`.

## Validación

- `pnpm lint`: aprobado.
- `pnpm typecheck`: aprobado.

## Pendientes (cierre acumulado)

- QA de navegador (gstack): editar nombre, crear usuario y cambiar contraseña
  con casos válidos e inválidos, responsive.
- `pnpm test` y `pnpm test:integration`: incluir el módulo de política de
  contraseñas y la acción de nombre.
- `pnpm run build` y `pnpm deps:check` (verificar que las tres dependencias
  nuevas no introduzcan vulnerabilidades altas o críticas).
- No hay migración; no aplica cambio en base ni en producción.

## Commit Sugerido

`feat(sigeco): edit user name and strengthen password policy`
