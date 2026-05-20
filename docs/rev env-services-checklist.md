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

Como hacerlo:

### 6. Mantener Analytics, Meta Pixel Y Search Console Opcionales

Para staging, dejalos apagados:

```env
NEXT_PUBLIC_GA_ID=""
NEXT_PUBLIC_META_PIXEL_ID=""
GOOGLE_SITE_VERIFICATION=""
```

Para produccion, puedes dejarlos vacios hasta activar medicion y verificacion del dominio final. Si decides activar alguno ahora, sigue las secciones 4, 5 y 6 de este documento.

### 7. Usar El Dominio Final En Produccion

En produccion usa:

```env
NEXT_PUBLIC_SITE_URL="https://saludintercultural.com"
PAYLOAD_PUBLIC_SERVER_URL="https://saludintercultural.com"
```

La URL de Vercel queda como fallback tecnico, no como URL canonica publica. En staging usa la URL real del deployment de la rama `staging`. Si la URL real no es esta, reemplazala:

```env
NEXT_PUBLIC_SITE_URL="https://salud-intercultural-staging.vercel.app"
PAYLOAD_PUBLIC_SERVER_URL="https://salud-intercultural-staging.vercel.app"
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

Como hacerlo:

No hay tareas pendientes en esta seccion.

Variables principales de produccion:

```env
NEXT_PUBLIC_SITE_URL="https://saludintercultural.com"
PAYLOAD_PUBLIC_SERVER_URL="https://saludintercultural.com"
DATABASE_URL="postgresql://..."
PAYLOAD_SECRET="..."
PAYLOAD_DB_SCHEMA="payload"
CMS_READS_DURING_BUILD="false"
```

Variables recomendadas para staging:

```env
NEXT_PUBLIC_SITE_URL="https://salud-intercultural-staging.vercel.app"
PAYLOAD_PUBLIC_SERVER_URL="https://salud-intercultural-staging.vercel.app"
DATABASE_URL="postgresql://..."
CMS_READS_DURING_BUILD="false"
```

Si Vercel te da otra URL para la rama `staging`, usa esa URL real en lugar de `https://salud-intercultural-staging.vercel.app`.

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

Como hacerlo:

### 8. Migraciones Y Seeds Solo Contra El Ambiente Correcto

Regla practica:

- `.env` = local.
- `.env.staging` = staging.
- `.env.production.local` = produccion, solo si se crea manualmente.

Antes de ejecutar un seed, confirma que el host de `DATABASE_URL` sea el ambiente correcto.

Para staging:

1. Completa `.env.staging` con la `DATABASE_URL` de staging.
2. Confirma que no sea la base de produccion.
3. Ejecuta:

```bash
pnpm payload:seed:staging
```

Para produccion, no ejecutes nada todavia salvo confirmacion expresa. Cuando toque, crea `.env.production.local` no versionado y ejecuta:

```bash
DOTENV_CONFIG_PATH=.env.production.local pnpm payload:seed
```

No ejecutes `pnpm db:reset` contra staging ni produccion.

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

Como hacerlo:

### 4. Primer Usuario Admin Creado En Staging

1. Abre `.env.staging`.
2. Reemplaza:

```env
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="replace-with-a-secure-staging-password"
ADMIN_RESET_PASSWORD_ON_SEED="true"
```

3. Usa `ADMIN_RESET_PASSWORD_ON_SEED="true"` solo en staging o cuando quieras resetear explicitamente el password del admin existente.
4. Confirma que `DATABASE_URL` sea la de staging.
5. Ejecuta:

```bash
pnpm payload:seed:staging
```

### 5. Primer Usuario Admin Creado En Produccion

Hazlo solo cuando staging ya este probado.

1. Crea `.env.production.local` local y no versionado.
2. Incluye:

```env
DATABASE_URL="postgresql://..."
PAYLOAD_SECRET="secret-de-produccion"
PAYLOAD_PUBLIC_SERVER_URL="https://saludintercultural.com"
PAYLOAD_DB_SCHEMA="payload"
ADMIN_EMAIL="tu-email-admin"
ADMIN_PASSWORD="clave-segura"
ADMIN_RESET_PASSWORD_ON_SEED="false"
```

3. Ejecuta:

```bash
DOTENV_CONFIG_PATH=.env.production.local pnpm payload:seed
```

### 6. Login Admin Probado En Staging

1. Abre la URL real de staging:

```txt
https://salud-intercultural-staging.vercel.app/admin
```

2. Si Vercel te dio otra URL, usa esa.
3. Entra con `ADMIN_EMAIL` y `ADMIN_PASSWORD`.
4. Confirma que puedes ver servicios, testimonios, FAQs, equipo y configuracion.

### 7. Login Admin Probado En Produccion

1. Abre:

```txt
https://saludintercultural.com/admin
```

2. Entra con el usuario admin de produccion.
3. Si entra correctamente, puedes quitar `ADMIN_PASSWORD` de Vercel si ya no necesitas volver a sembrar admins.

## 4. Google Analytics 4

Sitio: https://analytics.google.com

Checklist:

1. [x] Cuenta de Google Analytics creada.
2. [x] Propiedad GA4 creada.
3. [x] Web stream creado.
4. [x] Measurement ID copiado: `G-SF97RY5YQ1`.
5. [x] `NEXT_PUBLIC_GA_ID` configurado en Vercel.
6. [x] Eventos verificados en `Realtime`.

Como hacerlo:

### 1. Cuenta De Google Analytics Creada

1. Entra a https://analytics.google.com.
2. Inicia sesion con la cuenta de Google que administrara el sitio.
3. Crea una cuenta para la clinica si no existe.

### 2. Propiedad GA4 Creada

1. Dentro de Google Analytics, crea una propiedad GA4.
2. Usa nombre como `Salud Intercultural - Produccion`.
3. Configura pais, zona horaria y moneda.

### 3. Web Stream Creado

1. Crea un Web Stream.
2. Usa el dominio final:

```txt
https://saludintercultural.com
```

3. Mantén esta URL alineada con `NEXT_PUBLIC_SITE_URL`.

### 4. Measurement ID Copiado

Copia el ID con formato:

```txt
G-SF97RY5YQ1
```

### 5. `NEXT_PUBLIC_GA_ID` Configurado En Vercel

En Vercel `Production`, configura:

```env
NEXT_PUBLIC_GA_ID="G-SF97RY5YQ1"
```

Para staging, recomendado dejarlo vacio para no mezclar trafico de pruebas.

### 6. Eventos Verificados En `Realtime`

1. Redeploy produccion.
2. Abre el sitio de produccion.
3. En Google Analytics, revisa `Reports` > `Realtime`.

## 5. Meta Pixel

Sitio: https://business.facebook.com

Checklist:

1. [x] Cuenta de Meta Business creada.
2. [x] Pixel creado.
3. [x] Pixel ID copiado.
4. [x] `NEXT_PUBLIC_META_PIXEL_ID` configurado.
5. [x] Eventos basicos verificados.

Como hacerlo:

### 1. Cuenta De Meta Business Creada

1. Entra a https://business.facebook.com.
2. Crea o usa una cuenta Business para la clinica.

### 2. Pixel Creado

1. Ve a `Events Manager`.
2. Crea un Pixel para el sitio.

### 3. Pixel ID Copiado

Copia el ID numerico del Pixel.

### 4. `NEXT_PUBLIC_META_PIXEL_ID` Configurado

En Vercel `Production`, configura:

```env
NEXT_PUBLIC_META_PIXEL_ID="1234567890"
```

Para staging, recomendado dejarlo vacio.

### 5. Eventos Basicos Verificados

1. Redeploy produccion.
2. Abre el sitio.
3. Valida eventos con Events Manager o Meta Pixel Helper.

## 6. Google Search Console

Sitio: https://search.google.com/search-console

Checklist:

1. [x] Propiedad creada.
2. [x] Metodo de verificacion elegido.
3. [x] Verificación completada mediante archivo HTML.
4. [x] Sitemap enviado.
5. [ ] Dominio final verificado por DNS.

Como hacerlo:

### 1. Propiedad Creada

Crea una propiedad `Domain` para `saludintercultural.com`. Si necesitas una propiedad `URL prefix`, usa:

```txt
https://saludintercultural.com
```

La verificacion recomendada para propiedad `Domain` es por DNS en Cloudflare.

### 2. Metodo De Verificacion Elegido

Usa verificacion por meta tag si quieres hacerlo ahora con Vercel.

### 3. Token Configurado Como `GOOGLE_SITE_VERIFICATION`

1. Copia solo el valor `content` del meta tag.
2. En Vercel `Production`, configura:

```env
GOOGLE_SITE_VERIFICATION="token-de-google"
```

3. Redeploy produccion.

No configures Search Console para staging.

### 4. Sitemap Enviado

Cuando la propiedad este verificada, envia:

```txt
https://saludintercultural.com/sitemap.xml
```

### 5. Dominio Final Verificado Por DNS

Con el dominio ya comprado:

1. Crea propiedad tipo `Domain`.
2. Verifica por DNS.
3. Reenvia el sitemap del dominio final.

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

Como hacerlo:

### 1. Numero Principal Confirmado

Confirma que `+59164175822` es correcto y puede recibir WhatsApp y llamadas.

### 2. Numero Alternativo Confirmado

Confirma que `+59162287251` es correcto y tambien puede recibir WhatsApp y llamadas.

### 3. Email Institucional Confirmado

Confirma que este correo es correcto:

```txt
medicina.tradicional.ea@gmail.com
```

### 4. Variables De Contacto En Staging

En Vercel `Preview`, aplicado a la rama `staging`, configura:

```env
NEXT_PUBLIC_WHATSAPP_NUMBER="+59164175822"
NEXT_PUBLIC_CALL_PHONE="+59164175822"
NEXT_PUBLIC_CONTACT_EMAIL="medicina.tradicional.ea@gmail.com"
```

### 5. Variables De Contacto En Produccion

En Vercel `Production`, configura las mismas variables:

```env
NEXT_PUBLIC_WHATSAPP_NUMBER="+59164175822"
NEXT_PUBLIC_CALL_PHONE="+59164175822"
NEXT_PUBLIC_CONTACT_EMAIL="medicina.tradicional.ea@gmail.com"
```

### 6. Prueba De Click En Staging

Abre staging y prueba:

1. Boton WhatsApp.
2. Boton llamada.
3. Link de email.
4. Formulario de contacto.

En mobile, WhatsApp debe abrir chat y llamada debe abrir el marcador telefonico.

### 7. Prueba De Click En Produccion

Abre:

```txt
https://saludintercultural.com
```

Repite las mismas pruebas de staging.

## 8. Google Maps

No requiere API key si solo usas un enlace publico a la ubicacion.

Checklist:

1. [x] Perfil o ubicacion confirmado en Google Maps.
2. [x] Link publico copiado.
3. [x] `NEXT_PUBLIC_GOOGLE_MAPS_URL` configurado en staging.
4. [x] `NEXT_PUBLIC_GOOGLE_MAPS_URL` configurado en produccion.
5. [x] CTA probado en staging.
6. [x] CTA probado en produccion.

Como hacerlo:

### 1. Perfil O Ubicacion Confirmado

Abre Google Maps y busca la ubicacion del consultorio.

### 2. Link Publico Copiado

Presiona `Compartir` y copia el enlace publico.

### 3. `NEXT_PUBLIC_GOOGLE_MAPS_URL` Configurado En Staging

En Vercel `Preview`, aplicado a la rama `staging`, configura:

```env
NEXT_PUBLIC_GOOGLE_MAPS_URL="https://maps.google.com/..."
```

### 4. `NEXT_PUBLIC_GOOGLE_MAPS_URL` Configurado En Produccion

En Vercel `Production`, configura el mismo link:

```env
NEXT_PUBLIC_GOOGLE_MAPS_URL="https://maps.google.com/..."
```

### 5. CTA Probado En Staging

Abre staging y confirma que el CTA de mapa lleva a la ubicacion correcta.

### 6. CTA Probado En Produccion

Abre produccion y confirma que el CTA de mapa lleva a la ubicacion correcta.

## 9. Dominio Y DNS

El dominio final comprado es `saludintercultural.com`. El proyecto queda preparado para usarlo como URL canonica de produccion.

Checklist:

1. [x] Dominio comprado.
2. [ ] Dominio agregado en Vercel.
3. [ ] DNS apuntando a Vercel.
4. [ ] SSL activo.
5. [x] `NEXT_PUBLIC_SITE_URL` documentado con el dominio final.
6. [x] `PAYLOAD_PUBLIC_SERVER_URL` documentado con el dominio final.
7. [ ] Search Console configurado para dominio final.
8. [ ] Analytics y Meta actualizados o revisados.
9. [ ] Sitemap reenviado.

Como hacerlo:

### 1. Dominio Comprado

Comprado en Cloudflare:

```txt
saludintercultural.com
```

### 2. Dominio Agregado En Vercel

En Vercel, ve a `Project` > `Settings` > `Domains` y agrega:

```txt
saludintercultural.com
www.saludintercultural.com
```

Configura `saludintercultural.com` como dominio primario. Si Vercel muestra valores DNS especificos para este proyecto, usa esos valores sobre los genericos.

### 3. DNS Apuntando A Vercel

En Cloudflare, crea o ajusta estos registros DNS:

```txt
Tipo  Nombre  Valor
A     @       76.76.21.21
CNAME www     cname.vercel-dns-0.com
```

Deja ambos registros en modo `DNS only` mientras Vercel valida el dominio y emite SSL. Si ya existen registros `A`, `AAAA` o `CNAME` para `@` o `www`, elimina los duplicados que apunten a otro hosting antes de validar.

### 4. SSL Activo

Espera a que Vercel active SSL para `saludintercultural.com` y `www.saludintercultural.com`. Luego confirma que ambos cargan con `https`.

### 5. `NEXT_PUBLIC_SITE_URL` Actualizado

En Vercel `Production`, cambia:

```env
NEXT_PUBLIC_SITE_URL="https://saludintercultural.com"
```

### 6. `PAYLOAD_PUBLIC_SERVER_URL` Actualizado

En Vercel `Production`, cambia:

```env
PAYLOAD_PUBLIC_SERVER_URL="https://saludintercultural.com"
```

Despues de cambiar variables, ejecuta un redeploy manual de Production.

### 7. Search Console Configurado

Crea una propiedad `Domain` para:

```txt
saludintercultural.com
```

Verifica por DNS en Cloudflare con el TXT que entregue Google. Cuando Google confirme propiedad, envia el sitemap del dominio final.

### 8. Analytics Y Meta Revisados

En GA4, actualiza el Web Stream a:

```txt
https://saludintercultural.com
```

En Meta Events Manager, revisa que el dominio del sitio sea `saludintercultural.com` si Meta solicita verificacion o configuracion de eventos.

### 9. Sitemap Reenviado

Envia:

```txt
https://saludintercultural.com/sitemap.xml
```
