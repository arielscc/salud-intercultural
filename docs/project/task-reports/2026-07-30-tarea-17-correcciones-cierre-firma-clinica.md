# Reporte De Cambios — Tarea 17: Correcciones, Cierre Y Firma Clínica

## Fecha

2026-07-30.

## Objetivo

Permitir que el médico cierre y corrija una consulta sin reemplazar la historia
original ni modificar silenciosamente otros registros.

## Resultado Implementado

- La consulta médica distingue borrador y finalizada.
- Cada guardado, cierre o corrección crea una versión.
- Finalizar conserva usuario, fecha, hora y número de revisión.
- Una consulta finalizada no puede editarse nuevamente como borrador.
- Corregir exige tipo y motivo, conserva la versión anterior y señala la
  vigente.
- El historial permite comparar dos versiones y resalta cada campo cambiado.
- Dos pestañas con la misma revisión no pueden guardar ambas.
- Una corrección no modifica recetas, órdenes, ventas, cobros ni aplicaciones.
- Una visita con consulta en borrador no puede cerrarse como completada.
- Médico y super administrador pueden finalizar y corregir; Dirección solo
  revisa.

## Decisiones Técnicas

- `ClinicalConsultation` es la proyección vigente.
- `ClinicalConsultationVersion` conserva fotografías históricas.
- La revisión esperada y una actualización condicional implementan
  concurrencia optimista.
- Las transacciones de guardado, cierre y corrección son serializables.
- La firma implementada es interna: cuenta autenticada, fecha y hora. No se
  presenta como firma digital criptográfica.
- Las consultas anteriores se migran como borrador y reciben una primera
  versión conservadora.

## Base De Datos Y Ambientes

- Migración local: `20260730154007_clinical_record_versions`.
- Desarrollo local quedó al día con 24 migraciones.
- Staging y producción no fueron modificados.

## Validación Local

- Prisma schema y migración local: aprobados; 24 migraciones al día.
- Las 5 consultas anteriores recibieron una versión de borrador; ninguna quedó
  sin versión ni recibió una firma inventada.
- TypeScript y lint: aprobados.
- 6 archivos y 35 pruebas enfocadas: aprobados.
- Integración completa, build y QA gstack permanecen aplazados para el cierre
  acumulado acordado.

## Pendientes Del Cierre Conjunto

- Ejecutar la integración acumulada, incluido el caso concurrente.
- Completar build y QA web/móvil con gstack.
- Validar permisos con cuentas reales de Médico y Dirección en staging.
- Confirmar con Dirección el significado operativo de la firma interna.
- Solicitar autorización antes de aplicar la migración en producción.

La implementación local queda **en progreso** hasta completar el QA acumulado y
la validación por roles en staging.

## Commit Sugerido

`feat(sigeco): version clinical records`
