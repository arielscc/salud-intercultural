# Tarea 27 — Integración Segura Payload-SIGECO

Fecha: 2026-08-01. Entorno modificado: desarrollo local.

## Resultado

- Nueva colección `marketing-campaigns` en Payload como fuente editable.
- `CaptureCampaign` queda como copia técnica relacionada con las llegadas.
- Las campañas ya no se crean ni activan desde SIGECO.
- Sincronización idempotente por identificador externo y revisión.
- API privada con token exclusivo, límite de tamaño, frecuencia y fechas.
- Reporte saliente limitado a métricas agregadas y grupos de cinco o más.
- Auditoría de sincronizaciones y exportaciones sin secretos.
- Recepción continúa con la fuente manual cuando Payload no responde.
- El formulario público conserva el lead aunque falle la consulta puntual de
  campaña.

## Migración Y Datos Locales

- Migración `20260801170000_payload_sigeco_campaign_ownership`.
- Base local al día con 36 migraciones.
- Seed Payload ejecutado de forma idempotente.
- `FACEBOOK-CLINICA`, `TIKTOK-DR`, `TIKTOK-DRA` y `WEB-FORM` verificadas como
  enlazadas y administradas por Payload.
- Staging y producción no fueron modificados.

## Límites De Privacidad

Payload no recibe pacientes, visitas, teléfonos, diagnósticos, tratamientos ni
archivos. Solo recibe período, código de campaña y totales agregados de
llegadas, ventas e ingresos. Los grupos menores a cinco se suprimen.

## Validación Ejecutada

- Prisma format, validate, generate y migración local: aprobados.
- Tipos de Payload regenerados.
- TypeScript y lint enfocado: aprobados.
- Contrato, autenticación, límites, supresión, fallback y seguridad: 10
  archivos y 67 pruebas aprobadas.
- Integración de idempotencia agregada para el cierre acumulado.

## Pendientes Antes De Producción

- Ejecutar integración completa, build y QA gstack acumulados.
- Crear un secreto diferente por ambiente.
- Aplicar migración y seed en staging; probar roles y caída simulada.
- Validar con Marketing los códigos y el umbral mínimo de cinco.
- Avisar y pedir autorización antes de migrar o habilitar producción.

## Commit Sugerido

`feat(sigeco): integrate campaign attribution safely`

