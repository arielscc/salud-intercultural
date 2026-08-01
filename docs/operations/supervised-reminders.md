# Recordatorios Automatizados Y Supervisados

Guía operativa de la Tarea 24. La bandeja vive en
`/sigeco/seguimientos/recordatorios` y trabaja sobre los seguimientos ya
existentes; no reemplaza el registro de intentos y resultados.

## Qué Automatiza SIGECO

SIGECO revisa eventos recientes y prepara candidatos según reglas activas:

| Evento | Tipo de seguimiento | Ejemplo |
| --- | --- | --- |
| Visita completada | Evolución | Preguntar cómo sigue después de la consulta. |
| Tratamiento aceptado | Retorno | Coordinar el control indicado. |
| Visita interrumpida | Recuperación de tratamiento | Consultar si necesita ayuda para continuar. |

La regla define días de espera, período revisado, canal, horario, días de la
semana, responsable y texto. El sistema completa paciente, fecha, tipo y
clínica en una vista previa.

No se envían mensajes ni se realizan llamadas automáticamente. Una sola
acción puede preparar varios pendientes, pero Marlen revisa cada persona antes
de crear la tarea de seguimiento.

## Flujo Diario

1. Marlen abre **Seguimientos → Recordatorios supervisados**.
2. Pulsa **Revisar eventos ahora**.
3. SIGECO busca eventos que coinciden con reglas activas.
4. Si el contacto está prohibido, guarda el candidato como bloqueado y muestra
   el motivo.
5. Marlen revisa el texto, paciente, canal, fecha y responsable.
6. Al aprobar, SIGECO vuelve a comprobar el consentimiento y crea una sola
   `FollowUpTask`.
7. La llamada o WhatsApp y su resultado se registran desde el seguimiento
   normal.

Ejecutar la revisión varias veces es seguro. La clave usa regla, evento y
registro de origen; no usa el número de versión. Por eso cambiar una plantilla
no vuelve a crear el mismo trabajo.

## Consentimiento Y Horario

- Se usa la decisión vigente para la finalidad `follow_up`.
- `no_contact` histórico bloquea si no existe una decisión posterior.
- Una decisión denegada o retirada bloquea.
- El canal elegido debe estar autorizado: llamada o WhatsApp.
- El consentimiento se comprueba al descubrir y otra vez al aprobar.
- El horario se calcula en `America/La_Paz`.
- Fuera de horario o en un día no permitido, el candidato pasa a la siguiente
  apertura válida.

El permiso de seguimiento no autoriza promociones, educación, testimonios ni
uso de imagen o voz.

## Reglas Y Versiones

Dirección o el super administrador pueden crear y cambiar reglas. Cada cambio
crea una nueva `SupervisedReminderRuleVersion`; PostgreSQL impide editar o
borrar versiones anteriores. Desactivar también crea una versión.

Plantillas iniciales recomendadas:

- **Control:** evento visita completada, tipo evolución.
- **Retorno:** evento tratamiento aceptado, tipo retorno.
- **Recuperación:** evento visita interrumpida, tipo recuperación de
  tratamiento.

La persona responsable debe ser un usuario activo de Recepción. Para el flujo
actual se selecciona Marlen. Una regla nueva debe revisarse antes de marcarla
activa.

## Fallos Y Reintentos

Un fallo permanece en la pestaña **Con fallo** con su código o motivo. Marlen
elige un nuevo momento mediante el selector global de fecha y hora. Reintentar
no crea otro candidato: vuelve a poner el mismo registro en revisión.

Un bloqueo tampoco se borra. Si el paciente registra después un nuevo
consentimiento, Marlen puede volver a comprobarlo desde el mismo candidato.

Cada aprobación, bloqueo, descarte, fallo y reintento agrega un
`SupervisedReminderReviewEvent` append-only. El intento real y su resultado
continúan en `FollowUpAttempt`.

## Permisos

- `reminder_rules_manage`: Dirección y super administrador.
- `reminders_review`: Recepción y super administrador.
- `followups_read`: acceso a la página y a la tarea aprobada.
- `followups_write`: registro posterior del intento y resultado.

La validación se realiza en las acciones del servidor. Ocultar un botón no es
el control de seguridad.

## Antes De Producción

- Ejecutar la integración acumulada, lint global, build y QA gstack.
- Validar las tres reglas con datos de prueba en staging.
- Confirmar que la cuenta activa de Marlen es la responsable.
- Revisar con Dirección textos, días, demoras y horario.
- Comprobar llamada, WhatsApp, bloqueo, fallo y reintento en móvil.
- Avisar y pedir autorización antes de aplicar la migración o activar reglas
  en producción.
