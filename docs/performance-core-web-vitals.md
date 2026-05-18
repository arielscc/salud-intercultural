# Performance Y Core Web Vitals

## Cambios Aplicados

- Se eliminaron animaciones JavaScript de secciones publicas estaticas.
- Se removio `framer-motion` del bundle y del lockfile.
- Se conservaron animaciones ligeras del hero con CSS y `prefers-reduced-motion`.
- Se redujo la cantidad de componentes `use client` a piezas realmente interactivas.
- Se mantiene `next/image` con `sizes`, placeholders y `priority` solo en imagenes hero.
- Se mantienen iframes secundarios con `loading="lazy"`.
- Se mantienen lecturas CMS omitidas durante build para evitar bloqueos y acelerar static generation.

## Componentes Client Restantes

- `Header`: menu mobile, tema y estado de scroll.
- `ThemeToggle`: cambio de tema.
- `ContactLeadForm`: formulario y validacion cliente.
- `FAQSection` y `FaqFilterList`: acordeones, filtros y busqueda.
- `WhatsAppFloatingButton`: mensaje contextual por ruta.
- Analytics: page views y conversion tracking.

## Validacion

- Ejecutar `pnpm build` antes de deploy.
- Revisar el resumen de rutas generado por Next.
- Revisar Lighthouse en Vercel Preview o Production cuando exista URL publica estable.

## Pendiente Recomendado

- Ejecutar Lighthouse mobile en el dominio final.
- Revisar imagenes reales subidas al CMS para evitar archivos demasiado pesados.
- Mantener fotos de equipo y servicios en los aspect ratios definidos.
