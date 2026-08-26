# Staging Aislado

Guia para preparar, validar, sembrar y reiniciar staging sin tocar produccion ni contactar pacientes.

## Recursos Separados

| Recurso | Staging | Produccion |
| --- | --- | --- |
| Aplicacion | rama `staging`, dominio `staging.saludintercultural.com` | rama `main`, dominio `saludintercultural.com` |
| PostgreSQL | base cuyo nombre contiene `staging` | base productiva separada |
| Payload | schema `payload_staging` | schema productivo |
| Media | Blob Store y token exclusivos | Blob Store y token productivos |
| Adjuntos clínicos | Blob Store privado exclusivo | Blob Store privado productivo separado |
| Secretos | valores exclusivos | valores productivos diferentes |
| Comunicaciones | bloqueadas | habilitadas explicitamente |
| Analytics | desactivado | propiedades oficiales |
| Datos | sinteticos | reales |

Compartir una cuenta del proveedor no significa compartir recursos. La base, el Blob Store, sus credenciales y sus variables deben ser diferentes.

## Barreras Ejecutables

`pnpm env:check` corre antes de cada build. Cuando detecta staging:

- exige `APP_ENV=staging` y `NEXT_PUBLIC_APP_ENV=staging`;
- acepta unicamente el dominio oficial de staging;
- exige una base cuyo nombre contenga `staging` y rechaza marcadores productivos;
- exige `DATABASE_ENVIRONMENT=staging`;
- exige un schema Payload separado;
- exige un token Blob y `STORAGE_ENVIRONMENT=staging`;
- exige `STAGING_CLINICAL_BLOB_READ_WRITE_TOKEN` para un store clínico privado;
- exige comunicaciones bloqueadas;
- rechaza GA4, Meta Pixel y Search Console.

Prisma y Payload validan lo mismo antes de conectarse. Payload agrega el prefijo `staging/` a la media como defensa adicional.

La aplicacion muestra permanentemente:

```txt
STAGING · DATOS SINTETICOS · CONTACTOS BLOQUEADOS
```

En el sitio publico, SIGECO y Payload se bloquean los enlaces de WhatsApp, llamada, SMS y correo. Las variables de contacto tambien deben ser sinteticas.

## Ensayo De La Etapa 1

Una vez que `pnpm staging:check` pase y las migraciones esten aplicadas:

```bash
REHEARSAL_CONFIRM=salud_intercultural_staging pnpm staging:rehearse
```

`staging:rehearse` valida el aislamiento antes de correr y apunta a
`.env.staging`. Existen tambien `staging:stage-one:check`, que revisa si la base
esta lista para la Etapa 1, y `staging:modules`, para encender o apagar modulos
en staging.

Recorre los once pasos que Administracion hace el primer dia real —encender los
modulos de la Etapa 1, producto con stock, abrir Caja, registrar un cliente sin
visita, vender, cobrar, emitir el recibo, registrar un egreso, comprar y recibir
con lote, suspender y reactivar un modulo, y cerrar Caja— y verifica cada uno.
Falla si aparece cualquier diferencia en el cierre.

Solo corre contra bases cuyo nombre contenga `staging`, `test` o `dev`, y exige
escribir el nombre a mano. Todo lo que crea lleva el prefijo `ENSAYO-<fecha>`.

## Preparacion

### PostgreSQL

Crear una base exclusiva, por ejemplo `salud_intercultural_staging`. Su usuario solo debe tener permisos sobre esa base. No reutilizar credenciales productivas.

### Vercel Blob

Crear un Blob Store exclusivo con el prefijo personalizado `STAGING_BLOB`.
Vercel generará `STAGING_BLOB_READ_WRITE_TOKEN`. Aplicarlo solo a Preview de
la rama `staging`.

Producción conserva `BLOB_READ_WRITE_TOKEN`. SIGECO selecciona el token según
el ambiente y nunca usa el token productivo para guardar media de staging.
Después de conectar el store, retirar cualquier alcance Production de
`STAGING_BLOB_READ_WRITE_TOKEN` y cualquier alcance Preview de
`BLOB_READ_WRITE_TOKEN`.

Crear un segundo Blob Store con acceso **private** para adjuntos clínicos.
Configurar su token como `STAGING_CLINICAL_BLOB_READ_WRITE_TOKEN`. No debe ser
el store público de media ni el store clínico de producción.

### Secretos

Generar valores nuevos para:

- `PAYLOAD_SECRET`;
- `PAYLOAD_SIGECO_INTEGRATION_SECRET`, distinto de `PAYLOAD_SECRET`;
- administrador QA de Payload;
- `STAGING_QA_PASSWORD`;
- PostgreSQL;
- Vercel Blob.
- Vercel Blob privado para adjuntos clínicos.

No usar datos o contraseñas de empleados y pacientes.

### Como Generar Los Dos Secretos Que Faltan

#### `STAGING_CLINICAL_BLOB_READ_WRITE_TOKEN`

Es el token de un **segundo** Blob Store, distinto del de media. Los adjuntos se
suben con `access: "private"`, pero el store separado es lo que impide que un
token filtrado de media alcance historia clinica.

1. En Vercel: **Storage → Create Database → Blob**.
2. Nombre sugerido: `sigeco-clinical-staging`.
3. En **Advanced options**, poner el prefijo de variable
   `STAGING_CLINICAL_BLOB`. Vercel crea
   `STAGING_CLINICAL_BLOB_READ_WRITE_TOKEN`.
4. Conectarlo al proyecto **solo con alcance Preview**, limitado a la rama
   `staging`. Retirar cualquier alcance Production.
5. Copiar el token a `.env.staging` para poder correr los scripts locales.

Con la CLI:

```bash
vercel blob store add sigeco-clinical-staging
vercel env pull .env.staging.vercel --environment=preview --git-branch=staging
```

El validador rechaza el arranque si el token esta vacio o si **es igual a**
`STAGING_BLOB_READ_WRITE_TOKEN`: tienen que ser dos stores distintos.

#### `PAYLOAD_SIGECO_INTEGRATION_SECRET`

Es una cadena aleatoria, no un token de servicio. Autentica el contrato entre
Payload y SIGECO para las campanas de marketing.

```bash
openssl rand -hex 32
```

Conviene hexadecimal: el validador rechaza cualquier valor que contenga
`development`, `local`, `example`, `changeme`, `placeholder`, `ci-only` o
`test-only`, y un hexadecimal no puede formar esas palabras por accidente.

Reglas que aplica el validador:

- al menos 32 caracteres;
- distinto de `PAYLOAD_SECRET`;
- sin palabras de desarrollo o marcadores de posicion.

Staging y produccion llevan valores **diferentes**.

#### Verificar

```bash
pnpm staging:check
```

Tiene que terminar sin error antes de desplegar o migrar.

### Variables De Vercel

`.env.staging` es la fuente de verdad. Vercel se sincroniza desde ahí, no a mano:

```bash
pnpm staging:sync-vercel --dry-run   # muestra qué empujaría
pnpm staging:sync-vercel             # empuja y verifica
```

El script valida el archivo local contra el contrato de aislamiento antes de
escribir, empuja las catorce variables que el build lee, y despues verifica tres
cosas: que Vercel devuelva los mismos valores, que no haya analitica de
produccion, y que ninguna alcance a otra rama.

Ese ultimo punto no es opcional. Preview cubre **todas** las ramas, y una preview
de `develop` deduce entorno `test`: si heredara `APP_ENV=staging` chocaria con esa
deduccion y ninguna preview de develop volveria a compilar. Por eso van acotadas
a la rama `staging`.

El script no borra variables. Si reporta analitica o una variable sin acotar, hay
que corregirla desde el panel de Vercel.

Vercel no reconstruye al cambiar variables: despues de sincronizar hay que
redesplegar con `vercel redeploy <url>`. Un `vercel deploy` a secas no sirve,
porque sube el arbol de trabajo local sin metadata de rama y no recibe ninguna de
las variables acotadas.

Activar el control de acceso del proveedor de hosting para que staging no sea un
sitio publico. Solo el equipo y las personas autorizadas para QA deben poder
abrirlo.

Validar el archivo local sin imprimir secretos:

```bash
pnpm staging:check
```

`staging:check` valida **el archivo**, no lo que tiene Vercel. Los dos se
comparan solo en `staging:sync-vercel`.

## Migraciones Y Datos QA

Aplicar migraciones:

```bash
pnpm staging:migrate
```

Cargar contenido CMS, cuentas QA y datos sinteticos:

```bash
pnpm staging:seed
```

Verificar recursos, cuentas y fixtures:

```bash
pnpm staging:verify
```

El seed crea bandejas sinteticas para recepcion, consulta, enfermeria, administracion y seguimiento, ademas de un producto QA con stock bajo.

### Cuentas QA

| Rol | Correo |
| --- | --- |
| Super administrador | `qa.super_admin@staging.invalid` |
| Direccion | `qa.direccion@staging.invalid` |
| Medico | `qa.medico@staging.invalid` |
| Recepcion | `qa.recepcion@staging.invalid` |
| Administracion | `qa.administracion@staging.invalid` |
| Enfermeria | `qa.enfermeria@staging.invalid` |

El seed usa los roles asignables, por lo que no crea cuenta para los roles
retirados `captacion` ni `seguimiento` (este último se retiró el 2026-08-02 y su
trabajo lo hace Recepción).

`.invalid` es un dominio reservado y no recibe correo. Cada contraseña se forma internamente como:

```txt
STAGING_QA_PASSWORD:<rol>
```

El seed no imprime contraseñas. La base debe tener al menos 20 caracteres y permanecer en el gestor de secretos. El rol deprecado `captacion` no recibe cuenta.

## Reinicio Completo

El reinicio elimina el schema Payload de staging, reinicia Prisma, aplica migraciones y restaura datos sinteticos. Requiere confirmacion exacta:

```bash
CONFIRM_STAGING_RESET=RESET-SIGECO-STAGING pnpm staging:reset
```

Antes de ejecutarlo:

1. Confirmar que `pnpm staging:check` pasa.
2. Revisar el nombre de la base en el proveedor.
3. Confirmar que no es produccion.
4. Avisar a quienes hacen QA.
5. Guardar evidencia o backup de pruebas que deban conservarse.

El reset no borra objetos remotos del Blob Store. Esos archivos se limpian desde el proveedor despues de confirmar que el store pertenece a staging.

## Verificacion Manual

Despues de cada deploy:

1. Confirmar la marca `STAGING` en 390 px y escritorio.
2. Entrar con las siete cuentas QA.
3. Confirmar que cada rol ve solo sus modulos.
4. Revisar las cinco bandejas sinteticas.
5. Pulsar WhatsApp y llamada; debe aparecer `CONTACTO REAL BLOQUEADO`.
6. Confirmar que GA4 y Meta no cargan.
7. Subir una imagen QA y comprobar el Blob Store de staging.
8. Ejecutar `pnpm staging:verify`.

No promover a produccion si una comprobacion falla.

## Prohibiciones

- Importar pacientes reales.
- Reutilizar base, secreto Payload o token Blob de produccion.
- Habilitar comunicaciones para una prueba.
- Configurar analytics productivo.
- Usar telefonos o correos reales en fixtures.
- Ejecutar `pnpm db:reset` directamente contra recursos remotos.
