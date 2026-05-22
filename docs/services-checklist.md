# Checklist De Credenciales, Keys Y Servicios Externos

Este documento mantiene los checklists por seccion. Las tareas completadas quedan marcadas con `[x]`; las explicaciones se incluyen solo para tareas pendientes.

## Estado Recomendado Ahora

Checklist:

1. [x] Rotar la password de Neon/Postgres porque una `DATABASE_URL` real fue compartida en el chat.
2. [x] Confirmar variables de Production en Vercel.
3. [x] Confirmar variables de staging en Vercel si usaras deploys de prueba.
4. [x] Generar un `PAYLOAD_SECRET` distinto para produccion.
5. [x] Crear o confirmar usuario admin inicial de Payload.
6. [x] Mantener Analytics, Meta Pixel y Search Console como opcionales hasta activarlos en produccion.
7. [x] Reemplazar la URL publica de Vercel por el dominio final `https://saludintercultural.com`.

```

## 1. Vercel

Sitio: https://vercel.com

Checklist:

1. [x] Proyecto conectado al repositorio de GitHub.
2. [x] Rama `main` configurada para Production.
3. [x] Rama `develop` creada para trabajo local.
4. [x] Rama `staging` creada para revision publicada.
5. [x] Build command: `pnpm build`.
6. [x] Variables de entorno cargadas en Production.
7. [x] Variables de entorno cargadas en staging.
8. [x] Redeploy manual despues de cambiar variables.

## 2. Neon / Postgres

Sitio: https://neon.tech

Checklist:

1. [x] Proyecto Neon creado.
2. [x] Database creada.
3. [x] Connection string copiado desde Neon.
4. [x] Password rotada si ya fue expuesta.
5. [x] `DATABASE_URL` actualizada en Vercel Production.
6. [x] `DATABASE_URL` actualizada en Vercel Staging.
7. [x] `DATABASE_URL` actualizada en `.env` local.
8. [x] Migraciones y seeds ejecutados solo contra el ambiente correcto.

## 3. Payload CMS

Payload vive dentro del proyecto Next.js. No requiere cuenta externa, pero si requiere secretos y usuario admin.

Checklist:

1. [x] `PAYLOAD_SECRET` generado con 32+ caracteres.
2. [x] `PAYLOAD_PUBLIC_SERVER_URL` apunta a la URL del ambiente.
3. [x] `PAYLOAD_DB_SCHEMA` definido como `payload`.
4. [x] Primer usuario admin creado en staging.
5. [x] Primer usuario admin creado en produccion.
6. [x] Login admin probado en `/admin` para staging.
7. [x] Login admin probado en `/admin` para produccion.

## 4. Google Analytics 4

Sitio: https://analytics.google.com

Checklist:

1. [x] Cuenta de Google Analytics creada.
2. [x] Propiedad GA4 creada.
3. [x] Web stream creado.
4. [x] Measurement ID copiado: `G-SF97RY5YQ1`.
5. [x] `NEXT_PUBLIC_GA_ID` configurado en Vercel.
6. [x] Eventos verificados en `Realtime`.

## 5. Meta Pixel

Sitio: https://business.facebook.com

Checklist:

1. [x] Cuenta de Meta Business creada.
2. [x] Pixel creado.
3. [x] Pixel ID copiado.
4. [x] `NEXT_PUBLIC_META_PIXEL_ID` configurado.
5. [x] Eventos basicos verificados.

## 6. Google Search Console

Sitio: https://search.google.com/search-console

Checklist:

1. [x] Propiedad creada.
2. [x] Metodo de verificacion elegido.
3. [x] Verificación completada mediante archivo HTML.
4. [x] Sitemap enviado.
5. [ ] Dominio final verificado por DNS.

## 7. WhatsApp, Telefonos Y Email

No requiere token ni API. El sitio usa links publicos. Ambos numeros pueden recibir WhatsApp y llamadas, pero el principal es `+59164175822`.

Checklist:

1. [x] Numero principal confirmado con codigo de pais: `+59164175822`.
2. [x] Numero alternativo confirmado con codigo de pais: `+59162287251`.
3. [x] Email institucional confirmado.
4. [x] Variables de contacto configuradas en Vercel staging.
5. [x] Variables de contacto configuradas en Vercel produccion.
6. [x] Prueba de click en mobile y desktop para staging.
7. [x] Prueba de click en mobile y desktop para produccion.

## 8. Google Maps

No requiere API key si solo usas un enlace publico a la ubicacion.

Checklist:

1. [x] Perfil o ubicacion confirmado en Google Maps.
2. [x] Link publico copiado.
3. [x] `NEXT_PUBLIC_GOOGLE_MAPS_URL` configurado en staging.
4. [x] `NEXT_PUBLIC_GOOGLE_MAPS_URL` configurado en produccion.
5. [x] CTA probado en staging.
6. [x] CTA probado en produccion.

## 9. Dominio Y DNS

El dominio final comprado es `saludintercultural.com`. El proyecto queda preparado para usarlo como URL canonica de produccion.

Checklist:

1. [x] Dominio comprado.
2. [ ] Dominio agregado en Vercel.
3. [ ] DNS apuntando a Vercel.
4. [ ] SSL activo.
5. [x] `NEXT_PUBLIC_SITE_URL` documentado con el dominio final.
6. [x] `PAYLOAD_PUBLIC_SERVER_URL` documentado con el dominio final.
7. [x] Search Console configurado para dominio final.
8. [ ] Analytics y Meta actualizados o revisados.
9. [x] Sitemap reenviado.
