# Sistema Visual Sigeco (Marea)

Referencia de diseno para el panel interno Sigeco. Este documento define el sistema visual **Marea**, elegido el 8 de julio de 2026 sobre una propuesta de tres variantes calm healthcare ([artefacto de la propuesta](https://claude.ai/code/artifact/d4cf1e87-2237-42f6-9f2b-9e05555a529f)).

Este sistema aplica **solo a `/sigeco`**. La interfaz publica y el CMS Payload mantienen su propio sistema ([Sistema visual publico](./public-visual-system.md)); la seccion final de este documento define como conviven sin pisarse.

## Direccion

Marea es una evolucion del teal de marca de Salud Intercultural hacia un tono mas sobrio, pensada para una herramienta operativa de escritorio: calmada como entorno clinico, precisa como herramienta de trabajo diario. Tema claro unico (entorno de uso diurno). Densidad media.

## Paleta

Los valores fueron validados con verificador de contraste (>= 3:1 sobre superficie) y de vision de color (deuteranopia, protanopia, tritanopia).

| Token CSS (existente) | Valor Marea (RGB) | Hex | Uso |
| --- | --- | --- | --- |
| `--color-primary` | `6 140 168` | `#068CA8` | Acciones principales, links, estado activo de navegacion. |
| `--color-primary-dark` | `6 115 138` | `#06738A` | Hover de acciones, texto sobre tint primario. |
| `--color-secondary` | `46 138 95` | `#2E8A5F` | Igual a exito; Marea no usa un secundario aparte. |
| `--color-accent` | `178 110 18` | `#B26E12` | Igual a alerta; sin acento decorativo separado. |
| `--color-background` | `244 247 248` | `#F4F7F8` | Fondo general del panel. |
| `--color-surface` | `255 255 255` | `#FFFFFF` | Cards, tablas, header, formularios. |
| `--color-surface-soft` | `226 242 246` | `#E2F2F6` | Tint primario: fondos activos, hover de fila, pills "nuevo". |
| `--color-text` | `22 38 44` | `#16262C` | Texto principal. |
| `--color-muted` | `92 112 118` | `#5C7076` | Texto secundario y etiquetas. |
| `--color-border` | `223 232 234` | `#DFE8EA` | Bordes hairline. |
| `--color-success` | `46 138 95` | `#2E8A5F` | Estados positivos (interesado, completado, pagado). |
| `--color-warning` | `178 110 18` | `#B26E12` | Atencion sin ser error (vencido hoy, no responde, stock bajo). |
| `--color-error` | `192 61 54` | `#C03D36` | Errores, descartes, vencidos criticos. |

Reglas de color:

- Un solo color de accion (primario). El exito, alerta y error son semanticos, no decorativos.
- Los estados nunca comunican solo con color: siempre punto + etiqueta de texto (o icono + texto).
- Tints (fondo suave + texto oscuro de la misma familia) para pills y resaltados; color solido reservado para acciones y estados finales (ej. "convertido").

## Tipografia

- Titulares y cifras grandes: **Sora** (600/700), ya usada por el proyecto.
- Texto y UI: **IBM Plex Sans** (400/500/600), cargada via `next/font` solo en el layout de Sigeco con variable `--font-plex`.
- Cifras en tablas y KPIs: `tabular-nums`.
- Encabezados de tabla: 10.5px, mayusculas, `tracking` amplio (0.08em), color muted.
- No escalar fuentes con viewport width.

## Radios, Densidad Y Sombras

- Radio base: `9px` (cards, botones, inputs). Radio pequeno: `7px` (pills internos, celdas destacadas). En Tailwind: `rounded-[9px]` / `rounded-[7px]`.
- Filas de tabla: altura media `~46px` (padding `10px 14px`).
- Padding de cards: `18px`.
- Sombras minimas: el sistema se sostiene con bordes hairline, no con elevacion. Nada de `shadow-soft`/`shadow-lift` publicos dentro de Sigeco.
- Sin gradientes ni texturas (`premium-*`, `glass`, `hero-*` son exclusivos del sitio publico).

## Layout De Pantalla Completa

Regla central del rediseno: **el shell ocupa toda la pantalla y solo el area de contenido hace scroll**.

- Contenedor raiz: `h-dvh` + `overflow-hidden` (nunca scroll vertical del documento).
- Sidebar: columna fija de `~220px` a la izquierda, altura completa, sin scroll propio salvo que la navegacion exceda el alto.
- Header: barra superior fija dentro de la columna de contenido (`shrink-0`).
- Contenido: unica zona con `overflow-y-auto`; ahi vive cada pagina.
- Tablas anchas: scroll horizontal dentro de su propio contenedor, nunca de la pagina.

### Navegacion

- Sidebar desktop con los 7 modulos vigentes, icono Lucide + etiqueta y estado activo con tint primario + texto `primary-dark`. Inicio queda como acceso principal; los demas se agrupan visualmente en Atencion (Recepcion, Consulta, Enfermeria), Operacion (Caja, Seguimiento) y Control (Inventario), sin cambiar rutas, orden relativo ni permisos.
- Los detalles y formularios muestran breadcrumb desde `lg`; movil y tableta conservan el drawer y los enlaces de retorno existentes sin breadcrumb visible.
- Usuario y rol al pie de la sidebar, con logout.
- En movil (`< lg`): la sidebar se oculta y se abre como drawer desde un boton hamburguesa en el header. Reemplaza a la tab bar inferior anterior.
- Los contadores de pendientes junto a los items de navegacion (visibles en el mockup de la propuesta) requieren queries nuevas: quedan fuera del rediseno visual y se listan como pendiente funcional.
- La busqueda global del header (visible en el mockup) tambien requiere logica nueva: fuera del alcance del rediseno.

## Componentes Base

Viven en `src/components/internal/ui/`. Regla: usar estos componentes antes de escribir Tailwind crudo en paginas.

- `Button`: variantes `primary`, `outline`, `ghost`, `danger`, `link` (sin borde ni fondo, texto primario con subrayado al hover, sin padding; soporta iconos); tamanos `sm`, `md`.
- `Card` / `CardHeader`: superficie blanca, borde hairline, radio 9px, padding 18px.
- `Table` (+ `Th`, `Td`): encabezado en versalitas sobre fondo `background`, filas con borde inferior, hover con tint suave, contenedor con scroll horizontal propio.
- `KpiCard`: etiqueta muted, cifra Sora `tabular-nums`, nota secundaria y bandera opcional `warn`/`crit` (icono + texto).
- `PageHeader`: titulo Sora + subtitulo muted + slot de acciones a la derecha.
- `StatusPill` (existente, restilizado): punto + etiqueta, tint semantico por familia de estado.
- `Field` (existente): mantiene API; input adopta radio y foco Marea.

### Semantica de pills de estado

| Familia | Estados actuales | Tratamiento |
| --- | --- | --- |
| Primario (tint) | lead `new`, visita `in_reception` | Nuevo en el sistema, sin juicio. |
| Neutro | lead `contacted`, visita `in_administration` | En proceso, sin urgencia. |
| Exito (tint) | lead `interested`, `confirmed_attendance`; visita `completed` | Avance positivo. |
| Exito (solido) | lead `converted_to_patient` | Estado final positivo. |
| Alerta (tint) | lead `wants_visit`, `reminder_pending`, `no_answer`; visita `in_nursing` | Requiere accion o espera. |
| Error (tint) | lead `discarded`; visita `left_without_care`, `cancelled` | Estado final negativo. |
| Secundario clinico | visita `in_consultation` | Familia exito (en atencion). |

## Accesibilidad

- Mantener `.focus-ring` global en todo control interactivo.
- Contraste de paleta validado; texto muted nunca por debajo de 4.5:1 sobre superficie.
- Targets de click >= 40px de alto en controles primarios.
- Respetar `prefers-reduced-motion` (regla global existente).
- Animacion minima: transiciones de color/fondo de ~150ms; sin reveals de Framer Motion en el panel interno.

## Convivencia Con El Sistema Publico

Los dos sistemas estan **separados por completo**. Mecanica del aislamiento:

1. Sigeco tiene su propio root layout (`src/app/(internal)/sigeco/layout.tsx`) con su propio `<html>`; ahi se aplica la clase `sigeco-app` y se importa `sigeco.css`.
2. `sigeco.css` redefine las variables `--color-*` **dentro del scope `.sigeco-app`**. Las utilidades Tailwind existentes (`bg-primary`, `text-muted`, etc.) toman los valores Marea solo dentro de Sigeco.
3. `globals.css` y los valores publicos no se modifican, con una excepcion aditiva: se agrega `--color-warning` a `:root` (con el ambar publico como valor) y el color `warning` a `tailwind.config.ts`, porque el token no existia. Esto no cambia ningun estilo publico existente.
4. Clases del sistema publico prohibidas en Sigeco: `premium-card`, `premium-*`, `glass`, `public-section`, `hero-*`, `shadow-soft`, `shadow-lift`.
5. Componentes de `src/components/public/` y `src/components/landing/` no se importan en Sigeco, y viceversa (`src/components/internal/`).
6. Dark mode: el sitio publico lo mantiene; Sigeco es tema claro unico (el layout ya fija `data-theme="light"` y nunca aplica `.dark`).

Si en el futuro se decide unificar, el camino es extraer una base compartida (fuentes, semantica de estados) y que cada superficie la extienda; esa decision queda explicitamente fuera del rediseno actual.

## Documentos Relacionados

- [Tareas de rediseno](../project/sigeco-redesign/tareas-de-rediseno.md)
- [Progreso de diseno](../project/sigeco-redesign/progreso-de-diseno.md)
- [Sistema visual publico](./public-visual-system.md)
- [Estado de implementacion V3](../project/v3-implementation-status.md)
