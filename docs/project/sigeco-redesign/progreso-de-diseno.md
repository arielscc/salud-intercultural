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
| 8. Modulo Administracion (Caja) | Completada (2026-07-09) |
| 9. Modulo Seguimientos | Completada (2026-07-09) |
| 10. Modulo Inventario | Completada (2026-07-09) |
| 11. Login interno | Completada (2026-07-09) |
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

### 2026-07-09 — Tarea 8: Modulo Administracion (Caja)

**Que se hizo:**

- **Componente nuevo:** `Chip` en `src/components/internal/ui/Chip.tsx` (tonos neutral/primary/success/warning/error, punto opcional) — el patron de chip se repetia por tercera vez; los modulos anteriores lo adoptaran en la tarea 12 de limpieza.
- **Bandeja (`administracion/page.tsx`):** resumen de dinero como 3 `KpiCard` con iconos (cobrado hoy, ventas del mes, saldo pendiente con bandera warn "Por cobrar" cuando > 0). "Pendientes derivados" de cards a `Table`: paciente (link + codigo), tarea, indicacion (tipo + medico), venta (total · saldo) y estado como `Chip` semantico (warning con saldo, success pagada, neutral sin venta = area). Estado vacio como fila.
- **Tarea (`administracion/[workItemId]/page.tsx`):** dos columnas. Izquierda: ficha con el pendiente administrativo en panel inset + formulario "Registrar venta" reorganizado (tipo/producto inventariable en par, cantidad/precio/descuento en 3 columnas, cobro inicial/forma de pago en par, boton al pie tras separador). Derecha: "Ventas de esta tarea" como `TimelineItem` (total linkeado al comprobante, estado como aside, saldo como body). Mismos names, hidden inputs y actions.
- **Comprobante (`administracion/ventas/[saleId]/page.tsx`):** encabezado con chip semantico (warning si hay saldo, success si pagado); items como `Table` con columnas numericas alineadas a la derecha; bloque de totales alineado a la derecha (`SummaryRow` con total en bold y saldo en warning cuando > 0); pagos como `Table` (monto, metodo, fecha, referencia). El formulario "Registrar cobro" va como rail derecho solo cuando hay saldo (`hasBalance` condiciona el layout de 2 columnas); misma condicion y action de siempre.

**Archivos tocados:** `src/components/internal/ui/Chip.tsx` (nuevo), `src/app/(internal)/sigeco/(app)/administracion/{page,[workItemId]/page,ventas/[saleId]/page}.tsx`.

**Validaciones:** `pnpm lint` OK, `pnpm typecheck` OK, `pnpm test` 54 tests OK, `pnpm run build` OK. Verificacion visual con datos de QA: bandeja con KPIs (Bs 130,00 ventas del mes) y estado vacio; comprobante pagado con chip "Pagado", totales con descuento Bs 10,00 y pago QA-PAGO-001 en tabla.

**Pendientes que deja la tarea:** el estado visible de error para venta con stock insuficiente requiere manejo de errores en la action (fuera del rediseno; ya registrado como pendiente transversal de V3).

**Commit sugerido:** `feat(sigeco): redesign administration module with marea system`

### 2026-07-09 — Tarea 9: Modulo Seguimientos

**Que se hizo:**

- **Bandeja (`seguimientos/page.tsx`):** resumen como 3 `KpiCard` (vencidos con bandera crit "Atender primero" cuando > 0, hoy, proximos). Filtros vencidos/hoy/proximos como tabs con **estado activo visible** (tint primario segun el `filtro` actual — antes no se distinguia el filtro aplicado). Lista de cards a `Table`: paciente/lead (link + codigo o "Lead"), tarea, telefono, vence (fecha en error + sufijo "vencido" si esta vencida y pendiente) y estado como `Chip`. Estado vacio como fila con texto guia.
- **Correccion de bug visual preexistente:** el resaltado de tareas vencidas usaba `border-danger/40`, pero el color `danger` no existe en `tailwind.config.ts` (el token es `error`), por lo que nunca se aplico. El nuevo resaltado usa la familia `error` correcta (texto + palabra "vencido", no solo color).
- **Detalle (`seguimientos/[taskId]/page.tsx`):** dos columnas (`xl:grid-cols-[1.4fr_1fr]`). Izquierda: ficha (codigo o "Lead", nombre, titulo de la tarea, `Chip` de estado, `<dl>` con vencimiento y telefono, acciones rapidas "Llamar" outline y "WhatsApp" primaria con iconos y mismos hrefs `tel:`/`wa.me`) e "Historial" como `TimelineItem` (resultado como titulo, metodo + fecha como meta). Derecha: formulario "Registrar contacto" (metodo, resultado, notas) con la misma action.

**Archivos tocados:** `src/app/(internal)/sigeco/(app)/seguimientos/page.tsx`, `src/app/(internal)/sigeco/(app)/seguimientos/[taskId]/page.tsx`.

**Validaciones:** `pnpm lint` OK, `pnpm typecheck` OK, `pnpm test` 54 tests OK, `pnpm run build` OK. Verificacion visual: bandeja con tabs activos y estado vacio (la unica tarea QA esta resuelta y la query trae pendientes), detalle abierto por id directo con chip "No mejoro", botones Llamar/WhatsApp e historial del intento QA.

**Pendientes que deja la tarea:** ninguno nuevo.

**Commit sugerido:** `feat(sigeco): redesign follow-ups module with marea system`

### 2026-07-09 — Tarea 10: Modulo Inventario

**Que se hizo:**

- **Lista (`inventario/page.tsx`):** 3 `KpiCard` (productos activos; stock bajo con bandera warn "Reponer"; alertas abiertas con bandera crit "Revisar"). Layout de dos columnas: tabla "Productos" a la izquierda (producto con link + codigo, SKU, stock y minimo alineados a la derecha con `tabular-nums`, estado como `Chip` warning "Stock bajo" + mensaje de alerta en error truncado) y formulario "Nuevo producto" como rail derecho en `Card` (mismos campos y action). Stock actual en warning cuando esta bajo el minimo.
- **Detalle (`inventario/[itemId]/page.tsx`):** dos columnas. Izquierda: ficha (codigo eyebrow, nombre, SKU, chip "Stock bajo"/"Stock normal", `<dl>` con stock actual en warning si corresponde, minimo y estado activo) y "Movimientos" como `Table` (tipo, cantidad con signo en success/error, stock despues, fecha, motivo truncado). Derecha: formularios "Entrada de stock" (boton primario) y "Ajuste autorizado" (outline), mismos campos y actions.
- **Correccion del mismo bug `danger`:** la lista usaba `border-danger/40` y `text-danger` (color inexistente en Tailwind config), por lo que ni el resaltado de stock bajo ni el color del mensaje de alerta se aplicaban. Ahora usan las familias `warning`/`error` reales, siempre con texto ademas del color.

**Archivos tocados:** `src/app/(internal)/sigeco/(app)/inventario/page.tsx`, `src/app/(internal)/sigeco/(app)/inventario/[itemId]/page.tsx`.

**Validaciones:** `pnpm lint` OK, `pnpm typecheck` OK, `pnpm test` 54 tests OK, `pnpm run build` OK. Verificacion visual con datos de QA: lista con "Suero QA V3" (61 unidades, minimo 4, sin alerta) y formulario en rail; detalle con chip "Stock normal" y movimientos append-only con deltas +1/-1 coloreados, incluida la "Salida por venta" automatica.

**Pendientes que deja la tarea:** UI de proveedores sigue fuera de alcance (pendiente V4 conocido).

**Commit sugerido:** `feat(sigeco): redesign inventory module with marea system`

### 2026-07-09 — Tarea 11: Login Interno

**Que se hizo:**

- `login/page.tsx` restilizado con los componentes Marea: card centrada `max-w-sm` con borde hairline y radio 9px (se eliminaron el fondo hardcodeado `bg-[#f5f8f9]` y la sombra publica `shadow-soft`, prohibida por la spec), icono de candado sobre tint `surface-soft`, eyebrow "Sigeco · Salud Intercultural" en versalitas, inputs con `Field`/`internalInputClassName`, boton `Button` primario y nota de pie "Acceso exclusivo para el personal de la clinica".
- Banner de error restilizado con la familia `error` (punto + texto, sin borde decorativo), mismos mensajes para `locked` y credenciales invalidas.
- `min-h-screen` cambiado a `min-h-dvh` (consistente con el shell).
- Misma action `loginInternalUser`, mismos names y autocompletes.

**Archivos tocados:** `src/app/(internal)/sigeco/login/page.tsx`.

**Validaciones:** `pnpm lint` OK, `pnpm typecheck` OK, `pnpm test` 54 tests OK, `pnpm run build` OK. Verificacion visual del estado de error (`?error=1`) y login funcional end-to-end con el usuario local (redirige a `/sigeco`).

**Pendientes que deja la tarea:** ninguno nuevo.

**Commit sugerido:** `feat(sigeco): redesign internal login with marea system`

### 2026-07-09 — Mejoras de UX del login (pedido explicito del usuario)

**Que se hizo:**

- **Mostrar/ocultar contraseña:** nuevo componente cliente `PasswordInput` (`src/components/internal/PasswordInput.tsx`) con boton de ojo (`Eye`/`EyeOff`), `aria-label` y `aria-pressed`; mantiene `name`, `autoComplete` y `required` del input original.
- **Soporte por WhatsApp:** boton outline "Contactar soporte" bajo el formulario que abre `https://wa.me/59177557034` con el mensaje precargado "Hola, necesito ayuda con el acceso a Sigeco." (numero 775 57034 con codigo de pais 591).
- **Conservar email al fallar el login:** unica excepcion aprobada a la regla "solo diseno" — `loginInternalUser` ahora incluye el email en el redirect de error (`?error=...&email=...`) y la pagina lo repone como `defaultValue`; la contraseña nunca viaja ni se repone. Decision de seguridad: el comportamiento es **identico exista o no la cuenta** (mismo mensaje generico, mismo email conservado) para no permitir enumeracion de usuarios; se descarto "limpiar todo si el usuario no existe" por ese motivo, explicado y aceptado en sesion.

**Archivos tocados:** `src/components/internal/PasswordInput.tsx` (nuevo), `src/app/(internal)/sigeco/login/page.tsx`, `src/features/internal-auth/actions.ts` (solo el redirect de error).

**Validaciones:** `pnpm lint` OK, `pnpm typecheck` OK, `pnpm test` 54 tests OK, `pnpm run build` OK. Verificacion funcional en navegador: login fallido conserva `test@test.si` con contraseña vacia, toggle alterna `type` password/text, link de WhatsApp correcto, login exitoso redirige a `/sigeco` (y resetea el contador de intentos fallidos generado por la prueba).

**Commit sugerido:** `feat(sigeco): improve login ux with password toggle and support contact`
