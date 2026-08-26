# Encuestas, Opiniones Y Reclamos

Guía operativa de la Tarea 25. La bandeja interna vive en
`/sigeco/opiniones` y el paciente responde mediante un enlace privado bajo
`/encuesta/...`.

## Alcance Del Piloto

El piloto es manual. Dirección decide a qué visita entregar una encuesta y
crea el enlace desde SIGECO. No existe cron, envío automático ni conexión con
los recordatorios de la Tarea 24.

El paciente puede registrar:

- una encuesta breve;
- un comentario o sugerencia;
- un reclamo.

Una calificación positiva no crea un testimonio. Ninguna respuesta se copia a
Payload ni al sitio público.

## Enlace Seguro

- El token tiene 32 bytes aleatorios.
- PostgreSQL guarda solo su SHA-256, no el enlace recuperable.
- Dirección debe copiarlo cuando lo crea.
- Crear otro enlace para la misma visita invalida el anterior.
- El enlace vence entre 1 y 30 días y puede cancelarse.
- Una visita acepta una sola respuesta.
- La página y la API usan `no-store`, `no-referrer`, `noindex` y límite de
  intentos.
- La ruta privada no carga analytics, Pixel, navegación pública ni botones de
  contacto; así el token no se envía a herramientas externas.

El formulario nunca muestra paciente, visita, responsable, plazo,
clasificación, prioridad o notas internas.

## Consentimiento

La Tarea 25 agrega la finalidad **Encuesta sobre la atención**. Su texto es
independiente de seguimiento, recordatorios, educación, promociones e imagen
o voz.

- Entregar el enlace en persona no inicia contacto remoto.
- Compartirlo por WhatsApp exige decisión `feedback=granted` y canal WhatsApp.
- Autorizar la encuesta no permite publicar la respuesta.
- Publicar un testimonio exige otra autorización específica y un proceso
  editorial separado. SIGECO no ofrece un botón de publicación.

La incorporación del sexto texto cambia la versión vigente a `v2`. Producción
permanece bloqueada hasta aprobación expresa de Dirección.

## Clasificación Inicial

| Respuesta | Clasificación inicial | Plazo |
| --- | --- | --- |
| Encuesta de 3 a 5 sin comentario | Opinión general cerrada | No requiere respuesta. |
| Comentario o calificación de 1 a 2 | General o servicio | 48 horas. |
| Reclamo común | Servicio, prioritario | 24 horas. |
| Reclamo con posible riesgo o daño en salud | Posible incidente clínico, crítico | 4 horas. |

La señal de posible incidente clínico proviene de la respuesta del paciente.
Sirve para priorizar, pero no demuestra por sí sola que ocurrió daño o mala
práctica. Dirección debe revisar los hechos y decidir el procedimiento clínico
correspondiente.

## Trabajo De Dirección

1. Revisar primero **Críticos abiertos** y **Fuera de plazo**.
2. Leer la respuesta sin convertir una inconformidad en diagnóstico.
3. Confirmar clasificación, prioridad, responsable y plazo.
4. Registrar una nota interna concreta.
5. Cambiar a `En revisión`, `Esperando al paciente`, `Resuelto` o `Cerrado`.
6. Si existe riesgo clínico real, activar el procedimiento profesional que
   Dirección defina fuera de la encuesta.

La respuesta original y los eventos internos son append-only. Dirección puede
actualizar la proyección del caso, pero no reescribir lo que dijo el paciente
ni borrar la historia.

## Tendencias

El panel resume los últimos 90 días por:

- tipo de respuesta;
- área relacionada;
- calificación;
- promedio;
- casos abiertos, críticos y vencidos.

Estas tendencias miden experiencia y oportunidad de respuesta. No miden
eficacia clínica ni autorizan publicidad.

## Antes De Producción

- Completar el piloto manual y aprobar las preguntas.
- Confirmar responsables y plazos de 4, 24 y 48 horas.
- Aprobar expresamente los seis textos de consentimiento `v2`.
- Ejecutar integración completa, lint global, build y QA gstack acumulado.
- Validar enlace, formulario y bandeja en móvil y escritorio de staging.
- Confirmar que analytics no recibe rutas `/encuesta/...`.
- Avisar y pedir autorización antes de aplicar la migración o habilitar el
  flujo en producción.

