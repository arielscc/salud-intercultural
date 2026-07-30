# Resultado De La Propuesta De Tratamiento

Esta guía explica cómo registrar en SIGECO qué decidió el paciente después de
que el médico presentó y explicó un tratamiento.

## Responsables

- El médico explica la propuesta, responde preguntas y registra el resultado.
- Administración recibe una instrucción únicamente cuando el paciente acepta.
- Recepción/Marlen atiende el seguimiento cuando el paciente necesita tiempo y
  autorizó previamente el contacto.
- Comunicación/Yazmin no cierra tratamientos ni recibe estos seguimientos.

El permiso se valida en el servidor. No basta con ocultar el formulario en la
pantalla.

## Resultados Disponibles

| Resultado | Cuándo se usa | Efecto en SIGECO |
| --- | --- | --- |
| Aceptado | El paciente confirmó que desea iniciar. | Envía una instrucción a Administración. |
| Rechazado | El paciente indicó que no desea continuar. | Conserva el motivo; no crea venta ni seguimiento. |
| Necesita tiempo | El paciente todavía no decide. | Crea seguimiento para Recepción/Marlen solo con consentimiento vigente. |
| No aplica | No corresponde presentar un tratamiento. | Conserva la decisión clínica; no cuenta como propuesta comercial. |
| Sin decisión | La conversación terminó sin respuesta clara. | Conserva el motivo; no crea trabajo automático. |

Cada resultado exige un motivo corto mediante opciones. La nota es opcional y
debe contener solamente la aclaración necesaria.

## Qué Ocurre Cuando El Paciente Acepta

La confirmación ejecuta una sola transacción:

1. guarda el resultado aceptado, el médico, la visita y la fecha;
2. mueve la visita a Administración;
3. crea una tarea administrativa explícita;
4. crea una orden con la instrucción escrita por el médico;
5. relaciona resultado, orden y tarea.

SIGECO **no crea la venta ni el pago automáticamente**. Administración revisa
la instrucción, registra los conceptos realmente vendidos y después registra
el cobro. Así se puede recorrer:

```text
propuesta aceptada -> orden -> tarea de Administración -> venta -> pago
```

La pantalla pide una segunda confirmación antes de enviar el caso a
Administración, tanto en móvil como en escritorio.

## Qué Ocurre Cuando Necesita Tiempo

SIGECO consulta la decisión vigente de consentimiento para seguimiento:

- si está concedida, crea una tarea para mañana a las 10:00, hora de Bolivia;
- intenta asignarla a un usuario activo de Recepción llamado Marlen;
- si Marlen todavía no tiene una cuenta activa, deja la tarea en la bandeja
  compartida de Recepción/Seguimiento para asignación manual;
- si no existe consentimiento vigente, guarda la decisión pero no crea una
  tarea de contacto.

Nunca se asigna automáticamente a Comunicación/Yazmin.

## Historia Y Correcciones

Los resultados son append-only: no se editan ni se borran. Si el paciente
cambia de decisión, el médico agrega un nuevo resultado que referencia al
anterior. La consulta muestra el resultado vigente y permite abrir el historial.

Una aceptación es final para esa consulta y no puede enviarse dos veces. La
base de datos también rechaza actualizaciones, borrados, dos resultados
iniciales o dos aceptaciones para la misma consulta.

Los planes antiguos se migran como `Sin decisión`. Un texto anterior demuestra
que existió un plan, pero no demuestra que el paciente lo haya aceptado.

## Indicadores

La bandeja de Consulta muestra para el mes actual:

- propuestas aceptadas;
- propuestas rechazadas;
- pacientes que necesitan tiempo;
- tasa de aceptación.

La tasa usa solamente decisiones claras:

```text
aceptadas / (aceptadas + rechazadas)
```

`No aplica` no cuenta como una propuesta en el reporte de atribución.

## Validación Antes De Producción

1. probar los cinco resultados con el rol Médico;
2. confirmar que otro rol sin escritura clínica no pueda registrarlos;
3. comprobar que aceptar crea una sola instrucción y ninguna venta;
4. registrar la venta y el pago desde Administración y revisar la relación;
5. probar `Necesita tiempo` con consentimiento concedido y retirado;
6. comprobar el responsable de la tarea de seguimiento;
7. validar historial, auditoría e indicadores;
8. recorrer el formulario en móvil y escritorio;
9. ejecutar integración acumulada, build y QA de gstack;
10. aplicar la migración en staging antes de solicitar autorización productiva.

La migración de esta tarea está aplicada solamente en desarrollo local.
Staging y producción no deben modificarse sin autorización expresa.
