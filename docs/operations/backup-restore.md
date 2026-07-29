# Backup Y Restauración De SIGECO

Esta guía explica cómo proteger y recuperar juntos:

1. PostgreSQL: pacientes, visitas, atención clínica, Caja, inventario, usuarios,
   permisos, auditoría y metadata de adjuntos.
2. Storage clínico privado: PDF e imágenes relacionados con esos registros.

Una copia de la base sin los archivos, o los archivos sin la base, no constituye
una recuperación completa de SIGECO.

## Objetivos De Recuperación

Se establecen estos objetivos operativos iniciales:

| Objetivo | Límite | Significado sencillo |
| --- | ---: | --- |
| RPO | 6 horas | Ante un desastre, se acepta perder como máximo las últimas 6 horas de cambios. |
| RTO | 4 horas | La clínica debe recuperar el sistema dentro de las 4 horas posteriores a la decisión de restaurar. |

El simulacro local final de 2026-07-29 restauró y verificó la copia en 2,507
segundos.
Ese tiempo no reemplaza el RTO de 4 horas: una emergencia real también incluye
obtener credenciales, crear infraestructura, descargar archivos, validar y
autorizar la reapertura.

Dirección debe revisar estos límites cuando aumenten los pacientes, las
sucursales o el tamaño de los archivos.

## Estrategia De Protección

La protección debe tener tres capas:

1. **Recuperación rápida de PostgreSQL:** activar historial o restauración a un
   punto en el tiempo en Neon.
2. **Copia coordinada de SIGECO:** exportar PostgreSQL y todos los adjuntos
   clínicos disponibles dentro del mismo ciclo, generar un manifiesto y cifrar
   el paquete.
3. **Copia fuera de los recursos activos:** guardar el paquete cifrado en una
   cuenta o proveedor de backup distinto al proyecto que ejecuta SIGECO.

Neon ofrece restauración a un punto en el tiempo y snapshots según la
configuración y el plan. PostgreSQL recomienda el formato `custom` de `pg_dump`
para restauraciones flexibles con `pg_restore`. Vercel permite listar y
descargar objetos privados con token; por eso el export remoto debe recorrer el
store clínico y no asumir que la base protege también los blobs.

Referencias oficiales:

- [PostgreSQL: pg_dump](https://www.postgresql.org/docs/current/app-pgdump.html).
- [Neon: Backup & Restore](https://neon.com/docs/changelog/2025-10-31).
- [Vercel Blob CLI](https://vercel.com/docs/cli/blob).
- [NIST SP 800-34: planificación de contingencia](https://csrc.nist.gov/pubs/sp/800/34/r1/upd1/final).

## Formato De La Copia Local

`pnpm backup:create:local` produce un archivo con extensión
`.sigeco-backup`. Dentro del paquete cifrado existen:

- `database.dump`: export completo de PostgreSQL en formato `custom`;
- `clinical-files/`: archivos cuyo estado es `available`;
- `manifest.json`: fecha, responsable, migraciones, conteos, tamaños y SHA-256.

El paquete usa AES-256-GCM. Este cifrado también autentica la copia: una clave
incorrecta o un solo byte modificado hacen fallar la restauración antes de tocar
la base destino.

Los archivos temporales, copias y evidencias locales viven bajo `.data/`, están
ignorados por Git y usan permisos `0700` para directorios y `0600` para
archivos.

## Separación De Credenciales

No reutilizar una sola credencial para toda la operación.

| Secreto o credencial | Uso | Dónde debe vivir |
| --- | --- | --- |
| `DATABASE_URL` | Aplicación SIGECO | Vercel por ambiente |
| `BACKUP_DATABASE_URL` | Lectura para generar copias | Runner de backup o gestor de secretos |
| `BACKUP_ENCRYPTION_KEY` | Cifrar y descifrar paquetes | Gestor de contraseñas; copia de recuperación para Dirección |
| Token del Blob clínico | Leer objetos privados de origen | Runner de backup, nunca en el navegador |
| Credencial del destino de backup | Escribir copias cifradas | Runner de backup; separada de Vercel y Neon |
| `RESTORE_DATABASE_URL` | Restaurar en destino nuevo | Solo durante una recuperación autorizada |

En local, Docker usa su usuario técnico de desarrollo. Esa excepción no debe
copiarse a producción.

Nunca escribir la clave de cifrado directamente en el comando, porque puede
quedar en el historial. Cargarla desde un gestor o con una entrada oculta:

```bash
read -s BACKUP_ENCRYPTION_KEY
export BACKUP_ENCRYPTION_KEY
```

Al terminar:

```bash
unset BACKUP_ENCRYPTION_KEY
```

## Crear Una Copia Local Cifrada

Requisitos:

- rama `develop`;
- PostgreSQL local saludable;
- `DATABASE_URL` apuntando a `salud_intercultural_dev`;
- adjuntos en `.data/clinical-files`;
- clave fuerte de al menos 32 caracteres;
- nombre del responsable.

```bash
export BACKUP_RESPONSIBLE="Nombre del responsable"
pnpm backup:create:local
```

La ruta predeterminada es `.data/backups/`. El comando:

1. rechaza hosts remotos y nombres de staging o producción;
2. fija un snapshot consistente compartido por `pg_dump`, conteos y metadata;
3. genera `pg_dump` sin propietarios ni ACL;
4. comprueba cada adjunto contra tamaño y SHA-256;
5. comprueba que la cantidad de objetos coincide con la metadata del snapshot;
6. escribe el manifiesto;
7. cifra el paquete;
8. elimina todo archivo temporal en texto plano.

## Restaurar En Un Entorno Local Aislado

La restauración nunca acepta `salud_intercultural_dev`, `test`, staging o
producción. El destino debe:

- estar en un host local;
- llamarse `salud_intercultural_restore_*`;
- existir y no contener tablas;
- usar un directorio vacío dentro de `.data/restore-drills/`;
- recibir una confirmación exacta.

Ejemplo:

```bash
docker compose exec -T postgres createdb \
  -U salud_intercultural \
  salud_intercultural_restore_manual_20260729

export BACKUP_FILE=".data/backups/NOMBRE.sigeco-backup"
export RESTORE_DATABASE_URL="postgresql://salud_intercultural:salud_intercultural@localhost:5432/salud_intercultural_restore_manual_20260729?schema=public"
export RESTORE_CLINICAL_FILES_PATH=".data/restore-drills/manual-20260729/clinical-files"
export RESTORE_CONFIRMATION="RESTORE_salud_intercultural_restore_manual_20260729"

pnpm backup:restore:local
```

El comando primero autentica y revisa el paquete. Después restaura PostgreSQL,
copia los adjuntos y vuelve a comparar:

- número de migraciones;
- pacientes y visitas;
- movimientos y monto de Caja;
- productos y stock;
- usuarios agrupados por rol;
- auditoría;
- metadata de adjuntos;
- tamaño y SHA-256 de cada archivo.

La base restaurada no se elimina automáticamente con este comando. Debe
conservarse hasta que el responsable firme el resultado y después eliminarse
con una orden explícita.

## Simulacro Automatizado Local

```bash
pnpm backup:drill:local
```

El simulacro:

1. crea dos bases nuevas y aisladas;
2. aplica todas las migraciones a la base fuente;
3. crea solamente datos sintéticos;
4. incluye un PDF clínico real de prueba;
5. genera una copia cifrada;
6. restaura en la segunda base;
7. verifica todos los dominios y hashes;
8. registra tiempos y resultado;
9. elimina únicamente las dos bases temporales y el texto plano.

La evidencia queda en `.data/backup-evidence/`. No contiene la clave ni datos
de pacientes reales.

## Política De Frecuencia Y Retención

| Copia | Frecuencia | Retención mínima |
| --- | --- | ---: |
| Paquete coordinado cifrado | Cada 6 horas durante operación | 7 días |
| Copia diaria seleccionada | Una por día | 35 días |
| Copia mensual seleccionada | Primer día de cada mes | 12 meses |
| Evidencia de simulacro | Mensual | 24 meses |

Reglas:

- No eliminar una generación hasta comprobar que existe otra copia recuperable.
- La eliminación del backup no elimina la historia clínica original.
- Cambios legales de retención requieren aprobación de Dirección y revisión
  legal local.
- La política debe aplicarse en el almacenamiento externo mediante lifecycle;
  no mediante una eliminación improvisada desde una computadora personal.

## Calendario De Simulacros

- **Mensual automático:** primer día de cada mes, 09:00 de Bolivia, mediante
  `.github/workflows/backup-restore-drill.yml`.
- **Mensual operativo:** el equipo técnico revisa el resultado del workflow y
  registra cualquier corrección.
- **Trimestral:** otra persona autorizada ejecuta la guía sin ayuda del autor.
- **Después de cambios críticos:** migraciones destructivas, cambio de Neon,
  cambio de Blob Store, cambio de cifrado o incidente.

Cada simulacro debe registrar:

- fecha y responsable;
- identificador de backup;
- ambientes fuente y destino;
- tiempo de copia;
- tiempo de restauración y verificación;
- conteos y archivos comprobados;
- resultado, problema encontrado y acción correctiva.

## Producción: Pendiente De Activación

Los comandos incluidos en esta tarea son deliberadamente locales. No aceptan
Neon, staging ni producción.

Antes de activar el proceso remoto:

1. Dirección confirma RPO de 6 horas y RTO de 4 horas.
2. Neon tiene historial y snapshots configurados con la retención contratada.
3. Existe un destino externo cifrado y con acceso restringido.
4. Se crea la credencial específica de backup.
5. Se implementa la descarga paginada del Blob Store clínico privado.
6. Se ejecuta una restauración remota en un proyecto aislado que no sea staging
   ni producción.
7. Se registra el resultado y se programa monitoreo de copias fallidas.

Hasta completar esos pasos, la Tarea 7 queda validada localmente pero no cerrada
para producción.

Si la recuperación ocurre por un acceso indebido, malware o pérdida real,
seguir primero el orden de contención y conservación de evidencia de
[Respuesta a incidentes y gate de seguridad](./incident-response.md).
