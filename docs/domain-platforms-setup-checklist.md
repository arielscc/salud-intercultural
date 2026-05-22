# Checklist Para Activar El Nuevo Dominio OK

Dominio principal:

```txt
https://saludintercultural.com
```

Dominios secundarios:

```txt
https://www.saludintercultural.com
https://staging.saludintercultural.com
```

Usa este documento como checklist operativo. Marca cada tarea cuando quede terminada y verificada.

## Checklist General

### 1. Cloudflare DNS

1. [x] Entrar a Cloudflare y abrir la zona `saludintercultural.com`.
2. [x] Revisar si ya existen registros `A`, `AAAA` o `CNAME` para `@`, `www` y `staging`.
3. [x] Crear o actualizar el registro `A` para `@`.
4. [x] Crear o actualizar el registro `CNAME` para `www`.
5. [x] Crear o actualizar el registro `CNAME` para `staging`.
6. [x] Dejar los registros de Vercel en modo `DNS only`.
7. [x] Esperar propagacion DNS.
8. [x] Validar DNS desde terminal o herramientas externas.

### 2. Vercel Domains

1. [x] Entrar al proyecto correcto en Vercel.
2. [x] Agregar `saludintercultural.com`.
3. [x] Agregar `www.saludintercultural.com`.
4. [x] Agregar `staging.saludintercultural.com`.
5. [x] Configurar `saludintercultural.com` como dominio primario de Production.
6. [x] Configurar `www.saludintercultural.com` como redirect o alias del dominio principal.
7. [x] Asignar `staging.saludintercultural.com` a la rama o ambiente Preview de `staging`.
8. [x] Confirmar que Vercel muestre configuracion DNS valida.
9. [x] Confirmar que Vercel emita SSL para los tres dominios.

### 3. Variables De Entorno En Vercel

1. [x] Actualizar variables de Production.
2. [x] Actualizar variables de Preview/Staging.
3. [x] Confirmar que las variables sensibles no esten expuestas como `NEXT_PUBLIC_`.
4. [x] Ejecutar redeploy manual de Production.
5. [x] Ejecutar redeploy manual de Staging.
6. [x] Confirmar que el sitio usa el dominio correcto en canonical, Open Graph, sitemap y admin.

### 4. Sitio Publico Y Admin

1. [x] Abrir `https://saludintercultural.com`.
2. [x] Abrir `https://www.saludintercultural.com`.
3. [x] Confirmar que `www` redirige o resuelve correctamente.
4. [x] Abrir `https://staging.saludintercultural.com`.
5. [x] Abrir `https://saludintercultural.com/admin`.
6. [x] Abrir `https://staging.saludintercultural.com/admin`.
7. [x] Probar login de Payload en Production.
8. [x] Probar login de Payload en Staging.
9. [x] Probar formulario de contacto.
10. [x] Probar botones de WhatsApp, llamada, email y mapa.

### 5. SEO Tecnico

1. [x] Abrir `https://saludintercultural.com/robots.txt`.
2. [x] Confirmar que `robots.txt` apunta al sitemap del dominio final.
3. [x] Abrir `https://saludintercultural.com/sitemap.xml`.
4. [x] Confirmar que el sitemap lista URLs de `saludintercultural.com`.
5. [x] Verificar canonical de la home.
6. [x] Verificar canonical de paginas principales.
7. [] Verificar Open Graph con el dominio final.
8. [x] Decidir y aplicar estrategia `noindex` o proteccion para staging.

### 5.4 Open Graph

Inspecciona los metatags:

```html
property="og:url" OK
property="og:image"
```

Estado recomendado:

  5.4 Open Graph: parcialmente completada

  Verificado:
  - og:url usa https://saludintercultural.com
  - og:image usa URL absoluta del dominio final

  Pendiente:
  - Crear y subir public/og-salud-intercultural.jpg
  - Tamaño recomendado: 1200x630
  - Contenido recomendado: marca Salud Intercultural + mensaje corto + visual relacionado a la clínica/medicina natural

  Nota:
  Actualmente https://saludintercultural.com/og-salud-intercultural.jpg devuelve 404.

### 6. Google Search Console

1. [x] Crear propiedad tipo `Domain` para `saludintercultural.com`.
2. [x] Copiar el registro TXT de verificacion.
3. [x] Agregar el TXT en Cloudflare.
4. [x] Verificar propiedad en Search Console.
5. [x] Enviar `https://saludintercultural.com/sitemap.xml`.
6. [x] Inspeccionar la home con URL Inspection.
7. [x] Solicitar indexacion de la home.
8. [x] Inspeccionar paginas principales.
9. [x] Revisar cobertura/indexacion despues de unos dias.

### 7. Google Analytics 4

1. [x] Abrir la propiedad GA4 correcta.
2. [x] Revisar el Web Stream actual.
3. [x] Cambiar la URL del Web Stream a `https://saludintercultural.com`.
4. [x] Confirmar que `NEXT_PUBLIC_GA_ID` este configurado en Production.
5. [x] Dejar GA4 vacio o separado en Staging.
6. [x] Abrir el sitio en produccion.
7. [x] Validar eventos en Realtime.
8. [x] Validar evento de envio de formulario si aplica.

### 8. Meta Business / Meta Pixel

1. [ ] Confirmar si se usara Meta Pixel ahora o despues.
2. [ ] Revisar o crear Pixel en Events Manager.
3. [ ] Configurar `NEXT_PUBLIC_META_PIXEL_ID` en Production si se usara.
4. [ ] Agregar `saludintercultural.com` en dominios de Meta Business si corresponde.
5. [ ] Verificar dominio por DNS o meta tag si Meta lo solicita.
6. [ ] Probar eventos con Meta Pixel Helper o Test Events.
7. [ ] Dejar Meta apagado en Staging.

### 9. Google Maps Y Contacto

1. [x] Confirmar link publico final de Google Maps.
2. [x] Configurar `NEXT_PUBLIC_GOOGLE_MAPS_URL` en Production.
3. [x] Configurar `NEXT_PUBLIC_GOOGLE_MAPS_URL` en Staging.
4. [x] Confirmar numero principal de WhatsApp.
5. [x] Confirmar telefono de llamada.
6. [x] Confirmar email publico.
7. [x] Probar CTAs en desktop.
8. [x] Probar CTAs en mobile.

### 10. Revision Final

1. [x] Ejecutar prueba completa de navegacion publica.
2. [x] Confirmar que no quedan URLs canonicas de Vercel en Production.
3. [x] Confirmar que Staging no se indexa o esta protegido.
4. [x] Confirmar que Search Console recibe el sitemap.
5. [x] Confirmar que GA4 recibe trafico en Realtime.
6. [x] Confirmar que Meta recibe eventos si esta activo.
7. [x] Confirmar que el formulario de leads funciona.
8. [x] Guardar evidencia: capturas o notas de cada plataforma.
