# Tareas De Branding Del Admin Payload

Plan tecnico para poner el admin de Payload CMS (`/admin`) a la par visual del sistema Marea, segun la spec [Sistema visual del admin Payload](../../design/payload-admin-visual-system.md). El avance se registra en [Progreso de branding](./progreso-de-branding.md).

Es un trabajo **solo de presentacion**: no se tocan colecciones, campos, permisos ni logica del CMS. Alcance aprobado: nivel 1 (variables CSS) + nivel 2 (marca); el nivel 3 (paridad total con Sigeco) queda explicitamente descartado.

## Reglas Transversales (aplican a todas las tareas)

1. **Solo la superficie del admin.** Los unicos archivos tocables son: `src/app/(payload)/admin/*`, `payload.config.ts` (bloque `admin`), `src/payload/admin/*` (solo componentes de marca nuevos) y `public/fonts/*`. Prohibido tocar `sigeco.css`, `globals.css`, `tailwind.config.ts` y todo `src/components/`.
2. **Overrides minimos.** Preferir variables `--theme-*` / `--style-*`. Los overrides de clases internas permitidos son solo los de la lista cerrada de la spec (boton primario, links, nav activa, focus). Cualquier override adicional se justifica por escrito en el progreso.
3. **Sin dependencias nuevas.** CSS plano (no `sass`), fuentes self-hosted (no CDN), sin paquetes de iconos ni utilidades extra.
4. **Validacion minima por tarea:** `pnpm lint`, `pnpm test` y typecheck (`npx tsc --noEmit` si hay `next dev` activo; `pnpm typecheck` solo con el server apagado). Prueba visual en `/admin` con el dev server. Al cerrar la ultima tarea, ademas `pnpm build` (nunca con `next dev` activo).
5. **QA visual por tarea:** revisar como minimo login, dashboard y un listado. Nunca guardar ni borrar contenido real del CMS durante el QA; si hace falta editar, usar un registro de prueba y revertirlo.
6. **Registro:** al terminar cada tarea, entrada en [Progreso de branding](./progreso-de-branding.md) con fecha, archivos tocados, validaciones y pendientes.
7. Un commit por tarea con el mensaje sugerido (los commits los hace el usuario).

---

## Tarea 1 — Infraestructura De Estilos Y Tema Claro

**Objetivo:** dejar montado el punto de enganche de estilos del admin y fijar el tema claro, sin cambiar todavia ningun color.

**Alcance:**

- Crear `src/app/(payload)/admin/custom.css` con un comentario de cabecera que explique su proposito y remita a la spec (contenido visual llega en las Tareas 2-4).
- Importarlo en `src/app/(payload)/admin/layout.tsx` inmediatamente despues de `import "@payloadcms/next/css"`.
- Agregar `theme: "light"` al bloque `admin` de `payload.config.ts`.

**Fuera de alcance:** cualquier variable de color o override (Tareas 2 y 3).

**Criterios de aceptacion:**

- `/admin` carga identico a antes salvo que queda fijo en tema claro.
- El toggle de tema desaparece de las preferencias del usuario del admin.
- Con el sistema operativo en modo oscuro, el login y el panel siguen en claro.
- Sigeco y el sitio publico no cambian en nada (spot check).

**Commit sugerido:** `feat(cms): scaffold admin stylesheet and force light theme`

---

## Tarea 2 — Paleta Y Radios Marea

**Objetivo:** llevar superficie, texto, bordes y radios del admin a los valores Marea via variables del tema.

**Alcance (solo `custom.css`):**

- `--theme-bg: #F4F7F8`, `--theme-input-bg: #FFFFFF`, `--theme-text: #16262C`, `--theme-border-color: #DFE8EA`.
- `--style-radius-s: 9px`, `--style-radius-m: 9px`, `--style-radius-l: 12px` (en Payload `radius-s` es el radio estandar de inputs y botones; ver nota en la spec).

**Fuera de alcance:** la escala `--theme-elevation-*` y las familias semanticas `success`/`error`/`warning` (quedan por defecto, razon en la spec); botones y acentos (Tarea 3).

**Criterios de aceptacion:**

- Fondo general `#F4F7F8` con paneles e inputs blancos, texto `#16262C`, bordes `#DFE8EA`, esquinas de 9px en botones e inputs.
- Sin regresiones de legibilidad en: login, dashboard, listado de una coleccion, formulario de edicion con sidebar de publicacion, y un modal (ej. confirmar borrado — cancelar sin borrar).
- Los componentes propios (`AdminDashboard`, `AdminQuickLinks`) heredan los valores nuevos sin editarlos.

**Commit sugerido:** `feat(cms): apply marea palette and radii to payload admin`

---

## Tarea 3 — Acento Teal En Acciones, Navegacion Y Foco

**Objetivo:** que las acciones principales y el foco hablen el teal de la marca en lugar del gris por defecto de Payload.

**Alcance (solo `custom.css`, lista cerrada de la spec):**

- `.btn--style-primary`: `--bg-color: #068CA8`, `--hover-bg: #06738A` (texto blanco heredado).
- Links del contenido del admin en `#06738A` con subrayado al hover.
- Item activo de la navegacion lateral con acento teal.
- `:focus-visible` de controles con anillo `rgba(6, 140, 168, 0.25)`.

**Fuera de alcance:** botones secundarios y de peligro (semantica por defecto de Payload), checkboxes/radios (usan la familia success, que no se toca).

**Criterios de aceptacion:**

- Guardar/Crear se ven teal con hover mas oscuro y texto blanco legible; los botones secundarios y destructivos no cambian.
- Navegar con Tab por el login y un formulario muestra el anillo teal en cada control.
- El item de coleccion activo en la nav se distingue con teal.
- Documentada en el progreso la lista exacta de selectores usados (para re-verificarla al actualizar Payload).

**Commit sugerido:** `feat(cms): brand admin actions and focus states in marea teal`

---

## Tarea 4 — Tipografia IBM Plex Sans Self-Hosted

**Objetivo:** que el admin use la misma tipografia de texto que Sigeco, sin requests externos.

**Alcance:**

- Descargar IBM Plex Sans woff2 en pesos 400, 500 y 600 (latin) a `public/fonts/ibm-plex-sans/`.
- `@font-face` en `custom.css` con `font-display: swap` y `--font-body` apuntando a la familia con fallback de sistema.

**Fuera de alcance:** Sora (queda exclusiva de Sigeco/publico), `--font-mono` y `--font-serif`, y cualquier cambio de fuentes fuera del admin.

**Criterios de aceptacion:**

- El texto del admin renderiza en IBM Plex Sans (verificable en el inspector).
- La pestana Network no muestra requests de fuentes a dominios externos en `/admin`.
- Los woff2 pesan lo razonable para 3 pesos latin (~150 KB totales o menos).
- Licencia OFL anotada en el progreso.

**Commit sugerido:** `feat(cms): self-host ibm plex sans for payload admin`

---

## Tarea 5 — Marca: Logo, Icono Y Meta

**Objetivo:** que el login y la navegacion muestren la marca de la clinica y la pestana del navegador identifique al panel.

**Alcance:**

- `src/payload/admin/BrandLogo.tsx`: wordmark tipografico/SVG "Salud Intercultural" en teal con subtitulo "Panel de contenido" (no hay asset de logo en `public/`; si el usuario provee uno, se usa ese).
- `src/payload/admin/BrandIcon.tsx`: isotipo compacto para la nav.
- Registrar ambos en `admin.components.graphics` (`Logo`, `Icon`) en `payload.config.ts`.
- `admin.meta`: `titleSuffix` "- Salud Intercultural" y favicon teal del admin.
- Regenerar el import map (`payload generate:importmap`) **con el dev server apagado**.

**Fuera de alcance:** rediseno del dashboard propio (ya existe y hereda el tema).

**Criterios de aceptacion:**

- El login muestra el wordmark en lugar del logo de Payload.
- La nav muestra el isotipo; la pestana dice "... - Salud Intercultural" con favicon propio.
- `importMap.js` regenerado y sin errores al levantar el admin.

**Commit sugerido:** `feat(cms): add clinic logo and meta branding to admin`

---

## Tarea 6 — QA Integral Y Cierre Documental

**Objetivo:** verificar el rebrand completo en las pantallas reales del CMS y cerrar la documentacion.

**Alcance:**

- Recorrido en navegador: login, dashboard (componentes propios heredando tema), listado y edicion de `LeadSubmissions` y `Testimonials` (incluye richtext y upload de `Media`), un global (`SiteSettings`), la papelera/versiones si estan visibles, y vista movil (viewport angosto).
- Spot check de aislamiento: home publica, `/testimonios` y dos pantallas de Sigeco sin ningun cambio visual.
- `pnpm lint`, typecheck, `pnpm test` y `pnpm build` (con `next dev` apagado).
- Entrada final en el progreso + tabla de estado general completa + nota de mantenimiento: re-verificar la lista de overrides tras cada actualizacion de Payload.

**Fuera de alcance:** cualquier ajuste que implique nuevos overrides fuera de la lista cerrada (se anota como pendiente y se decide con el usuario).

**Criterios de aceptacion:**

- Todas las pantallas del recorrido en paleta Marea sin textos ilegibles ni controles rotos.
- Cero cambios visuales fuera de `/admin`.
- Validaciones en verde y build exitoso.
- Progreso al dia con los 6 commits sugeridos listados.

**Commit sugerido:** `docs(cms): close payload admin branding with qa notes`
