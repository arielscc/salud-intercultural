# Tareas De Rediseno Sigeco (Marea)

Plan tecnico para migrar todo el panel interno Sigeco al sistema visual **Marea**. La especificacion visual canonica es [Sistema Visual Sigeco](../../design/sigeco-visual-system.md). El estado de cada tarea se registra en [Progreso de diseno](./progreso-de-diseno.md).

## Reglas Transversales (aplican a todas las tareas)

1. **Solo diseno.** No se modifica ninguna query (`src/modules/database/queries/`), server action (`src/features/*/actions*`), permiso, modelo Prisma ni regla de negocio. Si una mejora visual requiere logica nueva (busqueda global, contadores en navegacion, filtros nuevos), se anota como pendiente funcional en el progreso y NO se implementa.
2. **Solo Sigeco.** Ningun cambio en `src/components/public/`, `src/components/landing/`, `src/app/(public)/`, `src/app/(payload)/` ni en los valores publicos de `globals.css`. La unica excepcion aprobada es la adicion del token `warning` (aditiva, sin efecto visual publico).
3. **Layout de pantalla completa.** Toda pantalla rediseniada debe funcionar dentro del shell `h-dvh`: el documento nunca hace scroll vertical; solo el area de contenido. Tablas anchas hacen scroll horizontal en su propio contenedor.
4. **Componentes antes que Tailwind crudo.** Usar `src/components/internal/ui/`; si un patron se repite en 2+ pantallas, se promueve a componente.
5. **Validacion minima por tarea:** `pnpm lint`, `pnpm typecheck`, `pnpm test`. Al cerrar cada tarea tambien `pnpm run build`. Prueba visual con usuario interno local cuando la base de datos este disponible (guia: `docs/operations/sigeco-v3-full-flow-testing.md`).
6. **Registro:** al terminar una tarea se agrega su entrada en [Progreso de diseno](./progreso-de-diseno.md) con fecha, archivos tocados, validaciones y pendientes.
7. Un commit por tarea con el mensaje sugerido (ajustar solo si el alcance real cambio).

---

## Tarea 1 — Fundaciones Marea Y Shell De Escritorio

**Objetivo:** dejar instalada la base del sistema (tokens, tipografia, libreria UI) y reemplazar el shell movil por el shell de escritorio de pantalla completa.

**Alcance:**

- Crear `src/app/(internal)/sigeco/sigeco.css` con los tokens Marea scopeados a `.sigeco-app`.
- Modificar `src/app/(internal)/sigeco/layout.tsx`: clase `sigeco-app` en `<html>`, fuente IBM Plex Sans (`--font-plex`) via `next/font`, import de `sigeco.css`.
- Agregar `--color-warning` a `:root` de `globals.css` (valor ambar publico actual `217 119 6`) y color `warning` en `tailwind.config.ts`. Cambio aditivo.
- Crear `src/components/internal/ui/` con: `Button`, `Card`, `Table` (+ `Th`/`Td`), `KpiCard`, `PageHeader`.
- Reescribir `src/components/internal/InternalShell.tsx`: contenedor `h-dvh overflow-hidden`, sidebar fija de escritorio con los 9 modulos (icono + etiqueta + activo por ruta), header superior con fecha, usuario y logout, `<main>` como unica zona con `overflow-y-auto`. En `< lg` la sidebar se convierte en drawer con boton hamburguesa (componente cliente nuevo, ej. `SidebarNav.tsx` / `MobileSidebar.tsx`). Se elimina la tab bar inferior.
- Restilizar `src/components/internal/StatusPill.tsx` (punto + etiqueta, familias semanticas de la spec) y `src/components/internal/Field.tsx` (radio y foco Marea) sin cambiar sus APIs.

**Fuera de alcance:** busqueda global del header y contadores de pendientes en navegacion (requieren logica); rediseno de paginas (tareas 2-11); login (tarea 11).

**Criterios de aceptacion:**

- El documento no hace scroll vertical en ninguna pantalla interna; solo `<main>`.
- La navegacion activa se marca segun la ruta actual.
- El sitio publico renderiza identico (tokens publicos intactos).
- `pnpm lint`, `pnpm typecheck`, `pnpm test` y `pnpm run build` pasan.

**Commit sugerido:** `feat(sigeco): add marea design system foundations and desktop shell`

---

## Tarea 2 — Dashboard

**Objetivo:** rediseniar `/sigeco` (panel "Trabajo de hoy") con la estructura del mockup aprobado.

**Alcance:**

- `src/app/(internal)/sigeco/(app)/page.tsx`.
- Fila de KPIs con `KpiCard` usando las metricas ya disponibles en la pagina (leads nuevos, recordatorios vencidos, no responden, seguimientos hoy, stock bajo). Banderas `warn`/`crit` en vencidos y stock bajo.
- "Leads recientes" pasa de lista de cards a `Table` con columnas nombre, telefono, origen, estado (`LeadStatusPill`) y enlace al detalle.
- `PageHeader` con titulo y fecha.

**Fuera de alcance:** grafico "Leads por semana" y panel "Pendientes por area" del mockup (requieren queries nuevas; anotar como pendiente funcional). Nuevos KPIs.

**Criterios de aceptacion:** mismas cifras y enlaces que hoy; sin queries nuevas; validacion minima.

**Commit sugerido:** `feat(sigeco): redesign dashboard with marea layout`

---

## Tarea 3 — Modulo Leads

**Objetivo:** rediseniar el modulo que motivo este cambio: lista, detalle y alta de leads.

**Alcance:**

- `src/app/(internal)/sigeco/(app)/leads/page.tsx`: lista como `Table` (nombre, telefono, origen, interes, estado, proximo recordatorio segun datos existentes), busqueda y filtros existentes restilizados en una fila superior, paginacion existente restilizada.
- `src/app/(internal)/sigeco/(app)/leads/[id]/page.tsx`: detalle en dos columnas (ficha + historial cronologico), formularios de contacto/recordatorio con `Field` + `Button`.
- `src/app/(internal)/sigeco/(app)/leads/nuevo/page.tsx`: formulario en `Card` con `PageHeader`.

**Fuera de alcance:** ordenamiento por columnas, filtros nuevos o data-table con TanStack (logica/dependencia nueva; evaluar como mejora funcional posterior).

**Criterios de aceptacion:** mismos datos, filtros y acciones que hoy; formularios siguen posteando a las mismas actions; validacion minima.

**Commit sugerido:** `feat(sigeco): redesign leads module with marea system`

---

## Tarea 4 — Modulo Pacientes

**Alcance:** `pacientes/page.tsx` (lista como tabla + busqueda existente), `pacientes/[id]/page.tsx` (ficha con secciones en cards: datos, contactos, notas, historial), `pacientes/nuevo/page.tsx` (formulario en card).

**Criterios de aceptacion:** reglas transversales; sin campos nuevos ni edicion nueva (la edicion de ficha es pendiente funcional conocido de V3).

**Commit sugerido:** `feat(sigeco): redesign patients module with marea system`

---

## Tarea 5 — Modulo Visitas

**Alcance:** `visitas/page.tsx` (visitas activas como tabla con `VisitStatusPill`), `visitas/[id]/page.tsx` (detalle de visita, ruta activa del paciente y tareas por area restilizadas).

**Commit sugerido:** `feat(sigeco): redesign visits module with marea system`

---

## Tarea 6 — Modulo Consultas

**Alcance:** `consultas/page.tsx` (bandeja medica como tabla), `consultas/[visitId]/page.tsx` (consulta clinica: diagnosticos, plan, receta, evolucion, ordenes — formularios largos reorganizados en cards por seccion, manteniendo todos los campos y actions actuales).

**Commit sugerido:** `feat(sigeco): redesign consultations module with marea system`

---

## Tarea 7 — Modulo Enfermeria

**Alcance:** `enfermeria/page.tsx` (bandeja de tareas como tabla), `enfermeria/[workItemId]/page.tsx` (ejecucion de tarea: signos vitales, aplicaciones, notas, estudios).

**Commit sugerido:** `feat(sigeco): redesign nursing module with marea system`

---

## Tarea 8 — Modulo Administracion (Caja)

**Alcance:** `administracion/page.tsx` (bandeja + resumen de ventas del dia/mes/saldo con `KpiCard`), `administracion/[workItemId]/page.tsx`, `administracion/ventas/[saleId]/page.tsx` (venta, items, pagos, movimientos como tablas).

**Criterios de aceptacion:** reglas transversales; el estado visible de error de venta con stock insuficiente se mejora solo si es posible sin tocar la action (pendiente funcional si no).

**Commit sugerido:** `feat(sigeco): redesign administration module with marea system`

---

## Tarea 9 — Modulo Seguimientos

**Alcance:** `seguimientos/page.tsx` (bandeja diaria con filtros vencidos/hoy/proximos restilizados, acciones rapidas llamada/WhatsApp), `seguimientos/[taskId]/page.tsx` (registro de intentos e historial).

**Commit sugerido:** `feat(sigeco): redesign follow-ups module with marea system`

---

## Tarea 10 — Modulo Inventario

**Alcance:** `inventario/page.tsx` (productos y alertas de stock bajo como tabla con bandera `warn`), `inventario/[itemId]/page.tsx` (detalle, movimientos append-only como tabla, entradas y ajustes).

**Commit sugerido:** `feat(sigeco): redesign inventory module with marea system`

---

## Tarea 11 — Login Interno

**Alcance:** `src/app/(internal)/sigeco/login/page.tsx`: pantalla de login centrada, card unica con logo Sigeco, `Field` + `Button` Marea. Misma action de autenticacion.

**Commit sugerido:** `feat(sigeco): redesign internal login with marea system`

---

## Tarea 12 — Limpieza Y QA Visual Final

**Objetivo:** cerrar el rediseno con auditoria visual y limpieza de restos.

**Alcance:**

- Eliminar estilos y patrones del shell movil anterior que hayan quedado sin uso.
- Auditoria visual con `/gstack-design-review` sobre el sitio corriendo (requiere base de datos local y usuario de prueba: `pnpm internal:seed`).
- QA del flujo completo con `/qa` siguiendo `docs/operations/sigeco-v3-full-flow-testing.md`.
- Verificacion responsive: drawer movil en 390px en todas las pantallas.
- Verificar que el sitio publico y el CMS no cambiaron (comparacion visual de home y admin).
- Actualizar `docs/project/v3-implementation-status.md` si el rediseno cambia pendientes transversales.

**Commit sugerido:** `chore(sigeco): visual qa pass and legacy style cleanup`
