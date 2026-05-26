# Errores Comunes

## `DATABASE_URL` no configurado

Sintoma:

```txt
Cannot resolve environment variable: DATABASE_URL
```

Solucion:

1. Configurar `DATABASE_URL` en `.env` o en Vercel.
2. Confirmar que use PostgreSQL.
3. En Neon/Vercel Postgres, usar `sslmode=require` cuando aplique.

## Payload No Carga Contenido CMS

Sintoma:

- El sitio muestra fallback local.
- No aparece contenido administrado.

Revisar:

1. `DATABASE_URL`.
2. `PAYLOAD_SECRET`.
3. `PAYLOAD_DB_SCHEMA`.
4. Conectividad a PostgreSQL.
5. Logs de Vercel o consola local.

El fallback esta implementado para que el sitio publico no se caiga si CMS no esta disponible.

## Uploads De Media No Persisten

Sintoma:

- Imaegenes o videos subidos desde Payload no aparecen tras redeploy.

Solucion:

1. Configurar `BLOB_READ_WRITE_TOKEN` en Vercel.
2. Hacer redeploy.
3. Confirmar que el Blob Store estao conectado al proyecto.

Sin `BLOB_READ_WRITE_TOKEN`, local usa `public/media`; Vercel necesita storage persistente.

## `next/image` Rechaza Imagen De Blob

Sintoma:

```txt
Invalid src prop ... hostname is not configured
```

Solucion:

1. Confirmar que la URL pertenece a `*.public.blob.vercel-storage.com`.
2. Revisar `next.config.mjs`.
3. Redeploy.

## Leads Devuelven `500`

Sintoma:

- Formulario vaelido responde error genaorico.

Revisar:

1. `DATABASE_URL`.
2. Migraciones aplicadas.
3. Logs de `/api/leads`.
4. Tabla/modelo `Lead`.

Payload invaelido debe responder `400`; rate limit debe responder `429`.

## Admin No Permite Login

Revisar:

1. Usuario existe en `users`.
2. `PAYLOAD_SECRET` no cambia inesperadamente.
3. Cookies seguras en produccion.
4. `ADMIN_SESSION_SECONDS` y `ADMIN_LOCK_MINUTES`.
5. Si el usuario fue bloqueado por intentos fallidos.

## Build Se Queda O Falla

Revisar:

1. Ejecutar `rm -rf .next` y repetir.
2. Confirmar `DATABASE_URL`.
3. Confirmar que `CMS_READS_DURING_BUILD="false"` si no se quiere leer CMS durante build.
4. Ejecutar `pnpm typecheck` para aislar errores TypeScript.

## Sitemap O Canonicals Incorrectos

Revisar:

1. `NEXT_PUBLIC_SITE_URL`.
2. `src/lib/seo.ts`.
3. `src/app/sitemap.ts`.
4. Redeploy despuaos de cambiar variables.
