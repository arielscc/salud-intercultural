# Consultas — cola de derivados, médico a cargo y "llegada" real

Fecha: 2026-08-04. Entorno: código en `develop`. **Con migración**
(`20260804160000_visit_attending_user`, aplicada en local). Afecta la bandeja de
Consultas (`/sigeco/consultas`) y la ficha (`/sigeco/consultas/[visitId]`). Parte
del [Dashboard del médico](../sigeco-medico-dashboard/tasks.md).

Aplica el modo de ejecución vigente: se corrieron **lint, typecheck** y la
migración; QA de navegador, pruebas y build quedan para el cierre acumulado.

## Motivo (feedback de Dirección)

En Consultas se pidió el **mismo sistema de colas** que en Enfermería/Caja:

- Un **card destacado arriba** con los pacientes derivados al médico, para que
  este pueda **tomar la atención**.
- En la tabla inferior, la columna **"Llegada"** debía mostrar la hora de la
  **última derivación** al médico. Mostraba el mismo dato en todos los registros
  (usaba el check-in original de la visita).

Decisiones confirmadas: (1) claim **igual que enfermería**, con "médico que
atiende" en la visita (migración) y varios médicos en paralelo; (2) el card
muestra **solo los pacientes en espera** (los que nadie tomó aún).

## Resultado

- **Card de espera arriba** (patrón `payment-weave`, como el banner de Caja/
  Enfermería): "Derivados al médico" con los pacientes que nadie ha tomado, en
  orden de última derivación (recientes arriba), con enlace **"Atender"**.
- **Médico a cargo (claim)**: en la ficha, bloque "Médico a cargo" con botón
  **"Atender a este paciente"** (asigna al médico actual). Si ya la atiende otro,
  **"Tomar el relevo"** (reasigna); si la atiende quien mira, **"Dejar de
  atender"** (libera). Varios médicos pueden atender pacientes distintos a la vez.
- **Columna "Atiende"** en la tabla y en la lista móvil (nombre del médico o
  "Sin asignar").
- **"Llegada" corregida**: ahora muestra la **última derivación al médico**
  (última transición a `in_consultation` en el historial de estados), con fallback
  al check-in si nunca se re-derivó.

## Alcance técnico

- `prisma/schema.prisma`: `Visit.attendingUserId` + `attendingAt` + relación
  `attendingUser` (`VisitAttendingUser`) + back-relation `attendedVisits` en
  `InternalUser`; índice por `attendingUserId`.
- `prisma/migrations/20260804160000_visit_attending_user/`: columnas + FK + índice.
- `src/modules/database/queries/clinical-care.ts`:
  - `getConsultationVisits` incluye `attendingUser` y la última transición a
    `in_consultation`; agrega `derivedToDoctorAt` y ordena por reciente primero.
  - Nueva `assignConsultationVisit` (tomar/soltar).
  - `getClinicalVisitById` incluye `attendingUser`.
- `src/features/clinical-care/actions.ts`: `assignConsultationVisitAction`
  (claim/release, permiso `clinical_write`, auditada).
- `src/app/(internal)/sigeco/(app)/consultas/page.tsx`: card de espera, columna
  "Atiende", "Llegada" = `derivedToDoctorAt`.
- `src/app/(internal)/sigeco/(app)/consultas/[visitId]/page.tsx`: bloque "Médico a
  cargo" con tomar/relevo/soltar.

## Notas de diseño

- Consultas se basa en **visitas** (no en work items como Enfermería) porque el
  retorno desde Enfermería (`moveVisit`) no crea work item de área médica. Por eso
  el claim se agregó como campo en la visita, no en un work item.

## Validación

- `pnpm lint` y `tsc --noEmit`: aprobados. Migración aplicada; cliente regenerado.

## Pendientes (cierre acumulado)

- QA de navegador: derivar pacientes al médico (desde recepción y desde
  enfermería), verificar card de espera, orden por última derivación, tomar/
  relevo/soltar con dos médicos, columna "Atiende" y "Llegada".
- `pnpm test`, `pnpm run build`.

## Commit Sugerido

`feat(sigeco): consultation queue with attending doctor and real arrival time`
