# Abandono, Bloqueo Y Pendientes

Esta guía explica qué debe hacer el personal cuando un paciente inicia una
visita, pero decide no continuar antes de completar la atención.

## Tres Cierres Diferentes

SIGECO diferencia:

- **Atención completada:** el paciente terminó lo que correspondía.
- **Cancelación:** la visita se anuló y no representa un abandono durante la
  atención.
- **No continuará:** el paciente ya estaba en el recorrido y se retiró antes de
  completar algo.

“No continuará” no puede registrarse desde el selector general de estado.
Siempre exige el formulario detallado.

## Qué Se Registra

El evento conserva:

- estado y área donde se detuvo la visita;
- motivo obligatorio;
- nota opcional;
- usuario que lo registró;
- fecha y hora;
- pendientes detectados o seleccionados;
- seguimiento de recuperación, cuando existe.

Los motivos disponibles son tiempo de espera, costo, rechazo, emergencia,
falta de insumo, derivación a otro lugar y otro motivo.

## Qué Puede Quedar Pendiente

El personal puede marcar consulta, estudio, aplicación o procedimiento, cobro,
entrega y seguimiento.

SIGECO también revisa la visita y agrega pendientes que ya existan. Por ejemplo:

- una orden de suero sin completar agrega **Aplicación**;
- un saldo por pagar agrega **Cobro**;
- un producto no entregado agrega **Entrega**;
- una orden de análisis pendiente agrega **Estudio**.

Las tareas de área y órdenes clínicas abiertas cambian a **Bloqueada**. No se
borran ni se dan por terminadas. Todo pendiente aparece en el reporte de
abandonos; las tareas bloqueadas de Enfermería y Administración también
permanecen en sus bandejas para que el área sepa qué quedó sin resolver.

## Seguimiento De Recuperación

El empleado puede solicitar un seguimiento al registrar el abandono.

SIGECO lo crea únicamente si la decisión vigente de consentimiento para
seguimiento está concedida. La tarea:

- es de recuperación de tratamiento;
- tiene prioridad alta;
- se programa para el día siguiente;
- busca una cuenta activa de Recepción llamada Marlen;
- nunca se asigna automáticamente a Yazmin.

Si no existe consentimiento, el abandono se registra igualmente, pero no se
crea contacto. La pantalla lo informa de forma visible.

## Dónde Está La Acción

La acción **No continuará** está disponible para las áreas operativas:

- Recepción;
- Médico;
- Enfermería;
- Administración.

En móvil mantiene controles táctiles y exige seleccionar el motivo antes de
mostrar la confirmación irreversible.

## Reporte

La ruta `/sigeco/recepcion/abandonos` muestra:

- cantidad de visitas detenidas;
- cantidad de pendientes conservados;
- abandonos con seguimiento;
- agrupación por motivo;
- paciente, punto, área, fecha, responsable y pendientes.

Puede filtrarse por motivo y rango de fechas. Dirección puede consultar el
reporte, pero no registrar abandonos.

## Datos Anteriores

La migración registra de manera conservadora los abandonos que ya existían.
Se clasifican como **Otro motivo** y no se inventan pendientes históricos que
el personal nunca documentó.

## Validación Antes De Producción

Antes de aplicar la migración fuera de desarrollo:

1. probar un abandono desde cada área;
2. confirmar que tareas y órdenes abiertas queden bloqueadas;
3. probar con y sin consentimiento vigente;
4. revisar la asignación a Marlen;
5. validar el reporte con Dirección;
6. ejecutar la integración y el QA responsive acumulados;
7. solicitar autorización expresa antes de producción.
