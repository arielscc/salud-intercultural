# Enfermería — ver y editar signos vitales; sesiones registradas

Fecha: 2026-08-04. Entorno: código en `develop`. **Sin migración**. Afecta la
ficha de Enfermería (`/sigeco/enfermeria/[workItemId]`).

Aplica el modo de ejecución vigente: **lint y typecheck**; QA de navegador,
pruebas y build quedan para el cierre acumulado.

## Cambios (feedback de Dirección)

- **Sesiones registradas visibles**: dentro de la tarjeta de sesiones se listan las
  sesiones ya aplicadas en verde (✓, no editables), con sesión N/Total, fecha y
  hora, enfermera y nota. Chip "Completado" cuando el paquete termina; los paquetes
  completados ya no desaparecen. Botón "Registrar sesión" a todo el ancho.
- **Signos vitales visibles**: al guardarlos ya no "desaparecían"; ahora se listan
  en "Signos vitales registrados" con su fecha y un resumen (T, PA, FC, SpO₂, FR,
  peso, talla, con unidades).
- **Signos vitales editables**: cada registro se abre (colapsable) y se puede
  **editar** para corregir errores; los campos en blanco se limpian. Guardar con
  "Guardar cambios".

## Alcance técnico

- `src/features/nursing/schemas/nursing.schema.ts`: `updateVitalSignsSchema`.
- `src/modules/database/queries/nursing.ts`: `updateVitalSignsRecord` (limpia
  campos en blanco a null; la fecha solo cambia si se envía).
- `src/features/nursing/actions.ts`: `updateVitalSignsAction` (permiso
  `nursing_write`, auditada).
- `src/app/(internal)/sigeco/(app)/enfermeria/[workItemId]/page.tsx`: lista de
  signos vitales registrados con edición colapsable + `formatVitalsSummary`; el
  formulario de alta pasó a "Agregar signos vitales".
- (Sesiones) `src/modules/database/queries/service-sessions.ts`: la ficha usa
  `getPatientServiceSessionPackages` (incluye `uses` + enfermera; activos y
  completados). Se eliminó la función duplicada anterior.

Sin cambios de esquema (`VitalSigns` ya tenía todos los campos).

## Validación

- `pnpm lint` y `tsc --noEmit`: aprobados.

## Pendientes (cierre acumulado)

- QA: guardar signos, verlos en la lista, editarlos (incluye limpiar un campo);
  ver sesiones registradas en verde.
- `pnpm test`, `pnpm run build`.

## Commit Sugerido

`feat(sigeco): view/edit nursing vital signs and session history`
