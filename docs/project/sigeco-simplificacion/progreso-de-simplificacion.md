# Progreso De Simplificacion Sigeco (V3.7)

Registro de avance del plan [Tareas de simplificacion](./tareas-de-simplificacion.md). Cada tarea terminada agrega aqui su entrada con fecha, archivos tocados, validaciones ejecutadas y pendientes que deja.

## Estado General

| Tarea | Nombre | Estado |
| --- | --- | --- |
| 1 | Modelo de datos de la simplificacion | Pendiente |
| 2 | Funnel de recepcion | Pendiente |
| 3 | Retirar UI y termino lead | Pendiente |
| 4 | Fusionar Pacientes y Visitas en Recepcion | Pendiente |
| 5 | Rol seguimiento y retiro de captacion | Pendiente |
| 6 | Flujo de visita flexible | Pendiente |
| 7 | Edicion de ficha de paciente | Pendiente |
| 8 | Consulta medica prellenada y formularios simplificados | Pendiente |
| 9 | Dashboard centrado en recepcion | Pendiente |
| 10 | Documentacion y QA final | Pendiente |

## Contexto Y Decisiones (2026-07-10)

Origen: al usuario le parecio que el flujo completo del paciente exige demasiado llenado (~89 campos en 13 formularios y 7+ pantallas, con datos pedidos hasta 3 veces). Se hizo un analisis con diagramas (artefacto "Analisis de flujo Sigeco") y el usuario respondio 5 preguntas de validacion. Feedback incorporado al plan:

1. El diagrama del flujo as-built es correcto, PERO el flujo no es lineal: el paciente puede abandonar en cualquier punto (incluso despues de la consulta), y tras la consulta puede ir a enfermeria, a administracion a comprar algo, o irse. El seguimiento lo hacen Marlen o Yazmin. -> Tarea 6 y rol nuevo en Tarea 5.
2. Ajustes al funnel: fecha de nacimiento en vez de edad; genero opcional y solo cuando tenga utilidad; "desde cuando" guarda cantidad + unidad; "ya se atendio" se guarda en la visita (cambia por problema); enfermedad de base y medicacion son campos separados en la misma pantalla. Preguntas agregadas: tipo de visita (primera consulta / control / nuevo problema / revision de resultados), preferencia de contacto para seguimiento (WhatsApp / llamada / ambos / prefiere no) y si trae analisis o estudios.
3. Aprobada la fusion Pacientes + Visitas -> modulo "Recepcion".
4. El rol captacion se desactiva; Yazmin pasa al rol nuevo `seguimiento`.
5. Aprobados los campos nuevos de base de datos (version mejorada: ver resumen de modelo en el plan de tareas).

Restricciones fijas: los datos de leads NO se borran (solo su UI); migraciones solo aditivas; sistema visual Marea intacto; sin integracion con el otro proyecto del usuario por ahora.

## Entradas Por Tarea

(sin entradas todavia)
