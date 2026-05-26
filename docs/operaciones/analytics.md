# Analytics Y Eventos De Conversion

Guia operativa para revisar medicion publica de analytics y conversiones.

## Proveedores

- GA4 se activa con `NEXT_PUBLIC_GA_ID`.
- Meta Pixel se activa con `NEXT_PUBLIC_META_PIXEL_ID`.
- `dataLayer` queda disponible como capa comun para GTM u otros proveedores.
- GA4 se inicializa con `send_page_view: false`; los page views los controla la app.
- GA4 usa `anonymize_ip: true`.

## Eventos

- `page_view`: se dispara en cada cambio de ruta publica desde `AnalyticsPageView`.
- `whatsapp_click`: clicks en enlaces de WhatsApp o enlaces con `data-conversion-action="whatsapp_click"`.
- `call_click`: clicks en enlaces `tel:` o enlaces con `data-conversion-action="call_click"`.
- `cta_click`: clicks en enlaces con `data-conversion-label` que no sean WhatsApp ni llamada.
- `form_submit`: envio exitoso de formulario de lead.

El tracking de clicks se hace por delegacion desde `ConversionTracker` y solo registra clicks que resuelven a un enlace `<a>`.

## Privacidad

- No se envian nombres, telefonos, emails, mensajes ni motivos de consulta.
- Las URLs externas se limpian removiendo query string y hash antes de enviarse como evento.
- El page view usa solo `pathname`, sin parametros de busqueda.
- El formulario de leads dispara `form_submit` solo despues de una respuesta exitosa de `/api/leads`.

## Campos Comunes

- `event`: nombre del evento.
- `event_category`: `conversion`, `lead`, `navigation` o `engagement`.
- `event_label`: etiqueta del CTA o formulario.
- `page_path`: ruta publica.
- `source`: fuente declarada cuando aplica.
- `form_origin`: origen del formulario cuando aplica.
- `link_url`: URL sanitizada cuando aplica.

## Validacion Antes De Deploy

Ejecutar:

```bash
pnpm lint
pnpm test
pnpm typecheck
pnpm run build
```

En staging o produccion:

1. Confirmar que `NEXT_PUBLIC_GA_ID` y `NEXT_PUBLIC_META_PIXEL_ID` existan solo si el ambiente debe medir.
2. Navegar entre rutas publicas y revisar `page_view` en GA4 DebugView o herramientas equivalentes.
3. Probar clicks de WhatsApp, llamada y CTAs etiquetados.
4. Enviar un lead valido y confirmar un unico `form_submit` exitoso.
5. Confirmar que eventos no incluyan nombre, telefono, email, mensaje, motivo de consulta, query string ni hash.

## Archivos Relevantes

- `src/features/analytics/AnalyticsScripts.tsx`
- `src/features/analytics/AnalyticsPageView.tsx`
- `src/features/analytics/ConversionTracker.tsx`
- `src/features/analytics/events.ts`
- `src/features/analytics/types.ts`
- `src/components/public/PublicLayout.tsx`
- `src/components/public/ContactLeadForm.tsx`
