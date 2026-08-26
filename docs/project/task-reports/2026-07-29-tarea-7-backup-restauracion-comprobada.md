# Reporte De Cambios — Tarea 7: Backup Y Restauración Comprobada

## Fecha

2026-07-29.

## Objetivo

Demostrar que SIGECO puede recuperar conjuntamente PostgreSQL y los adjuntos
clínicos privados sin tocar desarrollo, staging o producción, y dejar una guía
que otra persona autorizada pueda ejecutar.

## Cambios

- Se definieron RPO de 6 horas y RTO de 4 horas.
- Se creó un paquete `.sigeco-backup` cifrado y autenticado con AES-256-GCM.
- La clave se deriva con `scrypt`; nunca aparece en argumentos, nombres o logs.
- El paquete contiene `pg_dump` en formato `custom`, adjuntos disponibles y un
  manifiesto con conteos, tamaños, migraciones y SHA-256.
- `pg_dump`, los conteos y la metadata comparten el mismo snapshot consistente
  de PostgreSQL; una diferencia entre metadata y objetos hace fallar la copia.
- La restauración exige una base local nueva, vacía y con nombre
  `salud_intercultural_restore_*`, un directorio vacío y una confirmación exacta.
- Los comandos bloquean hosts remotos y bases de desarrollo, test, staging o
  producción.
- Después de restaurar se comparan pacientes, visitas, Caja, inventario,
  usuarios por rol, auditoría, metadata y contenido de adjuntos.
- Se añadió un simulacro mensual en GitHub Actions con datos exclusivamente
  sintéticos y Actions fijadas a commits inmutables.
- Se documentaron frecuencia, retención, responsables, separación de
  credenciales y pasos aún necesarios para producción.

## Archivos Principales

- `scripts/backup/crypto.ts`.
- `scripts/backup/local-backup.ts`.
- `scripts/backup/create-local-backup.ts`.
- `scripts/backup/restore-local-backup.ts`.
- `scripts/backup/drill-local-backup.ts`.
- `.github/workflows/backup-restore-drill.yml`.
- `docs/operations/backup-restore.md`.

## Evidencia Del Simulacro

El simulacro final `ms6gm2gq_cf63188f` usó dos bases locales sintéticas:

- copia cifrada: 204.855 bytes;
- backup: 407 ms;
- restauración y verificación: 2.507 ms;
- ejecución completa: 8.091 ms;
- migraciones: 15;
- pacientes: 1;
- visitas: 1;
- movimientos de Caja: 1 por Bs 125;
- productos: 1, con stock 7;
- usuarios: 1 `super_admin`;
- eventos de auditoría: 1;
- adjuntos clínicos recuperados y verificados por SHA-256: 1.

El cifrado autenticado, el checksum y la limpieza de texto plano resultaron
correctos. La evidencia quedó con directorio `0700` y archivo `0600`. Después
del simulacro no quedó ninguna base `backup_source_*` o `restore_*`.

## Validación

- Pruebas focalizadas: 3 archivos y 23 pruebas aprobadas.
- Suite completa: 41 archivos y 179 pruebas aprobadas.
- `pnpm lint`, `pnpm typecheck`, `pnpm env:check`, `prisma validate`,
  `git diff --check` y `pnpm run build`: aprobados.
- `pnpm deps:check`: 0 vulnerabilidades altas o críticas; permanecen 4 bajas y
  14 moderadas.
- La clave débil, el paquete alterado, las rutas inseguras y los nombres de base
  no permitidos se rechazan.
- El workflow mensual también forma parte de la política que exige Actions
  fijadas a commits inmutables.
- Toda la prueba usó PostgreSQL local; no se conectó a staging ni producción.

## Pendientes Para Cerrar En Producción

- Dirección debe aprobar RPO, RTO, retención y responsables.
- Activar historial o snapshots adecuados en Neon.
- Contratar o configurar un destino externo separado para paquetes cifrados.
- Crear credenciales específicas de lectura, escritura y restauración.
- Implementar la exportación paginada del Blob Store clínico privado.
- Ejecutar y firmar una restauración remota en infraestructura aislada.
- Monitorear copias fallidas y revisar mensualmente el workflow.

Por estos puntos, la implementación queda **en progreso**: la restauración local
está demostrada, pero todavía no debe afirmarse que producción está protegida.

## Nota De Seguridad

La revisión de seguridad asistida orientó la separación de credenciales, el
cifrado autenticado, la ausencia de secretos en logs y los límites destructivos
del simulacro. No sustituye una auditoría profesional de continuidad,
seguridad y privacidad para datos clínicos.

## Commit Sugerido

`docs(ops): prove sigeco backup and restore`
