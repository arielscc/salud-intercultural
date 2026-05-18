# Analytics Y Eventos De Conversion

## Proveedores

- GA4 se activa con `NEXT_PUBLIC_GA_ID`.
- Meta Pixel se activa con `NEXT_PUBLIC_META_PIXEL_ID`.
- `dataLayer` queda disponible como capa comun para GTM u otros proveedores.

## Eventos

- `page_view`: se dispara en cada cambio de ruta publica.
- `whatsapp_click`: clicks en enlaces de WhatsApp o elementos con `data-conversion-action="whatsapp_click"`.
- `call_click`: clicks en enlaces `tel:` o elementos con `data-conversion-action="call_click"`.
- `cta_click`: clicks en CTAs con `data-conversion-label` que no sean WhatsApp ni llamada.
- `form_submit`: envio exitoso de formulario de lead.

## Privacidad

- No se envian nombres, telefonos, emails, mensajes ni motivos de consulta.
- Las URLs externas se limpian removiendo query string y hash antes de enviarse como evento.
- El page view usa solo `pathname`, sin parametros de busqueda.

## Campos Comunes

- `event`: nombre del evento.
- `event_category`: conversion, lead, navigation o engagement.
- `event_label`: etiqueta del CTA o formulario.
- `page_path`: ruta publica.
- `source`: fuente declarada cuando aplica.
- `form_origin`: origen del formulario cuando aplica.
