# Sistema Visual Del Admin Payload (Marea CMS)

Referencia de diseno para el panel de administracion de Payload CMS (`/admin`). Define como el admin adopta la identidad visual **Marea** de Salud Intercultural, decision aprobada el 13 de julio de 2026.

Este sistema aplica **solo a la superficie del admin de Payload** (`src/app/(payload)/admin`). Sigeco mantiene su sistema propio ([Sistema visual Sigeco](./sigeco-visual-system.md)) y el sitio publico el suyo ([Sistema visual publico](./public-visual-system.md)). Nada de lo aqui descrito toca `sigeco.css`, `globals.css` ni `tailwind.config.ts`.

## Direccion: A La Par, No Identico

El objetivo es que pasar de Sigeco o del sitio publico al admin del CMS no se sienta como cambiar de empresa: misma paleta, misma temperatura, misma marca. **No** es replicar la anatomia de Sigeco (cards, chips, tablas, sidebar propios). El admin de Payload tiene su propio sistema de componentes, se usa poco (contenido del sitio publico: paginas, servicios, testimonios, equipo, FAQs, leads del formulario) y pelear contra sus clases internas produce CSS fragil que se rompe en cada actualizacion.

Niveles de personalizacion (decision):

| Nivel | Que es | Decision |
| --- | --- | --- |
| 1. Variables CSS | Sobrescribir las variables publicas del tema de Payload | **Si** — base del rebrand |
| 2. Marca | Logo, icono, titulo de pestana, favicon, tema claro | **Si** |
| 3. Paridad total | Replicar componentes de Sigeco dentro del admin | **No** — explicitamente fuera de alcance |

Tema claro unico, igual que Sigeco: `admin.theme: "light"` en `payload.config.ts` (retira el toggle de tema del admin).

## Mecanica De Theming De Payload

El admin de Payload 3 esta construido sobre variables CSS publicas (verificadas en `@payloadcms/ui` 3.84.1):

- Superficie y texto: `--theme-bg`, `--theme-input-bg`, `--theme-text`, `--theme-border-color`.
- Escala de grises: `--theme-elevation-0` a `--theme-elevation-1000` (25 pasos).
- Familias semanticas: `--theme-success-*`, `--theme-error-*`, `--theme-warning-*` (escalas 50-950).
- Radios: `--style-radius-s`, `--style-radius-m`, `--style-radius-l`.
- Tipografia: `--font-body`, `--font-mono`, `--font-serif`.

Punto de enganche: una hoja `src/app/(payload)/admin/custom.css` importada en `src/app/(payload)/admin/layout.tsx` **despues** de `@payloadcms/next/css`, para que gane por orden de cascada. CSS plano, no SCSS: el proyecto no tiene `sass` instalado y las variables + overrides puntuales no lo necesitan (regla: sin dependencias nuevas).

Dato clave descubierto: el boton primario de Payload **no usa un color de marca** sino la escala de grises (`.btn--style-primary` toma `--theme-elevation-800` como fondo). Por eso el acento teal requiere unos pocos overrides de clase ademas de las variables (ver seccion Acciones).

## Paleta: Mapeo Marea -> Payload

Solo se sobrescriben las variables que definen identidad. Valores identicos a la paleta Marea de Sigeco:

| Variable Payload | Valor Marea | Hex | Uso en el admin |
| --- | --- | --- | --- |
| `--theme-bg` | fondo general | `#F4F7F8` | Fondo del panel. |
| `--theme-input-bg` | superficie | `#FFFFFF` | Inputs y controles. |
| `--theme-text` | texto principal | `#16262C` | Texto general. |
| `--theme-border-color` | borde hairline | `#DFE8EA` | Bordes de tablas, cards, inputs. |
| `--style-radius-s` | radio pequeno | `7px` | Pills, controles chicos. |
| `--style-radius-m` | radio base | `9px` | Botones, inputs, cards. |
| `--style-radius-l` | radio grande | `12px` | Paneles, modales. |

Lo que **no** se toca y por que:

- **`--theme-elevation-*`**: sostiene los contrastes de todo el admin (textos secundarios, fondos de hover, botones primarios en su estado por defecto, bordes de tablas). Redefinir 25 pasos sin romper contraste en pantallas que no controlamos es trabajo de nivel 3.
- **`--theme-success-*` / `--theme-error-*` / `--theme-warning-*`**: son semanticas (guardado, error de validacion, publicado/borrador, diffs de versiones), no decorativas. Los verdes/rojos/ambar por defecto de Payload cumplen su funcion y coinciden en espiritu con la regla Marea de "color semantico, no decorativo".

## Acciones Y Acento Teal

Lista **cerrada** de overrides de clases internas (cualquier adicion se justifica en el progreso). Por depender de clases internas de Payload, se revisan tras cada actualizacion de version del CMS:

| Selector | Override | Resultado |
| --- | --- | --- |
| `.btn--style-primary` | `--bg-color: #068CA8; --hover-bg: #06738A` | Botones primarios (Guardar, Crear) en teal, texto blanco. |
| Links del contenido del admin | color `#06738A`, hover con subrayado | Links en la familia primaria (se usa `primary-dark` por contraste sobre blanco). |
| Item activo de la navegacion | acento teal | El modulo actual se distingue con la marca, no con gris. |
| `:focus-visible` de controles | anillo teal translucido (`rgba(6, 140, 168, 0.25)`) | Mismo lenguaje de foco que el `.focus-ring` de Sigeco. |

Criterio de contraste: identico al aprobado en Marea (teal `#068CA8` con texto blanco en botones primarios; texto teal sobre blanco siempre en `#06738A`).

## Tipografia

- `--font-body`: **IBM Plex Sans** (400/500/600), la misma del texto de Sigeco, **self-hosted**: archivos woff2 en `public/fonts/ibm-plex-sans/` + `@font-face` con `font-display: swap` en `custom.css`. Sin requests a CDNs externos (licencia OFL, redistribucion permitida).
- **Sora no entra al admin**: es la voz de titulares de Sigeco y el sitio publico; el admin no distingue familia de titular y llevarla requeriria overrides extra sin beneficio.
- `--font-mono` y `--font-serif` quedan por defecto.

## Marca

Configuracion en `payload.config.ts` + componentes nuevos en `src/payload/admin/`:

- `admin.components.graphics.Logo` (`BrandLogo.tsx`): wordmark de la pantalla de login. No existe asset de logo en `public/` (solo uploads), asi que es un wordmark tipografico/SVG: "Salud Intercultural" en teal con subtitulo "Panel de contenido", mismo espiritu que la marca del sidebar de Sigeco.
- `admin.components.graphics.Icon` (`BrandIcon.tsx`): version compacta (isotipo "SI" o gota teal) para la barra de navegacion.
- `admin.meta`: `titleSuffix` "- Salud Intercultural" y favicon teal propio del admin.

Tras registrar componentes nuevos se regenera el import map (`payload generate:importmap`, nunca con `next dev` activo).

## Componentes Propios Existentes

`AdminDashboard.tsx`, `AdminQuickLinks.tsx`, `LeadListIntro.tsx` y `LeadDetailActions.tsx` ya se estilizan con `var(--theme-*)`, sin colores hardcodeados: **heredan el rebrand automaticamente**. No se modifican; solo se verifican en QA. Si en QA algun valor heredado queda ilegible, el ajuste se hace en el componente (variable mas adecuada), no agregando overrides globales.

## Fuera De Alcance

- Replicar componentes o layout de Sigeco dentro del admin (nivel 3).
- Tocar `sigeco.css`, `globals.css`, `tailwind.config.ts` o componentes de `src/components/`.
- Overrides masivos de clases internas de Payload (solo la lista cerrada de Acciones).
- Dark mode del admin (tema claro unico).
- Cambios de logica, colecciones, campos o permisos del CMS.

## Convivencia Con Los Otros Dos Sistemas

1. `custom.css` **solo** lo importa `src/app/(payload)/admin/layout.tsx`; ni Sigeco ni el sitio publico lo cargan.
2. El route group `(payload)` tiene su propio arbol de layout: cero fuga de estilos hacia `(public)` o `(internal)`.
3. Los tres sistemas comparten paleta por **valor** (mismos hex), no por token: no se importan variables entre si. Si Marea cambia un color, se actualiza a mano en los tres lugares (decision consciente para mantener el aislamiento).

## Documentos Relacionados

- [Tareas de branding](../project/payload-branding/tareas-de-branding.md)
- [Progreso de branding](../project/payload-branding/progreso-de-branding.md)
- [Sistema visual Sigeco](./sigeco-visual-system.md)
- [Sistema visual publico](./public-visual-system.md)
