# Reporte De Cambios — Tarea 8: Respuesta A Incidentes Y Gate De Seguridad

## Fecha

2026-07-29.

## Objetivo

Definir cómo contener, investigar y recuperar SIGECO ante un incidente, y
separar claramente una validación técnica local de la aprobación real para
producción.

## Cambios

- Se creó un runbook sencillo para acceso indebido, teléfono perdido, pérdida
  de datos, malware, indisponibilidad y exposición de secretos.
- Se definieron severidades `SEV1`, `SEV2` y `SEV3`, responsables, registro
  mínimo, conservación de evidencia y revisión posterior.
- Dirección queda como responsable del incidente y única autoridad para
  comunicar externamente o reabrir el sistema.
- Se documentó el orden: detectar, contener, conservar evidencia, eliminar la
  causa, recuperar y aprender.
- Se añadió un simulacro local que revoca sesiones, exige cambio de contraseña,
  verifica auditoría append-only y ejecuta la recuperación cifrada de la
  Tarea 7.
- Se añadió un gate técnico local que revisa evidencia reciente, documentos,
  permisos, privacidad, secretos y dependencias.
- Se añadió una evidencia estructurada de la aprobación de Dirección. El gate
  valida su rol, fecha, alcance, hallazgos y bloqueos de producción.
- El gate local siempre informa `productionApproval=false`; la aprobación de
  la implementación no sustituye las evidencias remotas ni la autorización
  posterior para producción.

## Archivos Principales

- `docs/operations/incident-response.md`.
- `scripts/security/incident-drill-local.ts`.
- `scripts/security/security-gate.ts`.
- `scripts/security/security-gate.test.ts`.
- `docs/project/security-gate/task-8-approval.json`.
- `package.json`.

## Evidencia Del Simulacro

El simulacro final `ms6hi8bf_ad569853` utilizó únicamente bases locales
sintéticas:

- escenario: teléfono perdido y recuperación comprobada;
- severidad: `SEV2`;
- sesiones activas creadas: 2;
- sesiones revocadas: 2;
- sesiones restantes: 0;
- contención: 19 ms;
- cambio de contraseña exigido: sí;
- eventos de auditoría: 2;
- modificación de auditoría bloqueada: sí;
- migraciones restauradas: 15;
- adjuntos recuperados y verificados: 1;
- restauración y verificación: 2.576 ms;
- simulacro completo: 14.333 ms.

La evidencia quedó en `.data/incident-evidence/` con directorio `0700` y
archivo `0600`. Después del ejercicio no quedó ninguna base temporal.

## Auditoría De Seguridad Local

La revisión de solo lectura confirmó:

- cero hallazgos críticos o altos verificados;
- cero secretos con formato real detectados en el árbol revisado;
- Actions de GitHub fijadas a commits inmutables;
- lockfile presente y controlado;
- ausencia de webhooks y WebSockets reales;
- permisos, privacidad, secretos y auditoría cubiertos por pruebas;
- 0 vulnerabilidades altas o críticas conocidas;
- permanecen 4 vulnerabilidades bajas y 14 moderadas.

Los scripts de instalación encontrados pertenecen a binarios esperados como
`esbuild`, Prisma y `unrs-resolver`; no se confirmó una ruta maliciosa.

## Resultado Del Gate

El comando `pnpm security:gate:local` aprobó:

- evidencia de incidente menor a 90 días;
- contención de sesiones;
- protección append-only;
- recuperación con migraciones y adjunto;
- controles de permisos, privacidad y secretos;
- dependencias sin hallazgos altos o críticos.

Resultado: **implementación de la Tarea 8 aprobada; producción no aprobada**.

## Aprobación De Dirección

El 2026-07-29, Dirección solicitó expresamente completar la Tarea 8. Esa
decisión aprueba:

- el runbook de respuesta a incidentes;
- el simulacro y su evidencia;
- el gate que mantiene separados los controles locales y remotos;
- el cierre de la implementación de esta tarea.

La aprobación no autoriza producción, no elimina los cinco bloqueos remotos y
no permite ampliar el uso clínico o abrir una sucursal sin una nueva decisión
de Dirección basada en evidencia remota.

## Validación Técnica

- Pruebas focalizadas: 4 archivos y 40 pruebas aprobadas.
- Suite completa: 42 archivos y 203 pruebas aprobadas.
- `pnpm lint`, `pnpm typecheck`, `pnpm env:check`, `prisma validate`,
  `git diff --check` y `pnpm run build`: aprobados.
- `pnpm deps:check`: 0 vulnerabilidades altas o críticas; permanecen 4 bajas y
  14 moderadas.
- No se utilizó staging ni producción.
- `pnpm test:integration` no forma parte del criterio de cierre de la Tarea 8.
  Sigue requiriendo consentimiento textual específico porque reinicia
  `salud_intercultural_test`. No se saltó esa protección ni se destruyó la base.

## Bloqueos Para Producción

- Observar y exigir los cinco jobs de CI en ramas remotas.
- Cerrar el QA de los siete roles en staging.
- Comprobar auditoría y revocación de sesiones en staging.
- Configurar y validar el Blob clínico privado.
- Restaurar una copia real fuera de producción.
- Confirmar propietarios y rotación de secretos.
- Registrar una nueva decisión de Dirección después de revisar todas las
  evidencias remotas.
- Ejecutar `pnpm test:integration` cuando el usuario otorgue el consentimiento
  explícito nuevo requerido por Prisma para reiniciar la base exclusiva de test.

La Tarea 8 queda **terminada**. Los puntos anteriores mantienen producción
bloqueada y no reabren esta tarea: se cierran en las tareas técnicas
correspondientes y en el gate previo al despliegue.

## Nota De Seguridad

La revisión asistida ayudó a identificar controles y comprobar rutas conocidas.
No sustituye una auditoría profesional, análisis forense, prueba de penetración,
servicio antimalware ni asesoría legal para datos clínicos.

## Commit Sugerido

`docs(ops): complete sigeco security readiness`
