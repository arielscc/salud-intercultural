# Checklist De Accesibilidad Y UX Responsive

## Sitio Publico

- Se agrego enlace "Saltar al contenido principal" visible al foco.
- Las paginas publicas principales tienen `main` identificable con `id="contenido-principal"`.
- Los estados de foco usan `focus-visible` con contraste visible.
- Los botones tactiles principales mantienen al menos 44 px de alto.
- El `body` reserva espacio inferior en mobile para que los CTAs flotantes no tapen contenido final.
- Los CTAs flotantes se apilan verticalmente en mobile y mantienen foco visible.

## Navegacion

- El menu mobile declara `aria-controls` y `aria-expanded`.
- El menu mobile se puede cerrar con Escape.
- El menu mobile se cierra al cambiar de ruta.
- Los enlaces activos mantienen `aria-current="page"`.
- Iconos decorativos quedan ocultos con `aria-hidden`.

## Formularios

- Los inputs tienen labels asociados mediante `htmlFor` e `id`.
- Los errores usan `aria-invalid` y `aria-describedby`.
- El estado de carga usa `aria-busy`.
- El mensaje de exito usa `role="status"` y `aria-live="polite"`.
- El mensaje de error de envio usa `role="alert"`.
- El formulario usa `noValidate` para mantener mensajes consistentes de la app.

## Movimiento Y Responsive

- `prefers-reduced-motion` desactiva animaciones, transiciones y transformaciones.
- La navegacion mobile mantiene targets tactiles amplios.
- Los botones flotantes respetan `safe-area-inset-bottom`.

## Pendiente Recomendado

- Ejecutar una auditoria manual con lector de pantalla antes del lanzamiento final.
- Validar contraste con contenido real del CMS si se cambian colores o fondos.
