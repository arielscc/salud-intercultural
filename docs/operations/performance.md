# Performance Y Core Web Vitals

Guia operativa para revisar performance del sitio publico antes de staging o produccion.

## Estado Actual

- Las imagenes publicas usan `next/image` con formatos AVIF/WebP configurados en `next.config.mjs`.
- Los componentes con imagen publica usan `sizes` y placeholder blur comun desde `src/lib/images.ts`.
- `priority` se reserva para imagenes hero o imagenes principales sobre el primer pliegue.
- El iframe del mapa usa `loading="lazy"`.
- Las lecturas CMS durante build se omiten por defecto con `CMS_READS_DURING_BUILD="false"`.
- Existe una regla global de `prefers-reduced-motion` en `src/app/globals.css`.
- `framer-motion` sigue instalado y se usa en secciones publicas de la home.
- Varias secciones publicas siguen siendo componentes client por animaciones JavaScript.

## Componentes Client Relevantes

Componentes client necesarios por interaccion:

- `Header`: menu mobile, tema y estado de scroll.
- `ThemeToggle`: cambio de tema.
- `ContactLeadForm`: formulario y validacion cliente.
- `FAQSection` y `FaqFilterList`: acordeones, filtros y busqueda.
- `WhatsAppFloatingButton`: mensaje contextual por ruta.
- Analytics: page views y conversion tracking.

Componentes client actuales por animaciones:

- `HeroSection`
- `ServicesSection`
- `ProblemsSection`
- `BenefitsSection`
- `AboutSection`
- `HomeStatsSection`
- `ProcessSection`
- `TestimonialsSection`
- `HomeEditableBlocksSection`
- `AnimatedCard`

## Validacion Antes De Deploy

Ejecutar:

```bash
pnpm lint
pnpm test
pnpm typecheck
pnpm run build
```

Si `pnpm run build` falla con `DATABASE_URL`, revisar [errores comunes](./troubleshooting.md) y [variables de entorno](./environment-variables.md).

En staging o produccion:

1. Revisar el resumen de rutas generado por Next.
2. Ejecutar Lighthouse mobile sobre la URL publica.
3. Revisar LCP, CLS, INP y peso total de JavaScript.
4. Verificar que imagenes CMS reales no sean archivos excesivamente pesados.
5. Confirmar que fotos de equipo y servicios respeten los aspect ratios definidos.

## Pendientes Tecnicos

- Reemplazar animaciones de secciones estaticas por CSS o markup server cuando sea viable.
- Remover `framer-motion` del bundle solo despues de eliminar todos sus imports.
- Reducir `use client` en secciones que no tengan estado, efectos o handlers de navegador.
