# Adjuntos Clínicos Seguros

Esta guía explica cómo SIGECO guarda resultados, fotografías y documentos
clínicos sin utilizar la media pública de Payload.

## Qué Problema Resuelve

Un adjunto puede contener el nombre del paciente, un resultado o información
de salud. Por eso:

- no se guarda dentro de `public/`;
- no se entrega mediante una URL pública;
- no se comparte con Payload, marketing o analytics;
- no se usa el nombre original como ruta de almacenamiento;
- cada lectura requiere sesión y permiso;
- la carga, lectura y eliminación quedan auditadas.

## Permisos

| Rol | Ver | Subir | Eliminar |
| --- | --- | --- | --- |
| Super administrador | Sí | Sí | Sí |
| Dirección | Sí | No | No |
| Médico | Sí | Sí | No |
| Enfermería | Sí | Sí | No |
| Recepción | No | No | No |
| Administración | No | No | No |

La eliminación queda reservada al super administrador. El contenido se borra
del storage, pero la metadata se conserva con estado `deleted`, fecha y
responsable.

## Archivos Permitidos

- PDF completo.
- JPG o JPEG.
- PNG.
- WebP.
- Hasta 4 MB por archivo.
- Hasta 8 archivos por selección.

El servidor no confía solo en la extensión o en el tipo informado por el
navegador. Compara la firma real del contenido, la extensión, el MIME, el
tamaño y el nombre. También calcula SHA-256 y vuelve a comprobarlo antes de
cada entrega.

No se admiten Word, Excel, ZIP, SVG, ejecutables, audio o video. Un archivo
rechazado nunca se escribe en el storage.

## Carga Web Y Móvil

La ficha del paciente muestra el panel únicamente a roles autorizados.

- En web se pueden elegir varios archivos y ver el progreso individual.
- En móvil se puede abrir la cámara trasera.
- Las fotografías JPG mayores a 1,5 MB se reducen hasta 2200 px y calidad 82 %
  cuando la versión comprimida pesa menos.
- Cada archivo recibe un `uploadRequestId` aleatorio. Si se corta la conexión,
  el botón de reintento usa la misma clave y no crea un duplicado.
- El archivo puede relacionarse con el paciente, una visita y un estudio. El
  servidor comprueba que todos pertenecen al mismo paciente.

## Acceso Temporal

La interfaz solicita una concesión de dos minutos y un solo uso.

1. El servidor valida sesión y `attachments_read`.
2. Genera un token aleatorio y guarda únicamente su hash.
3. El navegador envía el token mediante `POST`; nunca aparece en la URL.
4. El servidor consume la concesión, lee el archivo privado y valida tamaño y
   checksum.
5. La respuesta usa `no-store`, `no-referrer`, `nosniff` y nombre genérico.

Una segunda lectura, una concesión vencida, otro usuario o un rol incorrecto
son rechazados. La vista previa usa un `blob:` temporal dentro del navegador y
se revoca al cerrarla.

## Storage Por Ambiente

| Ambiente | Driver | Ubicación |
| --- | --- | --- |
| Local | `local` | `.data/clinical-files`, ignorado por Git y fuera de `public/` |
| Test | `local` | `.data/clinical-files-test` |
| Staging | `vercel-blob` | Blob Store privado exclusivo de staging |
| Producción | `vercel-blob` | Blob Store privado exclusivo de producción |

Variables:

```env
# Local
CLINICAL_FILES_STORAGE_DRIVER="local"
CLINICAL_FILES_LOCAL_PATH=".data/clinical-files"

# Staging
CLINICAL_FILES_STORAGE_DRIVER="vercel-blob"
STAGING_CLINICAL_BLOB_READ_WRITE_TOKEN="..."

# Producción
CLINICAL_FILES_STORAGE_DRIVER="vercel-blob"
CLINICAL_BLOB_READ_WRITE_TOKEN="..."
```

Los tokens clínicos no pueden ser los tokens del store editorial de Payload.
La validación de ambiente impide usar disco local en staging o producción.

## Estado Antimalware

La versión actual aplica firma de formato, límites estrictos, bloqueo de tipos
activos y detección del marcador de prueba EICAR. Esto es validación básica,
no reemplaza un antivirus.

La base ya guarda `scanStatus`, proveedor, fecha y motivo de cuarentena. Un
servicio antimalware futuro puede marcar `pending`, `clean` o `rejected` sin
cambiar el modelo. Hasta integrar ese servicio, los registros muestran
`basic_validation_only` y no deben describirse como “analizados por antivirus”.

Si el checksum cambia o falta el contenido, el registro pasa a
`quarantined` y deja de entregarse.

## Recuperación

Una copia recuperable necesita dos partes:

1. PostgreSQL: metadata, relaciones, checksum, estado, usuario y auditoría.
2. Storage privado: objetos identificados por `storageKey`.

Restaurar solo una parte no es suficiente. El procedimiento
[Backup y restauración de SIGECO](./backup-restore.md) respalda ambas, compara
conteos y verifica cada archivo por SHA-256.

## Auditoría

Eventos importantes:

- `attachment.upload`;
- `attachment.read`;
- `attachment.delete`;
- accesos denegados y fallos de integridad.

La auditoría conserva identificador, resultado, tamaño y propósito. No guarda
el archivo, token, checksum, nombre original o texto clínico.

## Verificación Local

```bash
pnpm env:check
pnpm db:migrate
pnpm test
pnpm test:integration
pnpm run build
```

`pnpm env:check` debe informar `clinical-files=local`. La integración reinicia
únicamente `salud_intercultural_test`.
