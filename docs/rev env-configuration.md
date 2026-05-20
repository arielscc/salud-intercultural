# Variables De Entorno Y Configuracion

Esta guia estandariza la configuracion local, staging y produccion para la V2.

## Reglas Generales

- No subir archivos `.env` al repositorio.
- Mantener `.env.example` como plantilla sin secretos reales.
- Usar valores distintos para local, staging y produccion.
- Toda variable que empiece con `NEXT_PUBLIC_` queda expuesta al navegador.
- Secretos, credenciales, tokens y URLs privadas deben mantenerse sin prefijo publico.
- En Vercel, configurar variables por ambiente: Production y Preview. Operativamente, el ambiente Preview de Vercel se usara como `staging`.
- El flujo de ramas sera: `develop` para trabajo local, `staging` para revision publicada y `main` para produccion.

## Variables Publicas

Estas variables pueden estar disponibles en el cliente.

| Variable | Requerida | Ejemplo | Uso |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Si | `http://localhost:3000` | URL canonica para SEO, sitemap, Open Graph y enlaces absolutos. |
| `NEXT_PUBLIC_SITE_NAME` | Si | `Salud Intercultural` | Nombre publico del sitio. |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Si | `+59164175822` | CTA de WhatsApp principal. |
| `NEXT_PUBLIC_CALL_PHONE` | Si | `+59164175822` | CTA de llamada principal. |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Si | `medicina.tradicional.ea@gmail.com` | Email publico de contacto. |
| `NEXT_PUBLIC_GOOGLE_MAPS_URL` | No | `https://maps.google.com/...` | Enlace publico a Google Maps. |
| `NEXT_PUBLIC_GA_ID` | No | `G-XXXXXXXXXX` | Google Analytics 4. |
| `NEXT_PUBLIC_META_PIXEL_ID` | No | `1234567890` | Meta Pixel. |

## Variables Privadas

Estas variables no deben exponerse al navegador.

| Variable | Requerida | Ejemplo | Uso |
| --- | --- | --- | --- |
| `DATABASE_URL` | Si | `postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require` | Conexion de Prisma y Payload a Postgres. |
| `PAYLOAD_SECRET` | Si | valor aleatorio de 32+ caracteres | Firma de tokens y sesiones de Payload. |
| `PAYLOAD_PUBLIC_SERVER_URL` | Si | `http://localhost:3000` | URL base que Payload usa para resolver servidor/admin. |
| `PAYLOAD_DB_SCHEMA` | Si | `payload` | Schema de Postgres usado por Payload. |
| `ADMIN_EMAIL` | No | `admin@example.com` | Email para crear el primer admin con seed. |
| `ADMIN_PASSWORD` | No | clave temporal de seed | Password para crear o resetear el primer admin con seed. Puede ser corto en staging, pero no debe usarse como password real de produccion. |
| `ADMIN_RESET_PASSWORD_ON_SEED` | No | `false` | Permite resetear el password de un admin existente durante seed cuando vale `true`. |
| `ADMIN_SESSION_SECONDS` | No | `28800` | Duracion de sesion admin. |
| `ADMIN_LOCK_MINUTES` | No | `10` | Bloqueo temporal tras intentos fallidos. |
| `GOOGLE_SITE_VERIFICATION` | No | token de Search Console | Verificacion de propiedad en Google. |
| `RATE_LIMIT_MAX` | No | `10` | Limite de envios por ventana para leads. |
| `RATE_LIMIT_WINDOW_SECONDS` | No | `60` | Ventana de rate limit para leads. |
| `CMS_READS_DURING_BUILD` | No | `false` | Permite lecturas CMS durante build si se cambia a `true`. |

Nota de contacto: `+59164175822` es el numero principal. `+59162287251` queda como numero alternativo; ambos pueden recibir WhatsApp y llamadas.

## Local

Local es tu computadora trabajando sobre la rama `develop`. Aqui se programa, se prueba con `pnpm dev`, se ejecutan validaciones y se revisan cambios antes de subirlos a staging.

1. Copia `.env.example` a `.env`.
2. Configura `DATABASE_URL` apuntando a una base local o Neon de desarrollo.
3. Genera `PAYLOAD_SECRET`:

```bash
openssl rand -base64 32
```

4. Usa:

```env
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
PAYLOAD_PUBLIC_SERVER_URL="http://localhost:3000"
CMS_READS_DURING_BUILD="false"
```

5. Ejecuta los seeds cuando corresponda:

```bash
pnpm seed
```

## Staging En Vercel

Usa staging para probar cambios antes de produccion. En Git sera la rama `staging`. En Vercel, este ambiente se implementa con un Preview Deployment generado desde la rama `staging`, pero en la documentacion y operacion del proyecto lo llamaremos solo `staging`.

```env
NEXT_PUBLIC_SITE_URL="https://staging-salud-intercultural.vercel.app"
PAYLOAD_PUBLIC_SERVER_URL="https://staging-salud-intercultural.vercel.app"
CMS_READS_DURING_BUILD="false"
```

Recomendacion: usar una base de datos separada para staging si vas a probar cambios destructivos o seeds.

Flujo para promover cambios:

```bash
git checkout develop
pnpm lint
pnpm typecheck
pnpm build
git checkout staging
git merge develop
git push origin staging
```

## Produccion En Vercel

Mientras no tengas dominio comprado, usa la URL estable de Vercel como URL publica:

```env
NEXT_PUBLIC_SITE_URL="https://salud-intercultural.vercel.app"
PAYLOAD_PUBLIC_SERVER_URL="https://salud-intercultural.vercel.app"
```

Cuando compres el dominio, cambia ambas variables al dominio final:

```env
NEXT_PUBLIC_SITE_URL="https://tudominio.com"
PAYLOAD_PUBLIC_SERVER_URL="https://tudominio.com"
```

Tambien debes revisar `robots.ts`, `sitemap.ts`, Search Console, Analytics y Meta Pixel despues de cambiar dominio.

Produccion se actualiza solo desde `main`. Cuando staging este aprobado:

```bash
git checkout main
git merge staging
git push origin main
```

## Validacion Con Zod

La validacion esta centralizada en `src/lib/env.ts`.

- `publicEnvSchema` valida variables expuestas al navegador.
- `privateEnvSchema` valida secretos, base de datos, admin y seguridad.
- `envSchema` combina ambas.
- Los strings vacios se tratan como variables no configuradas para evitar errores con campos opcionales.
- `PAYLOAD_SECRET`, GA4, Meta Pixel, emails, telefonos y URLs tienen validaciones de formato. `ADMIN_PASSWORD` se valida operacionalmente en el flujo de seed para no bloquear builds publicos.

## Recomendacion De Seguridad

Si una credencial real fue compartida por chat, correo, ticket, captura o commit, considerala expuesta. Rotala en el proveedor correspondiente y actualiza Vercel/local inmediatamente.
