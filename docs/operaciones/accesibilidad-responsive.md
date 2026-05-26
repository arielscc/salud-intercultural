# Accesibilidad Y UX Responsive

Guia operativa para revisar accesibilidad y comportamiento responsive del sitio publico.

## Estado Actual

- Existe enlace "Saltar al contenido principal" en `PublicLayout`.
- Las paginas publicas principales usan `main` con `id="contenido-principal"`.
- Los estados de foco usan la clase compartida `focus-ring` con `focus-visible`.
- Los controles principales mantienen targets tactiles amplios.
- El `body` reserva espacio inferior en mobile para que los CTAs flotantes no tapen contenido final.
- Los CTAs flotantes respetan `safe-area-inset-bottom`.
- Existe una regla global de `prefers-reduced-motion` en `src/app/globals.css`.

## Navegacion

- El menu mobile declara `aria-controls` y `aria-expanded`.
- El menu mobile se puede cerrar con Escape.
- El menu mobile se cierra al seleccionar un enlace interno.
- Los enlaces activos usan `aria-current="page"`.
- Los iconos decorativos se marcan con `aria-hidden="true"` cuando corresponde.

## Formularios

- Los campos del formulario de leads tienen labels asociados con `htmlFor` e `id`.
- Los errores de campo usan `aria-invalid` y `aria-describedby`.
- El estado de envio usa `aria-busy`.
- El mensaje de exito usa `role="status"` y `aria-live="polite"`.
- El mensaje de error de envio usa `role="alert"`.
- El formulario usa `noValidate` para mantener mensajes consistentes de la app.

## Validacion Antes De Deploy

Ejecutar:

```bash
pnpm lint
pnpm test
pnpm typecheck
pnpm run build
```

En staging o produccion:

1. Navegar con teclado por header, menu mobile, CTAs flotantes, FAQs y formulario.
2. Probar el enlace "Saltar al contenido principal".
3. Probar menu mobile en viewport angosto: abrir, cerrar con Escape y cerrar al seleccionar un enlace.
4. Probar formulario con campos invalidos, envio exitoso y error de red o servidor.
5. Revisar Lighthouse Accessibility en mobile.
6. Validar contraste con contenido real del CMS si cambian colores, fondos o imagenes.

## Pendientes Recomendados

- Ejecutar auditoria manual con lector de pantalla antes del lanzamiento final.
- Revisar contraste final con contenido real de CMS y fotos definitivas.
- Revisar nuevamente targets tactiles si se agregan nuevos botones, tabs, filtros o controles.
