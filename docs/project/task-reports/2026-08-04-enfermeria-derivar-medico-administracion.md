# Enfermería — derivar al médico y a Administración (cobro adicional)

Fecha: 2026-08-04. Entorno: código en `develop`. **Sin migración** (reusa
modelos existentes). Afecta la ficha de Enfermería
(`/sigeco/enfermeria/[workItemId]`) y el flujo de estudios pagados que también
usan Consulta y Recepción. Parte del
[Dashboard del médico](../sigeco-medico-dashboard/tasks.md).

Aplica el modo de ejecución vigente: se corrieron **lint y typecheck**; QA de
navegador, pruebas y build quedan para el cierre acumulado.

## Motivo (feedback de Dirección)

Desde la ficha de Enfermería la enfermera debe poder **derivar al paciente**:

- **Al médico**: se devuelve con todo lo registrado (signos, aplicaciones,
  estudios). Solo se manda de vuelta al médico; los datos ya son visibles en su
  vista.
- **A Administración**: cuando el paciente necesita **pagar algo adicional** que
  solicitó (ej. una inyección extra a la indicada por el médico). La enfermera ve
  un modal de "causa" con la lista de estudios/servicios/productos; se genera la
  **orden de cobro** y la ficha pasa a Administración. **Al pagar en Caja, vuelve
  a Enfermería** para administrar lo solicitado.

Decisiones confirmadas: (1) el botón al médico **reemplaza** al anterior de
estudios pagados por uno general; (2) el modal permite **catálogo + productos de
inventario**; (3) la tarea de enfermería actual **se mantiene abierta** durante el
paso por Administración.

## Resultado

- Nueva tarjeta **"Derivar al paciente"** en la ficha con dos acciones:
  - **Derivar a Administración (cobro)**: abre el modal (reusa
    `PaidStudyOrderDialog`) con estudios/servicios de enfermería **y productos de
    inventario**. Genera la orden de cobro (venta pendiente) y mueve la visita a
    `in_administration`. La tarea de enfermería **queda abierta**.
  - **Derivar al médico**: cierra la tarea de enfermería y devuelve la visita a
    `in_consultation`, sin candado de estudios.
- **Retorno sin duplicar**: al cobrar, Administración usa el flujo existente
  ("Cobro de estudios / servicios" → enviar a Enfermería). `releasePaidStudiesToNursing`
  ahora **reutiliza la tarea de enfermería abierta** si existe (en vez de crear una
  nueva), evitando que el paciente aparezca dos veces en la cola. Si no hay tarea
  abierta (flujo desde Consulta/Recepción), la crea como antes.
- **Abandono 1h**: como la visita pasa a `in_administration` mientras paga, el
  barrido de abandono (que opera sobre la cola de enfermería) no la afecta.

## Alcance técnico

- `src/features/clinical-care/schemas/paid-study.schema.ts`: las líneas admiten
  `catalogItemId` **o** `inventoryItemId` (refine exactamente uno). El formulario
  ahora envía `studyRef` (`catalog:<id>` / `product:<id>`) alineado con
  precio/cantidad; `parsePaidStudyForm` lo decodifica. Retrocompatible con
  Consulta/Recepción (siguen mandando catálogo).
- `src/components/internal/PaidStudyOrderDialog.tsx`: `PaidStudyOption.kind`
  (`catalog`/`product`), emite `studyRef`; título/descripción/mensaje-vacío
  configurables por props.
- `src/modules/database/queries/paid-studies.ts`:
  - `createPaidStudyOrder` valida y arma líneas de **catálogo y de inventario**
    (producto → ítem de venta `product`, orden clínica `nursing_application`);
    `source` admite `"nursing"`.
  - `releasePaidStudiesToNursing` reutiliza tarea de enfermería abierta.
  - Nueva `deriveNursingPatientToDoctor` (cierra tarea + vuelve a consulta).
- `src/modules/database/queries/nursing.ts`: nueva `getNursingChargeOptions`
  (estudios/servicios de enfermería + productos de inventario).
- `src/features/nursing/actions.ts`: `deriveNursingToDoctorAction` y
  `createNursingChargeOrderAction` (permiso `nursing_write`, auditadas).
- `src/app/(internal)/sigeco/(app)/enfermeria/[workItemId]/page.tsx`: tarjeta
  "Derivar al paciente" con el modal y el botón al médico.
- Tests: `paid-study.schema.test.ts` actualizado a `studyRef` + caso de producto.

## Validación

- `pnpm lint` y `tsc --noEmit`: aprobados.

## Pendientes (cierre acumulado)

- QA de navegador: derivar a Administración con producto de inventario, cobrar en
  Caja, verificar retorno a la **misma** tarea de enfermería; derivar al médico y
  confirmar que ve signos/aplicaciones/estudios.
- `pnpm test`, `pnpm run build`.

## Commit Sugerido

`feat(sigeco): nursing derivations to doctor and administration (extra charges)`
