# Sistema Visual Publico

Referencia de diseno para la interfaz publica. Este documento no es una guia operativa; las validaciones de accesibilidad, performance y media viven en `docs/operations`.

## Direccion

La interfaz publica usa un estilo premium, institucional y mobile-first. El tono visual debe sentirse medico, cercano y organizado, sin convertirse en una landing generica.

## Paleta

- Primario: teal medico para acciones principales y elementos de confianza.
- Secundario: verde intercultural para soporte visual y bloques institucionales.
- Acento: ambar controlado para detalles, no para dominar la interfaz.
- Neutros: superficies claras, bordes suaves y texto profundo.
- Dark mode: mantiene contraste alto y reduce sombras en favor de bordes y superficies.

La paleta vive principalmente en:

- `src/app/globals.css`
- `tailwind.config.ts`
- `src/config/brand.ts`
- `src/config/design-system.ts`

## Tipografia

- Titulares: Sora.
- Texto y UI: Inter.
- No escalar fuentes con viewport width.
- Mantener `tracking-normal`.
- Usar `text-balance` en titulares principales cuando mejora el corte de linea.

## Espaciado Y Layout

- Secciones publicas base: `py-20 sm:py-24`.
- Secciones compactas: `py-16 sm:py-20` cuando el contenido lo requiera.
- Contenedor publico: `max-w-7xl px-4 sm:px-6 lg:px-8`.
- Cards base: `p-5 sm:p-6`.
- Usar gaps responsivos segun densidad del bloque; los patrones mas comunes son `gap-5`, `gap-6`, `gap-8` y `gap-12`.

## Componentes Base

- `Button`: variantes `primary`, `secondary`, `ghost`, `light`; tamanos `sm`, `md`, `lg`; estados loading y disabled.
- `Badge`: etiqueta institucional compacta.
- `PremiumCard`: card base con tonos `default`, `soft`, `glass`, `success`, `error` y `empty`.
- `PublicSection`: wrapper para secciones publicas con tonos `default`, `surface`, `gradient` y `hero`.
- `VisualState`: estados loading, error, success y empty.
- `AnimatedCard`: card animada con Framer Motion y patron compartido.
- `Container`: ancho maximo y padding horizontal del sitio publico.
- `ThemeToggle`: cambio entre modo claro y oscuro.

## Animacion

Las animaciones compartidas viven en `src/lib/motion.ts`.

Valores actuales:

- `sectionReveal`: duracion `0.62s`, `y: 18`.
- `mediaReveal`: duracion `0.72s`, `y: 16`, `scale: 0.985`.
- `cardReveal`: duracion `0.52s`, `y: 18`.
- Ease compartido: `[0.22, 1, 0.36, 1]`.
- Viewport: `once: true`, `amount: 0.22`, `margin: "0px 0px -10% 0px"`.
- Stagger: `0.09s` con `delayChildren: 0.04s`.

Respetar `prefers-reduced-motion`; la regla global esta en `src/app/globals.css`.

## Estados

- Default: superficie blanca, borde suave, sombra moderada.
- Hover: elevacion minima y borde primario tenue.
- Active: escala leve a `0.99`.
- Loading: spinner pequeno y contenido estable.
- Error: borde destructivo, fondo rojo tenue.
- Success: borde verde, fondo verde tenue.
- Disabled: opacidad reducida, sin interaccion.
- Empty: borde dashed y superficie suave.

## Reglas De Uso

- Usar componentes compartidos antes de crear variantes locales.
- Mantener dark mode cuando se agreguen colores nuevos.
- Mantener foco visible en controles interactivos.
- Evitar cards anidadas salvo que el patron ya exista en la pantalla.
- Reservar tipografia hero para heroes reales, no para panels o cards compactas.
- Revisar contraste y responsive cuando el contenido provenga del CMS.
