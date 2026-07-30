# Variables De Entorno

Guia operativa para configurar variables locales, staging y produccion.

## Reglas Generales

- No subir archivos `.env` al repositorio.
- Mantener `.env.example` como plantilla sin secretos reales.
- Usar valores distintos para local, staging y produccion.
- Toda variable que empiece con `NEXT_PUBLIC_` queda expuesta al navegador.
- Secretos, credenciales, tokens y URLs privadas deben mantenerse sin prefijo publico.
- En Vercel, configurar variables por ambiente: Production y Preview.
- Operativamente, Preview Deployment desde rama `staging` se trata como staging.
- Flujo de ramas: `develop` para trabajo local, `staging` para revision publicada y `main` para produccion.

## Variables Publicas

Estas variables pueden estar disponibles en el cliente.

| Variable | Requerida operativamente | Ejemplo | Uso |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_APP_ENV` | Si | `local`, `test`, `staging` o `production` | Identificacion visible y verificable del ambiente. |
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

| Variable | Requerida operativamente | Ejemplo | Uso |
| --- | --- | --- | --- |
| `APP_ENV` | Si | `local`, `test`, `staging` o `production` | Identificacion privada; debe coincidir con la variable publica. |
| `DATABASE_ENVIRONMENT` | Si | `staging` | Etiqueta de ownership de la base. |
| `STORAGE_ENVIRONMENT` | Si | `staging` | Etiqueta de ownership del Blob Store. |
| `EXTERNAL_COMMUNICATIONS_MODE` | Si | `blocked` | Bloquea contacto real fuera de produccion. |
| `DATABASE_URL` | Si | `postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require` | Conexion de Prisma y Payload a Postgres. |
| `PAYLOAD_SECRET` | Si | valor aleatorio de 32+ caracteres | Firma de tokens y sesiones de Payload. Staging y producción no arrancan sin un valor fuerte. |
| `PAYLOAD_PUBLIC_SERVER_URL` | Si | `http://localhost:3000` | URL base que Payload usa para resolver servidor/admin. |
| `PAYLOAD_DB_SCHEMA` | Si | `payload` | Schema de Postgres usado por Payload. |
| `BLOB_READ_WRITE_TOKEN` | Produccion; opcional en local | token generado por Vercel Blob | Store productivo o storage Blob opcional de desarrollo. Staging no lo utiliza. |
| `STAGING_BLOB_READ_WRITE_TOKEN` | Solo staging | token generado con el prefijo `STAGING_BLOB` | Store exclusivo para media QA de staging. |
| `CLINICAL_FILES_STORAGE_DRIVER` | Sí | `local` o `vercel-blob` | Storage de adjuntos clínicos; local/test usan disco privado y despliegues usan Blob privado. |
| `CLINICAL_FILES_LOCAL_PATH` | Local y test | `.data/clinical-files` | Directorio ignorado por Git y fuera de `public/`. |
| `CLINICAL_BLOB_READ_WRITE_TOKEN` | Solo producción | token de un Blob Store privado | Contenido clínico productivo; no reutilizar el token de Payload. |
| `STAGING_CLINICAL_BLOB_READ_WRITE_TOKEN` | Solo staging | token de un Blob Store privado QA | Contenido clínico de staging, separado de producción y de Payload. |
| `ADMIN_EMAIL` | No | `admin@example.com` | Email para crear el primer admin con seed. |
| `ADMIN_PASSWORD` | No | clave temporal de seed | Password para crear o resetear el primer admin con seed. |
| `ADMIN_RESET_PASSWORD_ON_SEED` | No | `false` | Permite resetear el password de un admin existente durante seed cuando vale `true`. |
| `ADMIN_SESSION_SECONDS` | No | `28800` | Duracion de sesion admin. |
| `ADMIN_LOCK_MINUTES` | No | `10` | Bloqueo temporal tras intentos fallidos. |
| `INTERNAL_SESSION_SECONDS` | No | `28800` | Duracion de sesion interna de Sigeco. |
| `INTERNAL_LOCK_MINUTES` | No | `10` | Bloqueo temporal tras intentos fallidos en Sigeco. |
| `INTERNAL_ADMIN_EMAIL` | No | `sigeco-admin@example.com` | Email para crear el primer super administrador interno con `pnpm internal:seed`. |
| `INTERNAL_ADMIN_PASSWORD` | No | clave temporal de seed | Password para crear el primer super administrador interno con `pnpm internal:seed`. |
| `STAGING_QA_EMAIL_DOMAIN` | Solo staging | `staging.invalid` | Dominio reservado usado por cuentas QA. |
| `STAGING_QA_PASSWORD` | Solo staging | secreto de 20+ caracteres | Base privada para contraseñas QA diferentes por rol. |
| `BACKUP_DATABASE_URL` | Al crear una copia | URL de solo lectura | Conexión exclusiva para exportar PostgreSQL; no reutilizar la credencial de la aplicación en producción. |
| `BACKUP_CLINICAL_FILES_PATH` | Backup local | `.data/clinical-files` | Origen privado de los adjuntos incluidos en la copia local. |
| `BACKUP_OUTPUT_PATH` | No | `.data/backups/...sigeco-backup` | Destino local permitido para el paquete cifrado. |
| `BACKUP_ENCRYPTION_KEY` | Backup o restauración | secreto aleatorio de 32+ caracteres | Cifra y autentica el paquete; nunca se escribe en Git, logs ni argumentos. |
| `BACKUP_RESPONSIBLE` | Al crear una copia | nombre del responsable | Identifica quién ejecutó la operación sin guardar credenciales. |
| `BACKUP_FILE` | Al restaurar | `.data/backups/...sigeco-backup` | Paquete cifrado que se va a validar y restaurar. |
| `RESTORE_DATABASE_URL` | Al restaurar | base local `salud_intercultural_restore_*` | Destino nuevo y vacío; el comando local bloquea desarrollo, test, staging y producción. |
| `RESTORE_CLINICAL_FILES_PATH` | Al restaurar | `.data/restore-drills/...` | Directorio vacío donde se recuperan los adjuntos. |
| `RESTORE_CONFIRMATION` | Al restaurar | `RESTORE_<base>` | Confirmación exacta que evita ejecutar la restauración sobre un destino equivocado. |
| `GOOGLE_SITE_VERIFICATION` | No | token de Search Console | Verificacion de propiedad en Google. |
| `RATE_LIMIT_MAX` | No | `10` | Limite de envios por ventana para leads. |
| `RATE_LIMIT_WINDOW_SECONDS` | No | `60` | Ventana de rate limit para leads. |
| `CMS_READS_DURING_BUILD` | No | `false` | Permite lecturas CMS durante build si se cambia a `true`. |
| `ALLOW_REMOTE_DB_RESET` | No | `false` | Override operativo para `pnpm db:reset` contra una base remota no productiva aprobada explicitamente. |
| `PATIENT_CONSENT_PRODUCTION_TEXT_VERSION` | Solo producción, después de aprobación | `v1` | Gate explícito: producción no arranca hasta que Dirección apruebe exactamente esa versión de los textos. |
| `CASH_CLOSE_APPROVAL_THRESHOLD_CENTS` | No | `2000` | Diferencia máxima por canal que Administración puede cerrar sin Dirección; 2000 equivale a Bs 20 y el valor productivo requiere aprobación. |

Nota de contacto: `+59164175822` es el numero principal. `+59162287251` queda como numero alternativo; ambos pueden recibir WhatsApp y llamadas.

## Local

Local es la computadora de desarrollo sobre la rama `develop`.

1. Levantar PostgreSQL local con Docker:

```bash
docker compose up -d postgres
```

2. Copiar `.env.local.example` a `.env`.
3. Confirmar que `DATABASE_URL` apunte a `salud_intercultural_dev`.
4. Para reemplazar el secreto local de ejemplo, generar `PAYLOAD_SECRET`:

```bash
openssl rand -base64 32
```

5. Configurar como minimo:

```env
APP_ENV="local"
NEXT_PUBLIC_APP_ENV="local"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
NEXT_PUBLIC_SITE_NAME="Salud Intercultural"
DATABASE_ENVIRONMENT="local"
DATABASE_URL="postgresql://salud_intercultural:salud_intercultural@localhost:5432/salud_intercultural_dev?schema=public"
PAYLOAD_SECRET="local-development-secret-change-me"
PAYLOAD_PUBLIC_SERVER_URL="http://localhost:3000"
PAYLOAD_DB_SCHEMA="payload"
STORAGE_ENVIRONMENT="local"
BLOB_READ_WRITE_TOKEN=""
CLINICAL_FILES_STORAGE_DRIVER="local"
CLINICAL_FILES_LOCAL_PATH=".data/clinical-files"
EXTERNAL_COMMUNICATIONS_MODE="blocked"
CMS_READS_DURING_BUILD="false"
```

6. Dejar `BLOB_READ_WRITE_TOKEN` vacío en local si se quiere usar storage
   editorial en `public/media`. Los adjuntos clínicos siempre van a
   `.data/clinical-files`, nunca a ese directorio público.
7. Ejecutar seeds cuando corresponda:

```bash
pnpm seed
```

`pnpm seed` carga solo el seed canonico de Payload.

Para probar recuperación completa en dos bases sintéticas y aisladas:

```bash
pnpm backup:drill:local
```

La guía completa, las variables temporales y las reglas de eliminación están en
[Backup y restauración de SIGECO](./backup-restore.md).

## Test Local

Los tests con base real deben usar `salud_intercultural_test`, no la base de desarrollo, staging ni produccion.

1. Copiar `.env.test.example` a `.env.test`.
2. Confirmar que `DATABASE_URL` apunte a `salud_intercultural_test`.
3. Confirmar que `PAYLOAD_DB_SCHEMA` use `payload_test`.
4. Cargar `.env.test` explicitamente cuando un comando necesite variables de test:

```bash
pnpm test:integration
```

Reglas:

- `pnpm test` debe seguir siendo la suite rapida sin preparar DB real.
- Tests de integracion deben cargarse con `.env.test`.
- `pnpm test:db:reset` solo permite resetear `salud_intercultural_test` en host local.
- Tests no deben usar `.env.staging`, `.env.production.local` ni una URL remota de Neon/Vercel salvo decision explicita y documentada.

## Safety Rails De DB

Los comandos destructivos pasan por validacion de ambiente.

`pnpm db:reset` permite por defecto:

- Hosts locales: `localhost`, `127.0.0.1`, `::1`, `host.docker.internal` o `postgres`.
- Bases: `salud_intercultural_dev` o `salud_intercultural_test`.

`pnpm db:reset` bloquea:

- `NEXT_PUBLIC_SITE_URL` con `saludintercultural.com`.
- `DATABASE_URL` que referencie `saludintercultural.com`.
- Hosts gestionados/remotos conocidos como Neon o Vercel.
- Bases con nombres que parezcan `staging`, `prod` o `production`.

`ALLOW_REMOTE_DB_RESET=true` solo salta la restriccion de host no local para una base remota no productiva aprobada explicitamente. No salta bloqueos de dominio protegido, Neon/Vercel ni nombres staging/produccion.

## Staging En Vercel

Staging corre como Preview Deployment desde rama `staging`.

Valores esperados:

```env
APP_ENV="staging"
NEXT_PUBLIC_APP_ENV="staging"
NEXT_PUBLIC_SITE_URL="https://staging.saludintercultural.com"
PAYLOAD_PUBLIC_SERVER_URL="https://staging.saludintercultural.com"
DATABASE_ENVIRONMENT="staging"
DATABASE_URL="postgresql://STAGING_USER:STAGING_PASSWORD@STAGING_HOST/salud_intercultural_staging?sslmode=require"
PAYLOAD_DB_SCHEMA="payload_staging"
STORAGE_ENVIRONMENT="staging"
STAGING_BLOB_READ_WRITE_TOKEN="TOKEN_EXCLUSIVO_DE_STAGING"
CLINICAL_FILES_STORAGE_DRIVER="vercel-blob"
STAGING_CLINICAL_BLOB_READ_WRITE_TOKEN="TOKEN_DE_STORE_CLINICO_PRIVADO_STAGING"
EXTERNAL_COMMUNICATIONS_MODE="blocked"
NEXT_PUBLIC_GA_ID=""
NEXT_PUBLIC_META_PIXEL_ID=""
CMS_READS_DURING_BUILD="false"
```

Recomendaciones:

- Usar siempre una base separada; no es opcional.
- Usar siempre un Blob Store y token separados.
- Crear otro Blob Store privado para adjuntos clínicos; no reutilizar el store
  público de Payload.
- Aplicar variables Preview unicamente a la rama `staging`.
- Ejecutar `pnpm staging:check`, `pnpm staging:seed` y `pnpm staging:verify`.
- Seguir [staging aislado](./staging.md).

## Produccion En Vercel

Produccion corre desde `main`.

Valores esperados:

```env
APP_ENV="production"
NEXT_PUBLIC_APP_ENV="production"
NEXT_PUBLIC_SITE_URL="https://saludintercultural.com"
PAYLOAD_PUBLIC_SERVER_URL="https://saludintercultural.com"
DATABASE_ENVIRONMENT="production"
DATABASE_URL="postgresql://PROD_USER:PROD_PASSWORD@PROD_HOST/PROD_DB?sslmode=require"
PAYLOAD_DB_SCHEMA="payload"
STORAGE_ENVIRONMENT="production"
CLINICAL_FILES_STORAGE_DRIVER="vercel-blob"
CLINICAL_BLOB_READ_WRITE_TOKEN="TOKEN_DE_STORE_CLINICO_PRIVADO_PRODUCCION"
EXTERNAL_COMMUNICATIONS_MODE="enabled"
CMS_READS_DURING_BUILD="false"
```

La URL estable de Vercel puede seguir respondiendo como alias tecnico, pero no debe configurarse como URL canonica. El control de entorno productivo exige:

```env
NEXT_PUBLIC_SITE_URL="https://saludintercultural.com"
PAYLOAD_PUBLIC_SERVER_URL="https://saludintercultural.com"
```

Despues de cambiar dominio en Vercel, revisar `robots.ts`, `sitemap.ts`, Search Console, Analytics y Meta Pixel.

## Media

Payload selecciona el token Blob según el ambiente:

- Produccion usa `BLOB_READ_WRITE_TOKEN`.
- Staging usa `STAGING_BLOB_READ_WRITE_TOKEN`.
- Local puede usar `BLOB_READ_WRITE_TOKEN`; si esta vacio usa `public/media`.
- Los tokens de produccion y staging nunca deben compartir alcance.
- La collection `media` acepta `image/*` y `video/*`.
- Las imagenes servidas desde `*.public.blob.vercel-storage.com` estan permitidas en `next/image`.
- Los videos deben insertarse como archivo/media o URL de video, no mediante `next/image`.

## Configuracion Vercel

```txt
Framework preset: Next.js
Install command: pnpm install
Build command: pnpm run build
Output directory: Next.js default
Node.js version: 22.x
Production branch: main
Preview/Staging branch: staging
```

## Checklist De Deploy

1. Ejecutar `pnpm env:check`.
2. Verificar `APP_ENV`, `NEXT_PUBLIC_APP_ENV`, base, storage y comunicaciones.
3. Verificar `NEXT_PUBLIC_SITE_URL` y `PAYLOAD_PUBLIC_SERVER_URL` con el dominio del ambiente.
4. Verificar `PAYLOAD_SECRET`; usar 32+ caracteres en produccion.
5. Verificar `DATABASE_URL`, `PAYLOAD_DB_SCHEMA` y migraciones.
6. Verificar `BLOB_READ_WRITE_TOKEN` en produccion y `STAGING_BLOB_READ_WRITE_TOKEN` en staging.
7. Verificar el token del Blob Store clínico privado y confirmar que no
   coincide con el store editorial.
8. Verificar `NEXT_PUBLIC_WHATSAPP_NUMBER`, `NEXT_PUBLIC_CALL_PHONE`, email y Maps.
8. Verificar `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_META_PIXEL_ID` y `GOOGLE_SITE_VERIFICATION` si aplican.
9. Ejecutar `pnpm lint`, `pnpm test`, `pnpm typecheck` y `pnpm run build`.
10. Revisar logs de Vercel: Build Logs, Runtime Logs y Function Logs de `/api/leads` y Payload.

## Validacion Con Zod

La validacion esta centralizada en `src/lib/env.ts`.

- `publicEnvSchema` valida variables expuestas al navegador.
- `privateEnvSchema` valida secretos, base de datos, admin y seguridad.
- `envSchema` combina ambas.
- Los strings vacios se tratan como variables no configuradas para evitar errores con campos opcionales.
- `PAYLOAD_SECRET` se valida con minimo tecnico de 12 caracteres; operativamente se recomiendan 32+ en produccion.
- GA4, Meta Pixel, emails, telefonos y URLs tienen validaciones de formato.
- `ADMIN_PASSWORD` se valida operacionalmente en el flujo de seed para no bloquear builds publicos.

## Seguridad

- No commitear `.env`, `.env.staging` ni `.env.production.local`.
- No usar variables con prefijo `NEXT_PUBLIC_` para secretos.
- Rotar cualquier secreto compartido por chat, capturas, correo, tickets o commits.
- Consultar [Permisos, privacidad, logs y secretos](./permissions-privacy-secrets.md)
  para propietarios, frecuencia y procedimiento de rotación.
