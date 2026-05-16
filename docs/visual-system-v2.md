# Sistema Visual Publico V2

## Direccion

La interfaz publica usa un estilo premium, institucional y mobile-first. El tono visual
debe sentirse medico, cercano y organizado, sin convertirse en una landing generica.

## Paleta

- Primario: teal medico para acciones principales y elementos de confianza.
- Secundario: verde intercultural para soporte visual y bloques institucionales.
- Acento: ambar controlado para detalles, no para dominar la interfaz.
- Neutros: superficies claras, bordes suaves y texto profundo.
- Dark mode: mantiene contraste alto y reduce sombras en favor de bordes y superficies.

## Tipografia

- Titulares: Sora.
- Texto y UI: Inter.
- No escalar fuentes con viewport width.
- Mantener `tracking-normal`.
- Usar `text-balance` en titulares principales cuando mejora el corte de linea.

## Espaciado

- Secciones publicas: `py-20 sm:py-24`.
- Secciones compactas: `py-16 sm:py-20`.
- Grids: `gap-6 sm:gap-8`.
- Cards: `p-5 sm:p-6`.

## Componentes Base

- `Button`: estados default, hover, active, loading, disabled y variantes primary, secondary, ghost, light.
- `Badge`: etiqueta institucional compacta.
- `PremiumCard`: card base con tonos default, soft, glass, success, error y empty.
- `PublicSection`: wrapper para secciones publicas con tonos default, surface, gradient y hero.
- `VisualState`: estados loading, error, success y empty.
- `AnimatedCard`: card animada con Framer Motion y patron compartido.

## Animacion

Usar Framer Motion con:

- Duracion base: 0.48s.
- Ease: `[0.22, 1, 0.36, 1]`.
- Viewport: una sola vez, con margen `-80px`.
- Stagger corto de `0.08s`.

Respetar `prefers-reduced-motion`.

## Estados

- Default: superficie blanca, borde suave, sombra moderada.
- Hover: elevacion minima y borde primario tenue.
- Active: escala leve a `0.99`.
- Loading: spinner pequeno y contenido no cambiante.
- Error: borde destructivo, fondo rojo tenue.
- Success: borde verde, fondo verde tenue.
- Disabled: opacidad reducida, sin interaccion.
- Empty: borde dashed y superficie suave.
