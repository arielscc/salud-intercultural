# Tipos Y Resultados De Seguimiento

Esta guía explica cómo organizar los seguimientos sin obligar al personal a
leer todas las notas para saber qué debe hacer.

## Las Tres Preguntas Que SIGECO Separa

Cada seguimiento responde por separado:

1. **¿Para qué contactamos?** Tipo de seguimiento.
2. **¿Qué debemos hacer ahora?** Estado de la tarea.
3. **¿Qué respondió o qué ocurrió?** Resultado del contacto.

Antes de esta tarea, respuestas como `Mejoró` o `No responde` se guardaban como
si fueran el estado de la tarea. Ahora el estado operativo solo puede ser
pendiente, terminado o cancelado.

## Tipos De Seguimiento

| Tipo | Uso | Relación | Responsable normal |
| --- | --- | --- | --- |
| Evolución | Preguntar cómo sigue un paciente atendido. | Clínica | Recepción/Marlen |
| Retorno | Confirmar o coordinar que un paciente vuelva. | Clínica | Recepción/Marlen |
| Recuperación de tratamiento | Recuperar una decisión o tratamiento que no continuó. | Clínica | Recepción/Marlen |
| Administrativo | Pagos, documentos, horarios u otra coordinación. | Administrativa | Recepción o Administración |
| Llamada médica | El paciente necesita criterio o respuesta médica. | Clínica | Médico |

Cuando se contacta a una persona que todavía no llegó a la clínica, se usa
`Administrativo`. `Recuperación de tratamiento` está reservada para pacientes
que ya recibieron una propuesta o iniciaron atención y se asigna a
Recepción/Marlen.

## Prioridad

- **Baja:** puede esperar sin afectar la atención.
- **Normal:** trabajo habitual.
- **Alta:** debe atenderse pronto.
- **Urgente:** debe revisarse primero.

Una llamada creada por escalamiento al médico siempre nace como urgente. Una
llamada médica creada manualmente se eleva por lo menos a prioridad alta.

## Resultados

Los resultados disponibles cambian según el tipo. Por ejemplo:

- evolución: mejoró, sigue igual, empeoró, quiere volver o requiere nueva
  visita;
- recuperación: retomará, no continuará, quiere volver o necesita médico;
- administrativo: gestión completada, no responde, reprogramado o cancelado;
- llamada médica: evolución, nueva visita, retorno o reprogramación.

`No responde` y `Reprogramado` no cierran la tarea. Exigen una nueva fecha y la
mantienen pendiente. Los demás resultados cierran la gestión, salvo que una
regla cree un nuevo trabajo.

## Escalamiento Médico

Si Recepción registra `Empeoró` o `Escalado al médico`:

1. se conserva el resultado del contacto original;
2. la tarea original queda terminada;
3. se crea una tarea nueva de tipo `Llamada médica`;
4. la prioridad nueva es urgente;
5. se copia la relación con paciente, visita, venta u orden;
6. se intenta asignar a un médico activo;
7. ambas tareas quedan relacionadas.

Solo Médico o Super administrador pueden registrar el resultado de una llamada
médica. Recepción y Administración pueden verla únicamente cuando su alcance lo
permite, pero no pueden cerrarla como gestión administrativa.

## Asignación

- Los tipos clínicos `Evolución`, `Retorno` y `Recuperación de tratamiento`
  buscan una cuenta activa de Recepción cuyo nombre contenga `Marlen`.
- `Llamada médica` busca una cuenta activa con rol Médico.
- `Administrativo` puede asignarse a Recepción o Administración.
- El rol técnico `seguimiento` quedó **deprecado el 2026-08-02**: el seguimiento
  de pacientes (clínico y administrativo) lo hace ahora Recepción. Las cuentas
  que lo tenían se reasignan a Recepción.
- Si no existe la cuenta requerida, SIGECO muestra `Sin asignar`. No entrega
  silenciosamente una tarea clínica a otra persona.

Antes de producción deben existir las cuentas activas de Marlen y de los
médicos con nombres y roles correctos.

## Consentimiento

Las llamadas y WhatsApp siguen sujetos al consentimiento vigente y al canal
autorizado. Clasificar una tarea no concede permiso de contacto.

El contacto presencial puede registrarse sin habilitar un canal remoto.

## Web

La bandeja permite filtrar por:

- vencidos, hoy o próximos;
- tipo;
- responsable o sin asignar;
- estado pendiente, terminado o cancelado.

Cada fila muestra tipo, responsable, prioridad, vencimiento y último resultado.

## Móvil

La lista diaria ofrece, cuando están permitidos:

- llamar;
- abrir WhatsApp;
- registrar resultado.

El formulario usa opciones grandes. `No responde` y `Reprogramado` abren el
selector global de fecha y hora para programar el próximo intento.

## Migración De Datos Anteriores

La migración conserva intentos, fechas, notas e historial:

- mueve el antiguo resultado a un campo propio;
- normaliza el estado actual a pendiente, terminado o cancelado;
- mantiene `No responde` pendiente;
- clasifica prudentemente el tipo usando relaciones y títulos existentes.

La clasificación automática debe revisarse en staging. No se modifica
producción sin autorización expresa.

## Validación Antes De Producción

1. crear o confirmar las cuentas activas de Marlen y médicos;
2. revisar las tareas antiguas clasificadas;
3. probar cada tipo con su rol permitido y uno denegado;
4. comprobar filtros de escritorio;
5. probar llamada, WhatsApp y resultado en móvil;
6. verificar consentimiento concedido y retirado;
7. confirmar que `No responde` conserva una nueva fecha pendiente;
8. probar el escalamiento y su asignación al médico;
9. comprobar auditoría sin notas sensibles;
10. ejecutar integración, build y QA de gstack acumulados.

La migración de esta tarea está aplicada solamente en desarrollo local.
