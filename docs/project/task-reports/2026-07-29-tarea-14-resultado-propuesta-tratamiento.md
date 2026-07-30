# Reporte De Cambios — Tarea 14: Resultado De La Propuesta De Tratamiento

## Fecha

2026-07-29.

## Objetivo

Registrar qué decidió el paciente después de que el médico explicó el
tratamiento, sin confundir una aceptación con una venta o un cobro ya
realizados.

## Resultado Implementado

- El médico puede registrar: aceptado, rechazado, necesita tiempo, no aplica o
  sin decisión.
- Cada opción usa motivos simples y permite una nota opcional.
- La selección está optimizada para móvil y puede completarse en menos de un
  minuto.
- Aceptar exige una instrucción y una segunda confirmación.
- La aceptación mueve la visita y crea una orden explícita para Administración.
- No se crea automáticamente una venta ni un pago.
- Administración ve la confirmación del médico y, después de registrar la
  venta, la consulta muestra total, cobrado y saldo.
- `Necesita tiempo` crea seguimiento para Recepción/Marlen únicamente con
  consentimiento vigente.
- No se asigna este trabajo a Comunicación/Yazmin.
- La bandeja médica muestra aceptación, rechazo, pendientes y tasa mensual.
- El reporte de atribución usa el resultado explícito y excluye `No aplica`.
- La auditoría identifica el registro sin guardar notas o instrucciones
  sensibles en su contexto.

## Decisiones Técnicas

- `TreatmentProposalOutcome` es append-only y conserva médico, consulta,
  visita, fecha y la decisión anterior.
- La base rechaza `UPDATE`, `DELETE`, dos raíces o dos aceptaciones para una
  consulta.
- Aceptación, ruta, tarea, orden y resultado se crean en una transacción
  serializable.
- El resultado no guarda un segundo `patientId`: se relaciona mediante visita y
  consulta para seguir siendo compatible con la fusión de pacientes.
- Los planes históricos se clasifican como `Sin decisión`; no se inventan
  aceptaciones.
- Se reutiliza el permiso `clinical_write`, que mantiene el límite del servidor.

## Base De Datos Y Ambientes

- Migración local:
  `20260729222000_treatment_proposal_outcomes`.
- Desarrollo local quedó al día con 21 migraciones.
- La migración convirtió 5 planes históricos en `Sin decisión`.
- Staging y producción no fueron modificados.

## Validación Local

- `prisma format`, `prisma validate` y `prisma generate`: aprobados.
- `pnpm exec tsc --noEmit`: aprobado.
- `pnpm lint`: aprobado sin advertencias.
- Pruebas focalizadas de schema y fronteras de permisos: 2 archivos y 13
  pruebas aprobadas.
- PostgreSQL local confirmó las 21 migraciones aplicadas.
- PostgreSQL rechazó una actualización directa y confirmó la protección
  append-only.

## Pendientes Del Cierre Conjunto

- Ejecutar la integración acumulada acordada.
- Completar QA móvil y escritorio con gstack al finalizar todas las tareas.
- Validar roles, consentimiento y recorrido propuesta-venta-pago en staging.
- Confirmar con el personal el nombre de cuenta de Marlen para asignación
  automática; si no coincide, la tarea permanece disponible en la bandeja.
- Solicitar autorización antes de migrar o habilitar en producción.

La implementación local queda **en progreso** hasta completar el QA acumulado y
la validación en staging.

## Commit Sugerido

`feat(sigeco): record treatment proposal outcomes`
