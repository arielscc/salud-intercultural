# Enfermería — ficha: detalle, sesiones por cantidad, signos y limpieza

Fecha: 2026-08-04. Entorno: código en `develop`. **Sin migración**. Afecta la
ficha de Enfermería (`/sigeco/enfermeria/[workItemId]`) y el flujo de sesiones.

Aplica el modo de ejecución vigente: **lint y typecheck**; QA de navegador,
pruebas y build quedan para el cierre acumulado.

## Cambios (feedback de Dirección)

1. **Estudios/servicios a realizar más detallados**: la primera tarjeta ahora
   lista todos los estudios/servicios de la tarea (nombre + tipo). Para los
   servicios por sesiones muestra un distintivo **"×N sesiones · faltan M"**.
2. **"Enfermera a cargo" arriba**: se movió a la parte superior de la ficha (con
   realce), antes del detalle de la tarea.
3. **Sesiones según la cantidad de la orden**: el número de sesiones ya **no**
   viene del catálogo (antes Ozonoterapia = 8 fijo). Ahora **= la cantidad pedida
   en la orden** (p. ej. Ozonoterapia ×3 = 3 sesiones) y lo pagado = precio
   unitario × cantidad. Respuesta a "¿quién/dónde se definió?": estaba fijado por
   `sessionCount` del catálogo en `createPaidStudyOrder`; ahora depende de la
   cantidad cobrada en Administración.
4. **Registro de sesión con fecha y hora**: al registrar cada sesión se puede
   indicar **fecha y hora** además de la nota.
5. **Signos vitales**: etiquetas con **unidades** (°C, %, mmHg, lpm, rpm, kg, cm),
   placeholders de ejemplo, aviso de que **no es obligatorio** llenarlos todos (ya
   eran opcionales) y botón **"Guardar signos vitales"** más visible (primario, a
   todo el ancho).
6. **Se quitó** la sección **"No continuará"** de la ficha de Enfermería.

## Alcance técnico

- `src/modules/database/queries/paid-studies.ts`: el paquete de sesiones usa
  `totalSessions = cantidad`, `packagePriceCents/totalPaidCents = unit × cantidad`.
- `src/modules/database/queries/service-sessions.ts`: `consumeServiceSession`
  acepta `appliedAt`.
- `src/features/service-sessions/service-session-actions.ts`: parsea `appliedAt`.
- `src/app/(internal)/sigeco/(app)/enfermeria/[workItemId]/page.tsx`: reorden de la
  tarjeta (enfermera arriba), lista detallada con sesiones, fecha/hora en la
  sesión, signos con unidades + botón visible, se eliminó la tarjeta de
  discontinuación y sus imports/variables sin uso.

Sin cambios de esquema (`ServiceSessionUse.appliedAt` ya existía con default).

## Nota

- El cambio de "sesiones = cantidad" aplica a **nuevas** órdenes. Los paquetes ya
  creados (p. ej. el de Ozonoterapia con 8 que se vio) conservan su valor previo;
  si se quiere corregir uno existente, hay que regenerarlo o ajustarlo a mano.

## Validación

- `pnpm lint` y `tsc --noEmit`: aprobados.

## Pendientes (cierre acumulado)

- QA: derivar Ozonoterapia ×3 y verificar 3 sesiones; registrar sesión con
  fecha/hora; signos vitales parciales; ver la lista detallada y la enfermera
  arriba.
- `pnpm test`, `pnpm run build`.

## Commit Sugerido

`feat(sigeco): nursing detail, sessions from order qty, vitals units`
