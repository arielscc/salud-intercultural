# Reporte De Cambios — Tarea 11: Fuentes De Captación Y Atribución

> Actualización: la Tarea 27 trasladó la edición de campañas a Payload. La
> fuente y la fotografía histórica por llegada permanecen en SIGECO.

## Fecha

2026-07-29.

## Objetivo

Conservar las fuentes que ayudaron a generar cada llegada y relacionarlas con
planes de tratamiento, ventas e ingresos sin pedirle al paciente datos que no
puede reconocer.

## Resultado Implementado

- Recepción elige una fuente principal con palabras simples y puede añadir
  fuentes de apoyo.
- Facebook continúa como una sola respuesta para el paciente.
- WhatsApp puede quedar como apoyo sin borrar TikTok, Facebook, referido u otra
  fuente principal.
- La fuente original del paciente queda fija después de crear la ficha.
- Cada visita conserva una fotografía histórica independiente.
- La edición del paciente ya no permite reescribir el origen comercial.
- Se agregó un catálogo administrable de fuentes con orden, estado, texto para
  el paciente y nombre interno.
- Se agregó un catálogo de campañas y enlaces con cuenta exacta, código y tipo
  orgánico, pagado o no identificado.
- TikTok del Dr. Franco, TikTok de la Dra. Cinthia y Facebook institucional
  tienen códigos iniciales separados.
- El formulario público captura `camp` y etiquetas UTM, genera un código
  `WEB-ID` y lo conserva al continuar por WhatsApp.
- Un código válido completa automáticamente la cuenta y el tipo de tráfico.
  Recepción no puede adivinarlos manualmente.
- Se agregó `/sigeco/atribucion` para comparar por fecha, ciudad y departamento
  las llegadas, planes registrados, ventas, monto vendido e ingresos cobrados.
- Fuente principal e influencia se muestran por separado para evitar duplicar
  ingresos.
- Dirección y super administrador pueden administrar el catálogo; Recepción
  solo registra las opciones activas.
- Las acciones de catálogo importantes quedan auditadas.
- No se reactivó el módulo antiguo de leads de SIGECO.

## Base De Datos

- Migración `20260729210000_capture_attribution`.
- Nuevos modelos: `CaptureSource`, `CaptureCampaign`, `VisitAttribution` y
  `VisitAttributionTouch`.
- Nuevos tipos para categoría, evidencia, tráfico y función de cada fuente.
- Nuevo permiso `attribution_manage`.
- Las visitas anteriores se completan con la mejor fuente disponible en la
  ficha y quedan marcadas como `legacy_backfill`.
- La migración preserva datos; no contiene `DROP`, `DELETE` ni cambios
  destructivos.
- Aplicada únicamente en `salud_intercultural_dev`.
- Staging y producción no fueron modificados.

## Payload Y Formulario Público

- `lead-submissions` incorpora campaña, cuenta atribuida, tipo de tráfico y
  etiquetas UTM.
- El API solo reconoce una cuenta exacta cuando el código corresponde a una
  campaña activa del catálogo.
- Un formulario sin campaña sigue funcionando y puede comprobarse mediante su
  código `WEB-ID`.
- Payload continúa siendo la fuente de verdad de los contactos anteriores a la
  llegada.

## Validación Local

- `pnpm env:check`: aprobado para local.
- `pnpm typecheck`: aprobado.
- `pnpm lint`: aprobado sin advertencias.
- `pnpm exec prisma validate`: esquema aprobado.
- 57 pruebas específicas aprobadas en 8 archivos.
- Migración local: aplicada correctamente; 18 migraciones vigentes.
- `git diff --check`: aprobado, sin errores de espacios ni conflictos.
- Se preparó una integración que comprueba TikTok principal, WhatsApp de apoyo,
  cuenta verificada, plan, venta e ingreso.
- La integración completa y el QA de gstack quedan aplazados para el cierre de
  todas las tareas, según lo solicitado.

## Pendientes Del Cierre Conjunto

- Ejecutar la suite de integración completa sobre la base exclusiva de test.
- Actualizar Payload y aplicar la migración en staging.
- Probar los roles de Recepción, Dirección y super administrador.
- Revisar responsive, códigos, filtros y reporte mediante el QA acumulado de
  gstack.
- Validar con Marketing los primeros códigos de campañas pagadas.
- Solicitar autorización antes de cualquier cambio en producción.

La implementación local queda **en progreso** hasta completar integración y QA
acumulados.

## Commit Sugerido

`feat(sigeco): improve source attribution`
