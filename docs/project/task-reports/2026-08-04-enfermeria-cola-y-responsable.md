# Enfermería — bandeja como Caja, cola por llegada y responsable

Fecha: 2026-08-04. Entorno: código en `develop`. **Con migración**
(`20260804120000_work_item_assignee`, aplicada en local). Afecta la bandeja de
Enfermería (`/sigeco/enfermeria`) y la ficha (`/sigeco/enfermeria/[workItemId]`).
Parte del [Dashboard del médico](../sigeco-medico-dashboard/tasks.md).

Aplica el modo de ejecución vigente: se corrieron **lint y typecheck** (y la
migración); QA de navegador, pruebas y build quedan para el cierre acumulado.

## Motivo (feedback de Dirección)

La lista de pacientes derivados a Enfermería debía verse **igual que Caja** (mismo
diseño y colores), con información del paciente y en **orden de llegada (cola)**.
Además, como hay **dos enfermeras** que atienden en paralelo, en la ficha (y en la
lista) debe verse **qué enfermera atiende a qué paciente**.

Decisiones confirmadas: asignación con **botón explícito "Atender a este
paciente"** (campo nuevo + migración) y mostrar la enfermera **en la lista y en la
ficha**.

## Resultado

- **Mismos colores que Caja**: los chips de estado ahora usan tono + punto
  (`nursingWorkItemStatusTone`): pendiente = warning, tomada/en proceso = primary,
  completada = success, bloqueada = error, cancelada = neutral.
- **Recuadro destacado de derivados** (patrón `payment-weave`, como el banner de
  cobro en Caja): al entrar a Enfermería aparece arriba un recuadro con los
  pacientes **recién derivados y aún en espera** (status `pending`), con nombre,
  código, tarea, hora de recepción y acceso directo a "Atender".
- **Orden por llegada, recientes arriba**: la bandeja y el recuadro se ordenan por
  `createdAt` descendente (los más recientes primero).
- **Responsable visible**: en la lista (móvil y tabla, columna "Atiende") y en la
  ficha se muestra la enfermera a cargo o "Sin asignar".
- **Atención en paralelo**: botón **"Atender a este paciente"** en la ficha que
  asigna a la enfermera actual y pasa la tarea a "En proceso" (deja registro).
  Si ya la atiende otra, el botón es **"Tomar el relevo"** (reasigna); si la
  atiende quien mira, aparece **"Dejar de atender"** (libera). Cada tarea es
  independiente, así que dos enfermeras pueden atender pacientes distintos a la vez.

## Alcance técnico

- `prisma/schema.prisma`: `VisitWorkItem.assignedToId` + `assignedAt` + relación
  `assignedTo` (nombres de relación `WorkItemCreatedBy`/`WorkItemAssignedTo` para
  convivir con `createdBy`). Índice por `assignedToId`.
- `prisma/migrations/20260804120000_work_item_assignee/`: columnas + FK + índice.
- `src/modules/database/queries/nursing.ts`: `getNursingWorkItems`/
  `getNursingWorkItemById` incluyen `assignedTo`; orden por llegada; nueva
  `assignNursingWorkItem` (asigna/libera; al tomar pasa a "en proceso" y registra).
- `src/features/nursing/labels.ts`: `nursingWorkItemStatusTone`.
- `src/features/nursing/actions.ts`: `assignNursingWorkItemAction` (claim/release,
  permiso `nursing_write`, auditada).
- `src/app/(internal)/sigeco/(app)/enfermeria/page.tsx`: chips con color, columna
  "Atiende", responsable en la lista.
- `src/app/(internal)/sigeco/(app)/enfermeria/[workItemId]/page.tsx`: bloque
  "Enfermera a cargo" + botones atender/relevo/dejar.

## Validación

- `pnpm lint` y `tsc --noEmit`: aprobados. Migración aplicada; cliente regenerado.

## Pendientes (cierre acumulado)

- QA de navegador: derivar pacientes a Enfermería, verificar cola por llegada,
  colores, tomar/relevar/dejar con dos usuarias, responsive.
- `pnpm test`, `pnpm run build`.

## Commit Sugerido

`feat(sigeco): nursing queue like cashier + patient assignee`
