# Consultas — día de atención (00:00–23:59) y abandonos "no atendido"

Fecha: 2026-08-04. Entorno: código en `develop`. **Con migración**
(`20260804180000_discontinuation_no_show`, aplicada en local). Afecta la bandeja
de Consultas (`/sigeco/consultas`). Parte del
[Dashboard del médico](../sigeco-medico-dashboard/tasks.md).

Aplica el modo de ejecución vigente: se corrieron **lint, typecheck** y la
migración; QA de navegador, pruebas y build quedan para el cierre acumulado.

## Motivo (feedback de Dirección)

El listado de pacientes en consulta debía ser **por día de atención** (00:00–23:59,
hora de Bolivia). Los pacientes que Recepción derivó al médico pero que **no
entraron a la consulta dentro de ese día** (se fueron / ya no están en sala) se
consideran **abandono** y se mandan a **otra tabla** de "pacientes que
abandonaron".

Decisiones confirmadas: (1) abandono = sigue en consulta, sin consulta clínica
registrada, y su última derivación fue antes de hoy; (2) el día se cuenta desde la
**última derivación al médico**; (3) la tabla de abandonos muestra **solo los de
hoy**; (4) motivo **dedicado** en el enum (`no_show`).

## Resultado

- **Lista por día**: la bandeja muestra solo pacientes cuya **última derivación al
  médico** cae en el día boliviano de hoy (00:00–23:59). Los de días anteriores ya
  salieron (atendidos o abandonados).
- **Barrido diario de abandono** (perezoso, al cargar la bandeja, como el de
  Enfermería): cierra como `left_without_care` a las visitas `in_consultation`, sin
  consulta clínica registrada, cuya última derivación al médico fue antes de hoy.
  Registra `VisitDiscontinuation` con motivo `no_show`, área `medico`, actor
  sistema. Idempotente y tolerante a carreras (Serializable).
- **Tabla "Pacientes que abandonaron (hoy)"**: nueva sección en Consultas con los
  abandonos `no_show` cerrados hoy (nombre, código, teléfono, hora de abandono),
  chip rojo "No atendido".

## Alcance técnico

- `prisma/schema.prisma`: enum `VisitDiscontinuationReason` + valor `no_show`.
- `prisma/migrations/20260804180000_discontinuation_no_show/`: `ALTER TYPE ... ADD
  VALUE 'no_show'`.
- `src/features/visit-discontinuations/labels.ts`: etiqueta "No atendido (abandonó)".
- `src/modules/database/queries/visit-discontinuations.ts`:
  `autoAbandonUnattendedConsultationVisits` (barrido diario con `dayRange`).
- `src/modules/database/queries/clinical-care.ts`: `getConsultationVisits` acota al
  día de hoy (filtro por `derivedToDoctorAt` con `dayRange`); nueva
  `getConsultationAbandonedToday`.
- `src/app/(internal)/sigeco/(app)/consultas/page.tsx`: dispara el barrido, trae
  los abandonos y renderiza la tabla.

## Notas de diseño

- El día usa la zona horaria de Bolivia (`dayRange`/`APP_TIME_ZONE`), no la del
  servidor.
- Un paciente derivado ayer que **sí** fue atendido (tiene consulta) pero quedó en
  `in_consultation` no se marca como abandono (no aplica `no_show`) y tampoco
  aparece en la lista de hoy; es un estado poco común que el médico debería cerrar.

## Validación

- `pnpm lint` y `tsc --noEmit`: aprobados. Migración aplicada; cliente regenerado.

## Pendientes (cierre acumulado)

- QA de navegador: derivar al médico, dejar sin atender, avanzar el reloj/cambiar
  de día y verificar que pase a la tabla de abandonos; confirmar zona horaria.
- `pnpm test`, `pnpm run build`.

## Commit Sugerido

`feat(sigeco): daily consultation window with no-show abandonment table`
