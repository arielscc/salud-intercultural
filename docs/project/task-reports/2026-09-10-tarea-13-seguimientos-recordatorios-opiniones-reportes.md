# Tarea 13 — Seguimientos, recordatorios, opiniones y reportes

Fecha: 2026-09-10  
Estado: implementada; migraciones y reconciliación preparados, no ejecutados.

## Resultado

La continuidad operativa y la calidad quedan aisladas por la sucursal activa:

- `FollowUpTask` relaciona lead, expediente, visita, venta, orden, trabajo,
  responsable, escalamiento y candidato mediante `(id, branchCode)`.
- `FollowUpAttempt`, `FollowUpStatusHistory` y `FollowUpTemplate` materializan la
  sede. Las escrituras de intentos e historia la reciben obligatoriamente.
- Las versiones de reglas, candidatos y eventos de revisión materializan la
  misma sede que la regla. Responsable y revisor deben tener asignación allí.
- La idempotencia de candidatos incluye `branchCode`; una regla de Cochabamba no
  consume ni bloquea la clave equivalente de El Alto.
- Solicitudes de opinión, respuestas, casos y eventos se relacionan por sede con
  visita, expediente y responsables. Lecturas y cambios por ID usan la clave
  compuesta, por lo que otra sede se comporta como registro inexistente.

## Tokens públicos y datos históricos

Los enlaces nuevos tienen el formato `<sucursal>.<secreto>`. El servidor valida
el formato, extrae la sede y busca únicamente por `(branchCode, tokenHash)`; si
se cambia el prefijo, también cambia la huella y el enlace deja de existir.

Los tokens anteriores, que no incorporaban sede, son rechazados de forma
cerrada. Si todavía existe una solicitud abierta anterior al despliegue deberá
emitirse un enlace nuevo desde su visita; el secreto original nunca estuvo
guardado y no puede reconstruirse con seguridad.

## Reportes y KPI

Las bandejas y agregaciones de recordatorios y opiniones filtran ahora el
`branchCode` directo de su tabla, no una relación indirecta con visita. Los
reportes operativos existentes de tiempos, recorrido, atribución, abandonos,
ventas, Caja e inventario ya exigen una sede concreta.

Se conserva una sola excepción deliberada: `/sigeco/sucursales` es una
comparación corporativa explícita, no una consolidación implícita, y continúa
restringida a Dirección y super administración. No existen exports de
seguimientos u opiniones; las descargas documentales existentes ya fueron
protegidas por sede en la Tarea 12.

## Migraciones y reconciliación

- `20260911160000_followups_feedback_branch_scope` agrega las diez columnas
  locales faltantes, deriva únicamente desde padres directos, incorpora índices
  compuestos y actualiza la clave idempotente histórica.
- `20260911170000_harden_followups_feedback_branch_scope` se detiene ante nulos,
  cruces o responsables sin asignación; luego activa las relaciones compuestas,
  vuelve obligatorias las columnas y hace inmutable la sede.
- `pnpm branch:reconcile:continuity` es `dry-run` por defecto y solo muestra IDs
  técnicos, tipos de hallazgo y checksum. Su modo `--apply` exige decisiones
  exactas, checksum vigente y frase de confirmación, y únicamente puede atribuir
  plantillas sin padre. Nunca reescribe intentos, historial, respuestas ni
  eventos append-only.

No se ejecutó ninguna migración, reconciliación ni escritura sobre datos reales.

## Validación

- `pnpm typecheck` ✅
- `pnpm lint` ✅
- Detector: 112 modelos clasificados; deuda temporal de código: 0; queda un solo
  modelo con deuda declarada, correspondiente a la Tarea 14.
- Node local: advertencia por versión 24; el proyecto declara Node 22.

