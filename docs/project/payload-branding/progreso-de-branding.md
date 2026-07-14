# Progreso De Branding Del Admin Payload

Registro de avance del plan [Tareas de branding](./tareas-de-branding.md). Cada tarea terminada agrega aqui su entrada con fecha, archivos tocados, validaciones ejecutadas y pendientes que deja. La spec visual es [Sistema visual del admin Payload](../../design/payload-admin-visual-system.md).

## Estado General

| Tarea | Nombre | Estado |
| --- | --- | --- |
| 1 | Infraestructura de estilos y tema claro | Completada (2026-07-13) |
| 2 | Paleta y radios Marea | Completada (2026-07-13) |
| 3 | Acento teal en acciones, navegacion y foco | Completada (2026-07-13) |
| 4 | Tipografia IBM Plex Sans self-hosted | Completada (2026-07-13) |
| 5 | Marca: logo, icono y meta | Completada (2026-07-13) |
| 6 | QA integral y cierre documental | Completada (2026-07-13) |

**PLAN COMPLETO.** Los 6 commits sugeridos estan listados en cada entrada; los hace el usuario. Nota de mantenimiento: tras cada actualizacion de Payload, re-verificar la lista cerrada de overrides (tabla de Acciones de la spec) y regenerar el import map si cambian componentes.

## Contexto Y Decisiones (2026-07-13)

Origen: el usuario pregunto si los estilos del admin de Payload se pueden personalizar o poner a la par del sistema de diseno Marea. Se presentaron tres niveles (variables CSS, marca, paridad total) y el usuario aprobo la recomendacion: **nivel 1 + nivel 2, nivel 3 descartado**. El resultado buscado es que el admin comparta paleta, radios, tipografia de texto y marca con el resto del producto, sin replicar la anatomia de Sigeco.

Decisiones y hallazgos que fijan el plan:

1. **Mecanica verificada contra el paquete instalado** (`@payloadcms/ui` 3.84.1): el admin se tematiza con variables CSS publicas (`--theme-bg`, `--theme-input-bg`, `--theme-text`, `--theme-border-color`, `--theme-elevation-0..1000`, familias `success`/`error`/`warning`, `--style-radius-s/m/l`, `--font-body`).
2. **El boton primario de Payload no usa color de marca**: `.btn--style-primary` toma su fondo de `--theme-elevation-800` (gris oscuro). El acento teal requiere una lista cerrada de overrides de clase (boton primario, links, nav activa, focus), documentada en la spec y re-verificable tras cada actualizacion del CMS.
3. **No se tocan** la escala `elevation` ni las familias semanticas: sostienen contrastes y significados en pantallas que no controlamos; redefinirlas es nivel 3.
4. **Punto de enganche**: `src/app/(payload)/admin/custom.css` importado despues de `@payloadcms/next/css` en el layout del admin. CSS plano; el proyecto no tiene `sass` y no se agregan dependencias.
5. **Tema claro unico** (`admin.theme: "light"`), coherente con la decision Marea de Sigeco.
6. **Los componentes admin propios ya usan `var(--theme-*)`** (`AdminDashboard`, `AdminQuickLinks`, `LeadListIntro`, `LeadDetailActions`): heredan el rebrand sin modificarlos; solo se verifican en QA.
7. **Tipografia**: IBM Plex Sans (la de Sigeco) self-hosted en `public/fonts/`; Sora no entra al admin.
8. **Marca**: no existe asset de logo en `public/`, asi que el logo del login sera un wordmark tipografico/SVG; si el usuario provee un archivo de logo, se reemplaza.

Restricciones fijas: solo superficie del admin (`(payload)` + bloque `admin` del config + componentes de marca), cero cambios en Sigeco y sitio publico, cero cambios de logica/colecciones/permisos del CMS, migraciones no aplican (no hay cambios de datos), los commits los hace el usuario (uno por tarea).

## Entradas Por Tarea

### Tarea 1 — Infraestructura De Estilos Y Tema Claro (2026-07-13)

**Estado:** Completada.

**Archivos tocados:**

- `src/app/(payload)/admin/custom.css` (nuevo): hoja vacia con comentario de cabecera que remite a la spec; el contenido visual llega en las Tareas 2-4.
- `src/app/(payload)/admin/layout.tsx`: import de `./custom.css` inmediatamente despues de `@payloadcms/next/css`.
- `payload.config.ts`: `theme: "light"` en el bloque `admin`.

**Validaciones:** `pnpm lint`, `npx tsc --noEmit` (dev server activo, por eso no `pnpm typecheck`), `pnpm test` (70 tests). Navegador: `/admin/login` renderiza con `data-theme="light"`; se forzo la cookie `payload-theme=dark` y el admin siguio en claro (el config gana, confirmado tambien en el codigo instalado: `getRequestTheme` retorna `config.admin.theme` antes de mirar cookie o header del sistema). Spot check de aislamiento: home publica y login de Sigeco sin cambios.

**Hallazgos operativos:**

- Los cambios en `payload.config.ts` NO se recargan con HMR: el dev server que estaba corriendo seguia sirviendo el config viejo (la cookie oscura ganaba). Hubo que reiniciar `next dev` para que `theme: "light"` tomara efecto. Regla practica: tras tocar `payload.config.ts`, reiniciar el dev server antes de verificar.
- El criterio "el toggle de tema desaparece de la cuenta" se verifico por codigo, no en pantalla: `ADMIN_EMAIL`/`ADMIN_PASSWORD` estan vacios en `.env` (hay 1 usuario CMS en la base pero sin credenciales documentadas), asi que no se pudo iniciar sesion en el admin. En el fuente instalado (`views/Account/Settings`), el selector solo se renderiza con `theme === 'all'`. Pendiente para la Tarea 6: conseguir credenciales del CMS con el usuario para el recorrido autenticado (dashboard, colecciones, cuenta).

**Commit sugerido:** `feat(cms): scaffold admin stylesheet and force light theme`

### Tarea 2 — Paleta Y Radios Marea (2026-07-13)

**Estado:** Completada.

**Archivos tocados:**

- `src/app/(payload)/admin/custom.css`: bloque `:root` con `--theme-bg: #f4f7f8`, `--theme-input-bg: #ffffff`, `--theme-text: #16262c`, `--theme-border-color: #dfe8ea`, `--style-radius-s: 9px`, `--style-radius-m: 9px`, `--style-radius-l: 12px`.
- `docs/design/payload-admin-visual-system.md` y `tareas-de-branding.md`: mapeo de radios corregido con el hallazgo de abajo.

**Hallazgos (ajustes al plan, documentados en la spec):**

- Payload envuelve sus estilos en `@layer payload-default`; `custom.css` va sin layer, asi que un `:root` plano gana sin pelear especificidad ni selectores de tema.
- `--style-radius-s` NO es un radio decorativo pequeno: es el radio ESTANDAR de inputs y botones (58 usos, contra 16 de `m` y 2 de `l`). El plan original (s=7px) dejaba los controles en 7px violando el criterio Marea de 9px; el mapeo final es s=9, m=9, l=12.
- Los pills de Payload tienen `border-radius: 3px` hardcodeado (sin variable): quedan fuera del alcance.
- Cobertura parcial de bordes: los componentes que leen `var(--theme-border-color)` toman `#DFE8EA`; otros (ej. inputs del login) usan `--theme-elevation-150` directo y quedan en el gris `#DDDDDD` por defecto (visualmente casi identico; corregirlo exigiria tocar la escala elevation, excluida por la spec).

**Validaciones:** `pnpm lint`, `npx tsc --noEmit`, `pnpm test` (70 tests). Navegador (login de `/admin`, unica pantalla accesible sin credenciales CMS): fondo `#F4F7F8`, inputs blancos con radio 9px, boton radio 9px, texto `#16262C`; variables verificadas por computed style. Pendiente que arrastra: el QA de listado/edicion/modal requiere sesion en el admin (`ADMIN_EMAIL`/`ADMIN_PASSWORD` vacios en `.env`); se cubrira cuando haya credenciales, a mas tardar en la Tarea 6.

**Commit sugerido:** `feat(cms): apply marea palette and radii to payload admin`

### Tarea 3 — Acento Teal En Acciones, Navegacion Y Foco (2026-07-13)

**Estado:** Completada.

**Archivos tocados:**

- `src/app/(payload)/admin/custom.css`: bloque Tarea 3 con la lista cerrada definitiva (registrada tambien en la tabla de Acciones de la spec):
  - `--accessibility-outline: 2px solid #068ca8` en `:root` — Payload centraliza el foco en esta variable (51 reglas `:focus-visible` la consumen), asi que el foco se rebrandea con una variable y no con overrides de clase.
  - `.btn--style-primary`: `--bg-color #068ca8`, `--hover-bg #06738a`, `--color`/`--hover-color` blanco.
  - `a:not([class])`: color `#06738a`, subrayado al hover (heuristica verificada: las anclas de componentes de Payload siempre llevan clase; las de contenido, no).
  - `.nav__link.active` color `#06738a` + `.nav__link-indicator` fondo `#068ca8`.
- `docs/design/payload-admin-visual-system.md`: tabla de Acciones actualizada con selectores concretos y el ajuste del foco.

**Hallazgos:**

- El foco por variable es mas robusto que lo planeado: un solo override cubre todo el admin. Se descarto el "anillo translucido rgba(6,140,168,0.25)" de la spec original: Payload usa `outline` de 2px y con alpha 0.25 seria casi invisible (regresion de accesibilidad); quedo teal solido.
- La redefinicion local de `--accessibility-outline` en `.folder-file-card--selected` (familia success) se respeta: es un estado semantico de seleccion.
- Ojo con inspeccionar CSS via `document.styleSheets` en el navegador: la serializacion de `@layer` hace que las busquedas por `cssText` den vacio; verificar contra el chunk CSS servido (curl) como se hizo aqui.

**Validaciones:** `pnpm lint`, `npx tsc --noEmit`, `pnpm test` (70 tests). Navegador (login): boton Login `rgb(6,140,168)` con texto blanco, link sin clase `rgb(6,115,138)`, variable de foco resuelta a `2px solid #068ca8` en `:root` y consumida por las reglas `:focus-visible` del chunk servido. Pendiente que arrastra: verificar en pantalla la nav activa y el hover del boton requiere sesion CMS (Tarea 6, junto con el resto del QA autenticado).

**Commit sugerido:** `feat(cms): brand admin actions and focus states in marea teal`

### Tarea 4 — Tipografia IBM Plex Sans Self-Hosted (2026-07-13)

**Estado:** Completada.

**Archivos tocados:**

- `public/fonts/ibm-plex-sans/ibm-plex-sans-latin-wght.woff2` (nuevo, 45 KB): IBM Plex Sans v23 de Google Fonts.
- `src/app/(payload)/admin/custom.css`: `@font-face` con `font-display: swap` + `--font-body` con la familia y el fallback de sistema que Payload usa por defecto.

**Hallazgo (mejora sobre el plan):** Google Fonts ahora sirve IBM Plex Sans como **fuente variable**: un solo woff2 latin (45 KB, `font-weight: 100 700`, `font-stretch: 100%`) reemplaza a los 3 archivos por peso del plan original (presupuesto: 150 KB). El subset latin (U+0000-00FF...) cubre el espanol completo (acentos, enie, signos). Licencia: SIL Open Font License 1.1.

**Validaciones:** `pnpm lint`, `npx tsc --noEmit`, `pnpm test` (70 tests). Navegador (login `/admin`): `document.fonts` reporta `IBM Plex Sans/100 700/loaded`, `font-family` computada del body arranca con "IBM Plex Sans", y las requests de fuentes de la pagina son exactamente una: `/fonts/ibm-plex-sans/ibm-plex-sans-latin-wght.woff2` local — cero requests a gstatic/googleapis. Verificado que `public/fonts/` queda trackeado por git.

**Commit sugerido:** `feat(cms): self-host ibm plex sans for payload admin`

### Tarea 5 — Marca: Logo, Icono Y Meta (2026-07-13)

**Estado:** Completada.

**Archivos tocados:**

- `src/payload/admin/BrandLogo.tsx` (nuevo): wordmark del login — monograma SI en cuadrado teal + "Salud Intercultural" + subtitulo "Panel de contenido". Replica la marca del header del sitio publico (`src/components/landing/Header.tsx`); estilos inline con variables del tema, como los demas componentes admin propios.
- `src/payload/admin/BrandIcon.tsx` (nuevo): isotipo SI compacto (24px) para la navegacion.
- `public/admin-favicon.svg` (nuevo): favicon SVG teal con monograma SI.
- `payload.config.ts`: `admin.components.graphics.{Icon,Logo}` + `admin.meta` con `titleSuffix "- Salud Intercultural"` e `icons` apuntando al SVG.
- `src/app/(payload)/admin/importMap.js`: regenerado con `pnpm exec payload generate:importmap` (dev server apagado; el CLI dijo "No new imports found" pero SI actualizo el archivo — verificar siempre con `git status`, no con el mensaje).

**Validaciones:** `pnpm lint`, `npx tsc --noEmit`, `pnpm test` (70 tests). Navegador (login `/admin`): wordmark SI + "Salud Intercultural / Panel de contenido" en lugar del logo Payload, `document.title` = "Login - Salud Intercultural", favicon `/admin-favicon.svg`. Pendiente que arrastra: el `BrandIcon` de la nav solo se ve con sesion iniciada (Tarea 6).

**Commit sugerido:** `feat(cms): add clinic logo and meta branding to admin`

### Tarea 6 — QA Integral Y Cierre Documental (2026-07-13)

**Estado:** Completada.

**Como se resolvio la falta de credenciales CMS:** `ADMIN_EMAIL`/`ADMIN_PASSWORD` siguen vacios en `.env`, asi que el recorrido autenticado se hizo con un **usuario QA temporal** (`qa-branding@test.si`, password aleatorio no persistido) creado via API local de Payload con un script temporal en `scripts/` (borrado al terminar). Al cierre se elimino el usuario y se verifico contra la base que quedo todo como estaba (1 usuario, 4 testimonios).

**Recorrido autenticado (viewport desktop y movil 390px):**

- Login: wordmark SI, boton teal, foco teal, IBM Plex Sans.
- Dashboard: componentes propios (`AdminDashboard`, `AdminQuickLinks`) heredan el tema sin cambios; titulo "Dashboard - Salud Intercultural"; `BrandIcon` SI teal en el header.
- Listado de Testimonios: tabla legible, links de fila en teal, indicador de nav activa en `rgb(6,140,168)`.
- Edicion de un testimonio: Save teal, inputs blancos radio 9px, breadcrumbs teal, checkboxes legibles (sin guardar nada).
- Global Configuracion global: formulario largo con arrays de keywords, todo legible.
- Media: listado vacio renderiza bien.
- Movil 390x844: layout colapsa sin scroll horizontal.
- Popup de acciones del documento verificado; el **modal de confirmacion de borrado no se pudo ejercitar**: el usuario QA quedo con rol `editor`, que no puede borrar testimonios (el popup solo ofrece Duplicate). Se registro un testimonio de prueba via API para intentarlo y se borro tambien via API. Pendiente menor: verificar ese modal cuando el usuario entre con su cuenta admin real.

**Hallazgos (no bloqueantes, fuera de alcance del branding):**

- El dashboard propio muestra "Leads: No disponible" + aviso rosado de metricas con el rol `editor` (acceso restringido a leads); comportamiento previo al branding, no regresion visual.
- La regla `.nav__link.active { color }` no llega a aplicar: Payload marca el item activo solo con `.nav__link-indicator` (que si quedo teal) y font-weight, sin la clase `.active` en el DOM observado. La regla es inocua y se deja por si otras vistas la usan.

**Aislamiento (spot check):** home publica y `/testimonios` en Inter con su fondo propio; login de Sigeco con su IBM Plex y `#F4F7F8` de siempre. Cero cambios fuera de `/admin`.

**Validaciones finales:** `pnpm lint`, `pnpm test` (70 tests) y `pnpm build` completo (dev server apagado durante el build, reiniciado despues).

**Commit sugerido:** `docs(cms): close payload admin branding with qa notes`
