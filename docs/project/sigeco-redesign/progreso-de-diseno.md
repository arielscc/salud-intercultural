# Progreso De Diseno (Rediseno Sigeco Marea)

Registro de tareas completadas del rediseno. El plan detallado vive en [Tareas de rediseno](./tareas-de-rediseno.md); la especificacion visual en [Sistema Visual Sigeco](../../design/sigeco-visual-system.md).

Formato de cada entrada: fecha, que se hizo, archivos tocados, validaciones ejecutadas y pendientes que dejo la tarea.

## Estado General

| Tarea | Estado |
| --- | --- |
| 1. Fundaciones Marea y shell de escritorio | Completada (2026-07-08) |
| 2. Dashboard | Completada (2026-07-08) |
| 3. Modulo Leads | Completada (2026-07-08) |
| 4. Modulo Pacientes | Completada (2026-07-08) |
| 5. Modulo Visitas | Completada (2026-07-08) |
| 6. Modulo Consultas | Completada (2026-07-08) |
| 7. Modulo Enfermeria | Completada (2026-07-08) |
| 8. Modulo Administracion (Caja) | Pendiente |
| 9. Modulo Seguimientos | Pendiente |
| 10. Modulo Inventario | Pendiente |
| 11. Login interno | Pendiente |
| 12. Limpieza y QA visual final | Pendiente |

## Pendientes Funcionales Detectados

Mejoras visibles en la propuesta aprobada que requieren logica nueva y por eso quedan fuera del rediseno (solo diseno):

1. Busqueda global en el header (paciente, lead o telefono desde cualquier modulo).
2. Contadores de pendientes junto a los items de la sidebar.
3. Grafico "Leads por semana" en el dashboard (requiere query de agregacion semanal).
4. Panel "Pendientes por area" en el dashboard (requiere query agregada de work items).
5. Ordenamiento por columnas y filtros avanzados en tablas (evaluar TanStack Table).

## Entradas

### 2026-07-08 — Tarea 1: Fundaciones Marea Y Shell De Escritorio

**Que se hizo:**

- Tokens Marea scopeados a `.sigeco-app` en `src/app/(internal)/sigeco/sigeco.css`; la clase vive en el `<html>` del layout de Sigeco, por lo que las utilidades Tailwind existentes toman los valores Marea solo dentro del panel.
- Fuente IBM Plex Sans (400/500/600) agregada via `next/font` en el layout de Sigeco con variable `--font-plex`; el body interno la usa con fallback a Inter.
- Token `warning` agregado de forma aditiva: `--color-warning` en `:root` y `.dark` de `globals.css` (valores ambar publicos actuales) y color `warning` en `tailwind.config.ts`. Ningun estilo publico existente cambia.
- Libreria UI base creada en `src/components/internal/ui/`: `Button` (cva: primary/outline/ghost/danger, sm/md), `Card` + `CardHeader`, `Table` + `Th`/`Tr`/`Td` (scroll horizontal propio, encabezados en versalitas), `KpiCard` (cifra Sora tabular, bandera warn/crit) y `PageHeader`.
- `InternalShell` reescrito como shell de pantalla completa: `h-dvh overflow-hidden`, sidebar fija de 220px en `lg+` con los 9 modulos y usuario al pie, header superior con fecha, usuario y logout, y `<main>` como unica zona con scroll. La tab bar inferior movil fue eliminada.
- Navegacion extraida a `nav-items.ts` + `SidebarNav.tsx` (cliente, estado activo por `usePathname`) + `MobileSidebar.tsx` (cliente, drawer con overlay para `< lg`).
- `StatusPill` restilizado a las familias semanticas Marea (punto + etiqueta, tints; solido solo para `converted_to_patient`) manteniendo su API y los 9 + 7 estados existentes.
- `Field` e `internalInputClassName` adoptan radio 9px, altura 44px y etiqueta 13px medium, sin cambio de API.

**Archivos tocados:** `src/app/(internal)/sigeco/sigeco.css` (nuevo), `src/app/(internal)/sigeco/layout.tsx`, `src/app/globals.css` (solo adicion de `--color-warning`), `tailwind.config.ts` (solo adicion de `warning`), `src/components/internal/ui/{Button,Card,Table,KpiCard,PageHeader}.tsx` (nuevos), `src/components/internal/{InternalShell,SidebarNav,MobileSidebar,StatusPill,Field}.tsx`, `src/components/internal/nav-items.ts` (nuevo).

**Validaciones:** `pnpm lint` OK, `pnpm typecheck` OK, `pnpm test` 18 archivos / 54 tests OK, `pnpm run build` OK (todas las rutas publicas, Payload y Sigeco generadas).

**Pendientes que deja la tarea:**

- Verificacion visual en navegador: COMPLETADA el mismo dia (2026-07-08) con usuario local sembrado via `pnpm internal:seed`. Confirmado en `http://localhost:3000/sigeco`: sidebar fija con estado activo, header con fecha/usuario/logout, tokens Marea aplicados, documento sin scroll (`docScrollable: false`; solo `<main>` con `overflow-y: auto`) y drawer movil funcionando en 390px.
- Las paginas internas aun usan su maquetado anterior dentro del nuevo shell; se restilizan en las tareas 2-11. El dashboard y las listas se ven mas anchos que antes (el shell ya no limita a `max-w-6xl`), lo cual es esperado durante la transicion.
- El login interno recibe los tokens Marea (colores) pero conserva su maquetado hasta la Tarea 11.

**Commit sugerido:** `feat(sigeco): add marea design system foundations and desktop shell`

### 2026-07-08 — Tarea 2: Dashboard

**Que se hizo:**

- `/sigeco` rediseniado con los componentes Marea: `PageHeader` ("Trabajo de hoy" + acceso directo "Nuevo lead" hacia `/sigeco/leads/nuevo`), fila de 5 `KpiCard` (grid `sm:3 / xl:5`) y "Leads recientes" convertido de lista de cards a `Table` con columnas nombre (link al detalle), telefono (`tabular-nums`), origen (`leadSourceLabels`) y estado (`LeadStatusPill`).
- Banderas de atencion: `warn` "Atender hoy" en recordatorios vencidos y `crit` "Reponer" en stock bajo, solo cuando el valor es mayor a 0 (icono + texto, nunca solo color).
- `Th`, `Td` y `Tr` de la libreria interna ahora aceptan atributos HTML estandar (`colSpan` para el estado vacio de la tabla).
- Mismas 4 queries de siempre (`getInternalLeadWorkSummary`, `getFollowUpWorkSummary`, `getInventorySummary`, `getInternalLeads`); cero cambios de logica.

**Archivos tocados:** `src/app/(internal)/sigeco/(app)/page.tsx`, `src/components/internal/ui/Table.tsx`.

**Validaciones:** `pnpm lint` OK, `pnpm typecheck` OK, `pnpm test` 54 tests OK, `pnpm run build` OK. Verificacion visual en `http://localhost:3000/sigeco` con usuario local: KPIs en fila con bandera "Atender hoy" activa (habia 1 recordatorio vencido), tabla con pills y hover, boton "Nuevo lead" en el header de pagina.

**Pendientes que deja la tarea:** los ya registrados como pendientes funcionales (grafico "Leads por semana" y panel "Pendientes por area" requieren queries nuevas).

**Commit sugerido:** `feat(sigeco): redesign dashboard with marea layout`

### 2026-07-08 — Tarea 3: Modulo Leads

**Que se hizo:**

- **Lista (`leads/page.tsx`):** de cards apiladas a `Table` con columnas nombre (link al detalle + ciudad como sublinea), telefono (`tabular-nums`), origen, interes (`intentionToVisit`, truncado), estado (`LeadStatusPill`) y proximo recordatorio (`reminders[0].dueAt`). Busqueda y los 2 selects de filtro existentes restilizados en una fila dentro de `Card` (`2fr 1fr 1fr auto`) con boton "Filtrar" outline; mismo form GET con los mismos `searchParams`. `PageHeader` con boton "Nuevo lead". Estado vacio como fila de tabla.
- **Detalle (`leads/[id]/page.tsx`):** layout de dos columnas (`xl:grid-cols-[1.4fr_1fr]`). Izquierda: ficha en `Card` (origen como eyebrow, nombre, telefono, pill, datos en `<dl>` de dos columnas con etiquetas en versalitas, aviso o boton "Convertir a paciente" con el mismo href) + historial comercial con items de timeline planos separados por hairline (titulo + fecha tabular en la misma linea). Derecha: los 3 formularios de accion en cards (`Actualizar estado` con boton primario, `Registrar contacto` y `Crear recordatorio` con boton outline), mismos campos, names y actions.
- **Nuevo (`leads/nuevo/page.tsx`):** formulario en `Card` centrado (`max-w-3xl`) con pares de campos en `sm:grid-cols-2` (nombre/telefono, email/ciudad, fuente/fecha estimada) y textareas a ancho completo; boton "Crear lead" alineado a la derecha tras un separador. Misma action y mismos names.

**Archivos tocados:** `src/app/(internal)/sigeco/(app)/leads/page.tsx`, `src/app/(internal)/sigeco/(app)/leads/[id]/page.tsx`, `src/app/(internal)/sigeco/(app)/leads/nuevo/page.tsx`.

**Validaciones:** `pnpm lint` OK, `pnpm typecheck` OK, `pnpm test` 54 tests OK, `pnpm run build` OK. Verificacion visual de las 3 pantallas en el navegador con datos reales: lista con filtros y pills, detalle de lead convertido con historial completo, formulario nuevo.

**Pendientes que deja la tarea:** ordenamiento por columnas y paginacion visible (la query pagina con `pageSize: 30` pero la UI actual no expone controles de pagina; ya estaba asi y agregar controles requiere logica de navegacion nueva — registrado como pendiente funcional 5).

**Commit sugerido:** `feat(sigeco): redesign leads module with marea system`

### 2026-07-08 — Tarea 4: Modulo Pacientes

**Que se hizo:**

- **Componentes promovidos:** `TimelineItem` e `InfoRow` se repetian entre leads y pacientes, asi que se movieron a `src/components/internal/ui/` (regla transversal 4) y el detalle de leads ahora los importa de ahi. `TimelineItem` acepta `title`/`body` como nodos y un `aside` opcional para mostrar un estado en lugar de la fecha.
- **Lista (`pacientes/page.tsx`):** de cards a `Table` con columnas nombre (link al detalle), codigo interno, telefono, ciudad y numero de visitas (todo `tabular-nums`). Busqueda existente en `Card` de una fila. `PageHeader` con boton "Nuevo paciente". Estado vacio como fila.
- **Detalle (`pacientes/[id]/page.tsx`):** dos columnas (`xl:grid-cols-[1.4fr_1fr]`). Izquierda: ficha (codigo como eyebrow, nombre, `<dl>` con telefono/alternativo/genero/ciudad/fuente), ficha permanente (`InfoRow` con fallback "Sin registro"), visitas como tabla (llegada linkeada, area actual, `VisitStatusPill`), timeline de enfermeria (signos vitales, aplicaciones y notas como `TimelineItem` planos), estudios, cronologia administrativa como tabla (total linkeado a la venta, pagado, saldo, estado) e historial de seguimiento (titulo linkeado + estado como aside). Derecha: formularios "Registrar llegada" (boton primario) y "Crear seguimiento" (outline), mismos campos y actions.
- **Nuevo (`pacientes/nuevo/page.tsx`):** card centrada `max-w-3xl`; aviso de duplicado restilizado con familia warning (punto + texto, sin solo-color); nombre completo a ancho total, pares telefono/alternativo, nacimiento/genero, ciudad/departamento; textareas a ancho completo; boton al pie tras separador. Mismos hidden inputs (`allowDuplicate`, `sourceLeadId`) y misma action.

**Archivos tocados:** `src/components/internal/ui/TimelineItem.tsx` (nuevo), `src/components/internal/ui/InfoRow.tsx` (nuevo), `src/app/(internal)/sigeco/(app)/leads/[id]/page.tsx` (usa los componentes compartidos), `src/app/(internal)/sigeco/(app)/pacientes/{page,nuevo/page,[id]/page}.tsx`.

**Validaciones:** `pnpm lint` OK, `pnpm typecheck` OK, `pnpm test` 54 tests OK, `pnpm run build` OK. Verificacion visual con datos reales de QA: lista con paciente SI-000001, detalle completo con visita "En consulta", signos vitales y formularios en rail derecho.

**Pendientes que deja la tarea:** edicion de la ficha permanente del paciente sigue sin existir (pendiente funcional conocido de V3, fuera del rediseno).

**Commit sugerido:** `feat(sigeco): redesign patients module with marea system`

### 2026-07-08 — Tarea 5: Modulo Visitas

**Que se hizo:**

- **Lista (`visitas/page.tsx`):** de cards a `Table` con columnas paciente (link al detalle), telefono, llegada, area actual, tareas (chip con conteo de pendientes en tint primario, o em-dash) y estado (`VisitStatusPill`). Filtro de estado existente en `Card` de una fila con boton "Filtrar" outline; mismo comportamiento (`activeOnly` cuando no hay filtro). `PageHeader` con accion "Buscar paciente" hacia `/sigeco/pacientes`. Estado vacio como fila.
- **Detalle (`visitas/[id]/page.tsx`):** dos columnas (`xl:grid-cols-[1.4fr_1fr]`). Izquierda: ficha de la visita (codigo del paciente como eyebrow, nombre, telefono, pill de estado, `<dl>` con area actual, llegada y motivo), "Tareas de visita" como `TimelineItem` (estado del work item como aside, area + fecha como meta, descripcion como body) y "Ruta del paciente" igual (area como titulo, estado como aside). Derecha: formulario "Derivar paciente" con los mismos selects de estado/area, nota y action `updateVisitStatusAction`.
- Se agregaron textos de estado vacio en tareas y ruta (antes las secciones quedaban en blanco) y el dato de llegada en la ficha del detalle (ya venia en la query; solo presentacion).

**Archivos tocados:** `src/app/(internal)/sigeco/(app)/visitas/page.tsx`, `src/app/(internal)/sigeco/(app)/visitas/[id]/page.tsx`.

**Validaciones:** `pnpm lint` OK, `pnpm typecheck` OK, `pnpm test` 54 tests OK, `pnpm run build` OK. Verificacion visual con datos de QA: lista filtrada por "En consulta" con chip "2 pendientes", detalle con 4 tareas de visita (completadas y pendientes) y ruta Medico/Recepcion.

**Pendientes que deja la tarea:** ninguno nuevo.

**Commit sugerido:** `feat(sigeco): redesign visits module with marea system`

### 2026-07-08 — Tarea 6: Modulo Consultas

**Que se hizo:**

- **Bandeja (`consultas/page.tsx`):** de cards a `Table` con columnas paciente (link), telefono, llegada, area actual, consulta (chip success "Registrada" con punto cuando `clinicalConsultation` existe, em-dash si no) y estado (`VisitStatusPill`). `PageHeader` "Consultas / Atencion medica". Estado vacio como fila.
- **Consulta (`consultas/[visitId]/page.tsx`):** dos columnas (`xl:grid-cols-[1.5fr_1fr]`). Izquierda: ficha del paciente con alergias, antecedentes y motivo de recepcion como `InfoRow` prominentes (informacion critica para el medico), y el formulario "Consulta medica" completo en `Card`: motivo, diagnosticos principal/secundario en par (`sm:grid-cols-2`), hallazgos, observaciones, plan, indicaciones, la receta rapida como `<fieldset>` con fondo `background` y legend (medicamento + dosis/frecuencia/duracion en 3 columnas + observaciones), evolucion y boton "Guardar consulta" al pie tras separador. Mismos names, defaults y action. Derecha: formulario "Indicacion para otra area" (mismos selects de tipo/area destino), "Ordenes clinicas" como `TimelineItem` (estado como aside) y "Estudios y enfermeria" (estudios con estado como aside, signos vitales y aplicaciones con los mismos limites `slice(0,3)`).

**Archivos tocados:** `src/app/(internal)/sigeco/(app)/consultas/page.tsx`, `src/app/(internal)/sigeco/(app)/consultas/[visitId]/page.tsx`.

**Validaciones:** `pnpm lint` OK, `pnpm typecheck` OK, `pnpm test` 54 tests OK, `pnpm run build` OK. Verificacion visual con datos de QA: bandeja con chip "Registrada", consulta con diagnosticos precargados ("Lumbalgia mecanica en evaluacion"), ordenes clinicas con estados Pendiente/Completada en el rail.

**Pendientes que deja la tarea:** ninguno nuevo. El formato de receta imprimible sigue como pendiente transversal de V3 (fuera del rediseno).

**Commit sugerido:** `feat(sigeco): redesign consultations module with marea system`

### 2026-07-08 — Tarea 7: Modulo Enfermeria

**Que se hizo:**

- **Bandeja (`enfermeria/page.tsx`):** de cards a `Table` con columnas paciente (link + codigo interno como sublinea), tarea (titulo + descripcion truncados), indicacion (tipo de orden clinica + medico, o em-dash) y estado (chip neutro con `nursingWorkItemStatusLabels`). Estado vacio como fila con texto de guia.
- **Ejecucion (`enfermeria/[workItemId]/page.tsx`):** dos columnas (`xl:grid-cols-[1.5fr_1fr]`). Izquierda: ficha del paciente con la indicacion medica destacada en panel inset (tipo de orden como versalita, titulo, detalle y "Registro: X"), y los 3 formularios de registro clinico en cards: "Signos vitales" (8 campos en `sm:2 / xl:4` columnas), "Aplicacion clinica" (cantidad/via/hora en 3 columnas, boton primario) y "Estudio". Derecha: "Estado de tarea" (accion principal, boton primario) y "Nota de enfermeria". Mismos names, hidden inputs, defaults y actions.
- Limpieza: el formulario de aplicacion clinica tenia el hidden input `workItemId` duplicado; se dejo uno (mismo dato enviado).

**Archivos tocados:** `src/app/(internal)/sigeco/(app)/enfermeria/page.tsx`, `src/app/(internal)/sigeco/(app)/enfermeria/[workItemId]/page.tsx`.

**Validaciones:** `pnpm lint` OK, `pnpm typecheck` OK, `pnpm test` 54 tests OK, `pnpm run build` OK. Verificacion visual: bandeja con estado vacio (las tareas QA estan completadas y la query trae solo activas) y detalle abierto por id directo con la indicacion "Aplicar Suero QA V3" destacada, formularios precargados y rail de estado/nota.

**Pendientes que deja la tarea:** ninguno nuevo.

**Commit sugerido:** `feat(sigeco): redesign nursing module with marea system`
