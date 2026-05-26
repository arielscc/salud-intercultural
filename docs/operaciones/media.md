# Media E Imagenes

Guia operativa para cargar, revisar y usar imagenes o videos administrables.

## Fuente De Media

- La fuente prioritaria para contenido administrable es la collection `media` de Payload.
- Las URLs externas se mantienen como fallback temporal para contenido local o migraciones.
- Las imagenes publicas usan `next/image` para optimizacion, lazy loading y formatos modernos.
- Los dominios remotos habilitados son `images.unsplash.com` para fallbacks visuales y `*.public.blob.vercel-storage.com` para Vercel Blob.
- En local, si `BLOB_READ_WRITE_TOKEN` esta vacio, Payload usa `public/media`.
- En staging y produccion, Vercel Blob debe estar configurado si se subiran imagenes o videos desde Payload.

## Variantes CMS

Payload genera estas variantes para la collection `media`:

- `thumbnail`: 320 x 240 para listados y vistas admin.
- `card`: 900 x 600 para tarjetas de servicios o contenido general.
- `portrait`: 720 x 900 para fotografias de equipo.
- `hero`: 1600 x 1200 para bloques principales.

La collection acepta:

- `image/*`
- `video/*`

Los videos se administran como media, pero no se renderizan con `next/image`.

## Aspect Ratios Publicos

- Hero institucional: `4 / 5`.
- Tarjeta destacada de servicio: `16 / 10`.
- Miniatura de servicio: `13 / 14`.
- Fotografia de equipo: `4 / 5`.
- Galeria: `4 / 3`.

Los valores compartidos viven en `src/lib/images.ts`.

## Accesibilidad

- Todo registro de `media` requiere texto alternativo.
- Todo campo reusable de imagen en contenido publico requiere `imageAlt`.
- Si una imagen CMS trae `alt`, se usa como fallback cuando el contenido no define uno especifico.
- El alt debe describir la imagen y no repetir literalmente el titulo visible.

## Placeholders Y Sizes

- Las imagenes publicas usan un placeholder blur comun definido en `src/lib/images.ts`.
- El placeholder evita saltos visuales mientras carga la imagen final.
- Elegir el `sizes` desde `publicImageSizes` segun el contexto.
- Usar `priority` solo en imagenes hero o principales sobre el primer pliegue.

## Reglas De Uso

- No renderizar imagenes sin contenedor con ratio o dimensiones estables.
- Usar `object-cover` para evitar deformaciones.
- Preparar fotos de equipo con encuadre vertical.
- Preparar servicios con encuadre horizontal o card.
- Revisar peso de imagenes reales subidas al CMS antes de publicar.

## Validacion Antes De Deploy

1. Confirmar que nuevas imagenes tengan `alt` o `imageAlt`.
2. Confirmar que el encuadre respete el aspect ratio del componente donde se renderiza.
3. Confirmar que las imagenes CMS reales no sean archivos excesivamente pesados.
4. Confirmar que `BLOB_READ_WRITE_TOKEN` exista en staging/produccion si se requiere media persistente.
5. Revisar que URLs externas pertenezcan a dominios permitidos por `next.config.mjs`.

## Archivos Relevantes

- `src/lib/images.ts`
- `src/payload/collections/Media.ts`
- `src/payload/fields.ts`
- `next.config.mjs`
- `payload.config.ts`
- `docs/operaciones/variables-entorno.md`
- `docs/operaciones/performance.md`
