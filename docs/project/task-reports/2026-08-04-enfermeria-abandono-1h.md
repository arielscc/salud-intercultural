# Enfermería — abandono automático tras 1 h en espera

Fecha: 2026-08-04. Entorno: código en `develop`. **Sin migración**. Afecta la
bandeja de Enfermería (`/sigeco/enfermeria`) y las queries de enfermería /
discontinuación. Continúa
[Enfermería: cola y responsable](2026-08-04-enfermeria-cola-y-responsable.md).

Aplica el modo de ejecución vigente: se corrieron **lint y typecheck**; QA de
navegador, pruebas y build quedan para el cierre acumulado.

## Motivo (feedback de Dirección)

Un paciente puede estar como máximo **1 h en espera** en Enfermería. Si la supera,
se considera **abandono de la visita** y ya no debe aparecer en la lista de
pacientes a atender.

Decisiones confirmadas: **cierre automático** de la visita como abandono (motivo
"espera"), disparado **al cargar/refrescar la pantalla** (barrido perezoso), y el
tiempo se cuenta **desde que se derivó a Enfermería** (creación de la tarea).

## Resultado

- **Barrido al cargar**: al abrir Enfermería, antes de leer la bandeja, se cierran
  las visitas cuyo paciente lleva **> 60 min en espera** (tarea `pending`, sin
  tomar). Quedan como `left_without_care` con una `VisitDiscontinuation` de motivo
  **`wait`** (actor: sistema, sin `recordedById`). Se bloquean las tareas/órdenes
  pendientes de esa visita.
- **Fuera de la lista**: la bandeja ahora excluye las visitas cerradas
  (`completed`/`left_without_care`/`cancelled`), así los abandonados desaparecen de
  "pacientes a atender" y del recuadro de derivados.
- **Idempotente y tolerante a carreras**: si otra ejecución (o una enfermera que ya
  tomó al paciente) cerró/atendió la visita, el barrido la salta.

## Alcance técnico

- `src/modules/database/queries/visit-discontinuations.ts`: `NURSING_MAX_WAIT_MS`
  (1 h) y `autoAbandonExpiredNursingVisits({ branchCode })` (transacción por
  visita, reusa `updateVisitRouteStatusInTransaction`, crea la discontinuación con
  `reason: "wait"` y `recordedById: null`).
- `src/modules/database/queries/nursing.ts`: `getNursingWorkItems` filtra por
  visita **no cerrada**.
- `src/app/(internal)/sigeco/(app)/enfermeria/page.tsx`: ejecuta el barrido antes
  de listar.

Sin cambios de esquema (`VisitDiscontinuation.recordedById` ya es nullable).

## Notas / límites

- El barrido solo actúa **cuando alguien abre la bandeja** de Enfermería (fue la
  opción elegida). Si nadie la mira por horas, los vencidos se cierran recién en la
  próxima carga. Si se quiere cierre garantizado sin depender de la vista, habría
  que agregar un cron/endpoint programado (queda como opción futura).
- Cuenta desde la **derivación a Enfermería**; una vez que una enfermera **toma**
  al paciente (pasa a "En proceso"), ya no aplica el vencimiento.
- Los pacientes de Enfermería pagan por adelantado; el abandono **no** hace ningún
  ajuste de la venta/pago (solo cierra la visita y bloquea lo pendiente).

## Validación

- `pnpm lint` y `tsc --noEmit`: aprobados. Barrido ejecutado en local sin errores
  (0 cierres: los pendientes actuales están dentro de la ventana de 1 h).

## Pendientes (cierre acumulado)

- QA de navegador: con un pendiente de > 1 h, abrir Enfermería y verificar que se
  cierra por abandono y sale de la lista; ver el registro en el reporte de
  discontinuaciones.
- `pnpm test`, `pnpm run build`.

## Commit Sugerido

`feat(sigeco): auto-abandon nursing visits after 1h waiting`
