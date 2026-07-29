# Staging Aislado

Guia para preparar, validar, sembrar y reiniciar staging sin tocar produccion ni contactar pacientes.

## Recursos Separados

| Recurso | Staging | Produccion |
| --- | --- | --- |
| Aplicacion | rama `staging`, dominio `staging.saludintercultural.com` | rama `main`, dominio `saludintercultural.com` |
| PostgreSQL | base cuyo nombre contiene `staging` | base productiva separada |
| Payload | schema `payload_staging` | schema productivo |
| Media | Blob Store y token exclusivos | Blob Store y token productivos |
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
- exige comunicaciones bloqueadas;
- rechaza GA4, Meta Pixel y Search Console.

Prisma y Payload validan lo mismo antes de conectarse. Payload agrega el prefijo `staging/` a la media como defensa adicional.

La aplicacion muestra permanentemente:

```txt
STAGING · DATOS SINTETICOS · CONTACTOS BLOQUEADOS
```

En el sitio publico, SIGECO y Payload se bloquean los enlaces de WhatsApp, llamada, SMS y correo. Las variables de contacto tambien deben ser sinteticas.

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

### Secretos

Generar valores nuevos para:

- `PAYLOAD_SECRET`;
- administrador QA de Payload;
- `STAGING_QA_PASSWORD`;
- PostgreSQL;
- Vercel Blob.

No usar datos o contraseñas de empleados y pacientes.

### Variables De Vercel

Usar [.env.staging.example](../../.env.staging.example) como lista de control. Las variables Preview con secretos de staging deben limitarse a la rama `staging`; otros previews no deben heredarlas.

Activar el control de acceso del proveedor de hosting para que staging no sea un sitio publico. Solo el equipo y las personas autorizadas para QA deben poder abrirlo.

Validar sin imprimir secretos:

```bash
pnpm staging:check
```

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
| Seguimiento | `qa.seguimiento@staging.invalid` |

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
