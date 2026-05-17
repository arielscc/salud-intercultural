# Estrategia De Media E Imagenes

## Fuente De Imagenes

- La fuente prioritaria para contenido administrable es la collection `media` de Payload.
- Las URLs externas se mantienen como fallback temporal para contenido local o migraciones.
- Las imagenes publicas usan `next/image` para optimizacion, lazy loading y formatos modernos.
- El dominio remoto habilitado por ahora es `images.unsplash.com`, usado solo para fallbacks visuales.

## Variantes CMS

- `thumbnail`: 320 x 240 para listados y vistas admin.
- `card`: 900 x 600 para tarjetas de servicios o contenido general.
- `portrait`: 720 x 900 para fotografias de equipo.
- `hero`: 1600 x 1200 para bloques principales.

## Aspect Ratios Publicos

- Hero institucional: `4 / 5`.
- Tarjeta destacada de servicio: `16 / 10`.
- Miniatura de servicio: contenedor fijo con `object-cover`.
- Fotografia de equipo: vertical tipo retrato.
- Galeria: `4 / 3`.

## Accesibilidad

- Todo registro de `media` requiere texto alternativo.
- Todo campo reusable de imagen en contenido publico requiere `imageAlt`.
- Si una imagen CMS trae `alt`, se usa como fallback cuando el contenido no define uno especifico.
- El alt debe describir la imagen y no repetir literalmente el titulo visible.

## Placeholders

- Las imagenes publicas usan un placeholder blur comun definido en `src/lib/images.ts`.
- El placeholder evita saltos visuales mientras carga la imagen final.

## Reglas De Uso

- No renderizar imagenes sin contenedor con ratio o dimensiones estables.
- Usar `object-cover` para evitar deformaciones.
- Elegir el `sizes` desde `publicImageSizes` segun el contexto.
- Preparar fotos de equipo con encuadre vertical y servicios con encuadre horizontal o card.
