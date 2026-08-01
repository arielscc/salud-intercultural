# Tarea 24 — Recordatorios Automatizados Y Supervisados

Fecha: 2026-08-01. Entorno modificado: desarrollo local.

## Resultado

- Se agregaron reglas con versiones inmutables para control, retorno y
  recuperación de tratamiento.
- Cada regla define evento, tipo, canal, demora, período, horario, días,
  plantilla, estado y responsable.
- La detección prepara varios candidatos sin contactar automáticamente.
- Marlen revisa la vista previa y aprueba antes de crear un seguimiento.
- La clave estable evita repetir candidatos y tareas incluso después de cambiar
  la versión de una regla.
- El consentimiento y el canal se comprueban al detectar y nuevamente al
  aprobar.
- Los bloqueos, fallos y reintentos permanecen visibles.
- La bandeja responsive permite aprobar, descartar, registrar un fallo,
  reprogramar y luego abrir llamada, WhatsApp o resultado.
- Dirección configura reglas; Recepción realiza la revisión diaria.

## Protección De Datos

- `SupervisedReminderRuleVersion` y `SupervisedReminderReviewEvent` son
  append-only en PostgreSQL.
- `no_contact`, consentimiento denegado o retirado bloquean el contacto.
- Un permiso de seguimiento no se reutiliza para marketing o testimonios.
- Ningún mensaje sale directamente desde el generador de candidatos.
- Las acciones relevantes generan auditoría sin guardar datos sensibles en la
  URL.

## Migración

- `20260801090000_supervised_reminders`: permisos, enums, reglas, versiones,
  candidatos, revisiones, relación idempotente con `FollowUpTask`, índices,
  constraints y triggers append-only.

La migración se aplicó únicamente en `salud_intercultural_dev`. La base local
quedó al día con 33 migraciones. Staging y producción no fueron modificados.

## Validación Ejecutada

- Ambiente local y comunicaciones bloqueadas confirmados.
- Prisma format, validate y generate aprobados.
- Migración local aplicada correctamente.
- TypeScript y lint enfocado aprobados.
- Política, permisos y límites de seguridad: 3 archivos y 33 pruebas aprobadas.
- Se escribió integración transaccional para idempotencia, aprobación humana y
  retiro de consentimiento; su ejecución se reserva para el cierre acumulado.

## Pendientes Antes De Producción

- Ejecutar integración completa, lint global, build y QA gstack acumulado.
- Crear y validar con Dirección las tres reglas reales.
- Confirmar la cuenta activa de Marlen y sus horarios.
- Probar web y móvil con los roles Dirección, Recepción y super administrador
  en staging.
- Avisar y pedir autorización antes de migrar o activar reglas en producción.

## Commit Sugerido

`feat(sigeco): automate supervised reminders`
