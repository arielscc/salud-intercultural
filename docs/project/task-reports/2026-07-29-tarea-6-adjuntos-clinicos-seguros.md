# Reporte De Cambios — Tarea 6: Adjuntos Clínicos Seguros

## Fecha

2026-07-29.

## Objetivo

Permitir que el personal clínico autorizado suba y consulte resultados,
fotografías y documentos sin publicarlos, sin compartir enlaces permanentes y
sin mezclar estos archivos con el contenido editorial de Payload.

## Cambios

- Se reemplazaron las estructuras antiguas sin uso por un único modelo de
  adjuntos clínicos y concesiones temporales.
- Cada adjunto se relaciona con paciente, usuario y, cuando corresponde, visita
  y estudio.
- Se agregaron permisos independientes para lectura, escritura y eliminación.
- El almacenamiento local queda fuera de `public/`; staging y producción
  requieren Blob Stores privados y separados.
- El nombre original no forma parte de la ruta. Se usa una clave opaca que no
  revela al paciente.
- El servidor limita el cuerpo antes de interpretar el formulario y valida
  tamaño, extensión, MIME, firma real, contenido básico y SHA-256.
- PDF, JPG, PNG y WebP son los únicos formatos admitidos; cada archivo puede
  pesar hasta 4 MB.
- La descarga y la vista previa usan un token aleatorio de dos minutos y un
  solo uso, enviado mediante `POST` y nunca en la URL.
- El contenido se vuelve a comprobar por tamaño y checksum en cada lectura.
- La interfaz ofrece selección múltiple, progreso, cámara móvil, compresión de
  JPG, reintento sin duplicados, vista previa y descarga.
- La eliminación es de dos pasos, borra el contenido, revoca accesos pendientes
  y conserva la metadata histórica.
- Subidas, lecturas, rechazos y eliminaciones importantes quedan auditados sin
  copiar datos clínicos ni secretos al evento.

## Permisos

| Rol | Ver | Subir | Eliminar |
| --- | --- | --- | --- |
| Super administrador | Sí | Sí | Sí |
| Dirección | Sí | No | No |
| Médico | Sí | Sí | No |
| Enfermería | Sí | Sí | No |
| Recepción | No | No | No |
| Administración | No | No | No |
| Seguimiento | No | No | No |

## Archivos Principales

- `prisma/schema.prisma`.
- `prisma/migrations/20260729140000_secure_clinical_attachments/migration.sql`.
- `src/modules/clinical-attachments/`.
- `src/app/(internal)/sigeco/api/clinical-attachments/`.
- `src/components/internal/clinical-attachments/ClinicalAttachmentsPanel.tsx`.
- `docs/operations/clinical-attachments.md`.

## Decisiones Técnicas

- La cookie interna tiene ruta `/sigeco`; por ello, la API privada también vive
  bajo `/sigeco/api` y no fue necesario ampliar el alcance de la cookie.
- Las concesiones se guardan como hash, están ligadas al usuario y se consumen
  atómicamente una sola vez.
- Payload Media continúa siendo público/editorial y no puede almacenar archivos
  clínicos.
- La eliminación física es controlada; la metadata queda como historial para
  auditoría y restauración.
- La validación actual es básica y detecta el marcador EICAR de prueba. El
  sistema no afirma que existe un antivirus real.
- La migración se detiene si encuentra filas en las tablas antiguas, evitando
  borrar silenciosamente adjuntos creados fuera del flujo conocido.

## Validación

- Migración aplicada en `salud_intercultural_dev`; no se usó staging.
- Suite unitaria: 39 archivos y 160 pruebas aprobadas.
- `pnpm lint`, `pnpm typecheck`, `pnpm env:check`, `prisma validate`,
  `git diff --check` y `pnpm run build`: aprobados.
- `pnpm deps:check`: 0 vulnerabilidades altas o críticas; permanecen 4 bajas y
  14 moderadas.
- QA local autenticado en escritorio y 390 px: carga, progreso, vista previa,
  descarga autorizada, eliminación de dos pasos y diseño sin desbordamiento.
- La API rechazó una petición anónima de concesión con `401`.
- El archivo usado en QA fue eliminado; sus eventos append-only permanecen
  como evidencia local.

## Pendiente

- `pnpm test:integration` no se ejecutó porque reinicia de forma irreversible
  la base exclusiva `salud_intercultural_test` y requiere autorización expresa.
- Crear y configurar los Blob Stores clínicos privados de staging y producción.
- Aplicar la migración y probar URLs directas con los siete roles QA en staging.
- Verificar backup y restauración conjunta de PostgreSQL y objetos en la Tarea 7.
- Integrar un servicio antimalware real si el análisis de riesgo lo exige.

## Nota De Seguridad

La revisión CSO asistida no encontró una ruta clínica pública previa que pudiera
explotarse; sí confirmó que Payload Media no debía reutilizarse y que los tokens
no debían aparecer en URLs o logs. Esta revisión automatizada no sustituye una
auditoría profesional de seguridad y privacidad para datos clínicos.

## Commit Sugerido

`feat(sigeco): secure clinical attachments`
