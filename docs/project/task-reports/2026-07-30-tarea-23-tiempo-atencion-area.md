# Tarea 23 — Tiempo De Atención Por Área

Fecha: 2026-07-30. Entorno modificado: desarrollo local.

## Resultado

- Se agregaron eventos append-only para entrada, inicio de atención, bloqueo,
  reanudación y salida.
- Cada paso posee secuencia estable para ordenar eventos del mismo milisegundo.
- Los cambios de área, cierres y abandonos registran la salida automáticamente.
- Recepción, Médico, Enfermería y Administración controlan solamente su área.
- La ficha móvil muestra fase y tiempo actual sin nuevas consultas cada 30
  segundos.
- Un aviso visual aparece después de 30 minutos de espera.
- Dirección dispone de promedio, mediana, P75 y P90 por área.
- El reporte incluye tendencia por día, franja horaria, sucursal y sesiones
  activas.
- Visitas canceladas y datos de prueba quedan excluidos.
- Un abandono conserva la duración hasta su salida.

## Protección De Datos

- `VisitAreaTimeEvent` es inmutable en PostgreSQL.
- `area_time_write` separa operación de lectura de reportes.
- El servidor impide que un rol registre eventos para otra área.
- Los datos históricos se marcan como inferidos y no inventan fases.
- El seed de staging marca sus visitas con `isTestData = true`.

## Migraciones

- `20260730213127_area_service_times`: permisos, eventos, backfill conservador,
  datos de prueba y protección append-only.
- `20260730214500_area_time_event_sequence`: orden secuencial determinista.

Durante la aplicación local, el trigger append-only bloqueó correctamente el
primer backfill de secuencia. Se marcó solo ese intento local como revertido,
la migración se volvió idempotente, se desactivó el trigger únicamente durante
el backfill y se reactivó antes de cerrar la transacción. No se borraron datos.

## Validación Ejecutada

- Ambiente y PostgreSQL local confirmados.
- Prisma format, validate, generate y 32 migraciones locales al día.
- TypeScript y lint enfocado aprobados.
- Fórmulas, permisos y seguridad: 3 archivos y 34 pruebas aprobadas.
- `git diff --check` aprobado.
- La integración transaccional quedó escrita para el cierre acumulado.

## Pendientes Antes De Producción

- Ejecutar integración completa, lint global, build y QA gstack acumulado.
- Validar las cuatro áreas y los permisos en staging.
- Probar avisos y controles en teléfonos reales.
- Medir el umbral de 30 minutos durante el piloto.
- Revisar una muestra manual con Dirección.
- Avisar y pedir autorización antes de aplicar migraciones en producción.

## Commit Sugerido

`feat(sigeco): measure time by area`
