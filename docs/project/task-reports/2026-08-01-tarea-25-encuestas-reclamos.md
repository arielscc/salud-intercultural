# Tarea 25 — Encuestas Y Reclamos

Fecha: 2026-08-01. Entorno modificado: desarrollo local.

## Resultado

- Dirección dispone de una bandeja de opiniones, reclamos, plazos y
  tendencias.
- El piloto crea enlaces manualmente; no usa recordatorios automáticos.
- El token aleatorio se guarda únicamente como SHA-256 y solo se muestra al
  crearlo.
- Crear otro enlace para la visita invalida el anterior.
- El formulario móvil pregunta calificación, tipo, área, comentario y posible
  riesgo para la salud.
- Encuesta, comentario, reclamo y posible incidente clínico quedan separados.
- Reclamos críticos vencen inicialmente en 4 horas; comunes en 24 y opiniones
  que requieren revisión en 48.
- Cada caso posee clasificación, prioridad, estado, responsable y plazo.
- La respuesta y el historial interno son append-only.
- Las tendencias cubren 90 días por tipo, área y calificación.
- No existe integración con Payload ni autorización implícita para publicar
  testimonios.

## Privacidad Y Seguridad

- El paciente nunca recibe nombre, visita, responsable, clasificación, plazo
  o notas internas.
- La ruta `/encuesta/...` no carga analytics ni componentes de marketing.
- Página y API usan no-store, no-referrer, noindex y límite de intentos.
- WhatsApp exige consentimiento específico para encuestas.
- La nueva finalidad cambia los textos vigentes de consentimiento a `v2` y
  mantiene producción bloqueada.
- La señal de riesgo clínico prioriza revisión; no prueba un daño clínico.

## Migración

- `20260801120000_feedback_complaints`: permisos, sexto consentimiento,
  invitaciones, respuestas, casos, eventos, índices, constraints y triggers
  append-only.

La migración se aplicó solo en `salud_intercultural_dev`. La base local quedó
al día con 34 migraciones. Staging y producción no fueron modificados.

## Validación Ejecutada

- Ambiente local y comunicaciones bloqueadas confirmados.
- Prisma format, validate y generate aprobados.
- Migración local aplicada correctamente.
- TypeScript y lint enfocado aprobados.
- Políticas, schemas, consentimientos, ambiente, permisos y seguridad: 7
  archivos y 68 pruebas aprobadas.
- La integración transaccional quedó escrita para rotación de token,
  idempotencia, clasificación crítica e inmutabilidad; se ejecutará en el
  cierre acumulado.

## Pendientes Antes De Producción

- Ejecutar integración completa, lint global, build y QA gstack acumulado.
- Completar el piloto manual y aprobar preguntas, responsables y plazos.
- Aprobar expresamente los seis textos de consentimiento `v2`.
- Validar Dirección, formulario móvil y ausencia de analytics en staging.
- Avisar y pedir autorización antes de migrar o habilitar producción.

## Commit Sugerido

`feat(sigeco): add feedback and complaints`
