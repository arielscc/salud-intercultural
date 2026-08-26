# Reporte De Cambios — Tarea 12: Duplicados Y Fusión De Pacientes

## Fecha

2026-07-29.

## Objetivo

Prevenir historias separadas de una misma persona y permitir que dos fichas se
reúnan sin borrar datos ni dejar relaciones huérfanas.

## Resultado Implementado

- Teléfono principal y alternativo se comparan en formato normalizado.
- El nombre se compara sin tildes, signos ni dependencia del orden.
- Nombre y fecha de nacimiento pueden detectar una coincidencia sin teléfono.
- El funnel y la edición alertan antes de guardar datos coincidentes.
- Se agregó una cola de revisión en `/sigeco/recepcion/duplicados`.
- La comparación muestra datos e impacto lado a lado.
- Recepción puede revisar y descartar falsas coincidencias.
- Dirección puede consultar la cola.
- Solo el super administrador puede fusionar.
- La confirmación exige escribir el código de la ficha que seguirá vigente.
- La fusión usa aislamiento serializable y una sola transacción.
- Se trasladan todas las relaciones directas del paciente.
- La ficha anterior se archiva y conserva como alias.
- El enlace y código anteriores dirigen al expediente vigente.
- Las búsquedas incluyen los alias.
- La auditoría guarda la decisión, las fichas involucradas y cantidades, sin
  datos clínicos.
- Móvil permite prevención y revisión; la fusión queda para escritorio.

## Base De Datos

- Migración `20260729220000_patient_duplicates_merge`.
- Migración `20260729221000_patient_secondary_phone_normalization`.
- Nuevos modelos: `PatientDuplicateCandidate`, `PatientMerge` y `PatientAlias`.
- Nuevos permisos: `patient_duplicates_read`,
  `patient_duplicates_review` y `patient_duplicates_merge`.
- `Patient` conserva normalizaciones y una redirección `mergedIntoId`.
- La cola histórica se prepara durante la migración.
- Las migraciones no eliminan pacientes ni registros operativos.
- Aplicadas únicamente en `salud_intercultural_dev`.
- Staging y producción no fueron modificados.

## Integridad Y Recuperación

- La ficha origen permanece archivada.
- Se guardan fotografías de origen y destino.
- `PatientMerge.impact` conserva cantidades e identificadores exactos movidos.
- Los campos distintos no se borran: la ficha elegida conserva sus valores,
  los vacíos se completan y la información anterior sigue visible desde el
  alias archivado.
- Una futura compensación debe usar este registro y una acción auditada; no SQL
  manual.

## Validación Local

- `pnpm env:check`: ambiente local aprobado.
- `pnpm exec prisma migrate status`: 20 migraciones vigentes y esquema local
  actualizado.
- `pnpm exec prisma validate`: aprobado.
- `pnpm exec tsc --noEmit`: aprobado.
- `pnpm lint`: aprobado sin advertencias.
- 32 pruebas focalizadas aprobadas: normalización de duplicados, validación de
  decisiones, permisos y límites de seguridad.
- La base local confirmó cero pacientes sin normalización de nombre, teléfono
  principal o teléfono alternativo.
- `git diff --check`: aprobado.
- Se agregó una integración que comprueba traslado de relaciones, alias,
  archivo de origen y ausencia de borrado.
- La integración acumulada y gstack permanecen aplazados para el cierre de
  todas las tareas, según lo solicitado.

## Pendientes Del Cierre Conjunto

- Ejecutar la suite de integración sobre la base exclusiva de test.
- Probar la fusión sintética en staging con los tres roles.
- Completar QA móvil y escritorio de gstack.
- Verificar búsqueda y redirección por alias.
- Solicitar autorización antes de cualquier cambio en producción.

La implementación local queda **en progreso** hasta completar integración y QA
acumulados.

## Commit Sugerido

`feat(sigeco): safely merge duplicate patients`
