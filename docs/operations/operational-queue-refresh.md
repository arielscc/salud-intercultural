# Actualización De Bandejas Operativas

Esta guía explica cómo se mantienen actualizadas las bandejas de Recepción,
Consulta, Enfermería y Administración sin recargar toda la aplicación.

## Comportamiento Normal

SIGECO usa polling controlado mediante `router.refresh()`:

- escritorio: cada 30 segundos;
- móvil: cada 60 segundos;
- botón `Actualizar ahora`: disponible en ambas vistas;
- advertencia: aparece cuando transcurrieron dos intervalos sin una
  actualización confirmada.

La actualización vuelve a ejecutar las consultas de la página y combina el
resultado con la interfaz actual. No cambia la URL, por lo que conserva filtros,
paginación y la visita seleccionada.

## Cuándo Se Pausa

La bandeja no inicia nuevas solicitudes cuando:

- la pestaña está en segundo plano;
- el dispositivo está sin conexión;
- ya existe una actualización en curso;
- hay campos o filtros modificados que todavía no fueron aplicados.

Al volver a la pestaña o recuperar conexión se programa una sola actualización.
No se acumulan solicitudes correspondientes al tiempo que la página estuvo
pausada.

## Protección De Formularios

Antes de refrescar, SIGECO compara los controles del formulario con sus valores
iniciales. También reconoce componentes controlados, como la búsqueda de
pacientes y el selector de rango de fechas.

Si detecta cambios:

1. detiene el polling;
2. muestra `Hay cambios sin aplicar`;
3. conserva lo escrito;
4. permite volver a actualizar después de aplicar o deshacer los cambios.

El botón manual tampoco ignora esta protección.

## Qué Significa La Hora Mostrada

`Actualizada hace…` indica cuándo terminó la última revisión de la bandeja. No
significa que necesariamente se haya creado o modificado un registro.

Si la revisión tarda más de 20 segundos, se libera la solicitud y aparece una
advertencia para intentar nuevamente. Mientras una solicitud está activa no se
inicia otra.

## Medición Técnica

Antes de considerar SSE o WebSocket, el navegador registra métricas anónimas de
la sesión:

- actualizaciones automáticas y manuales;
- actualizaciones completadas o fallidas;
- bloqueos por formularios sin aplicar;
- pausas por conexión o pestaña oculta;
- duración total y duración de la última actualización.

Se guardan solamente en `sessionStorage`, bajo claves como:

```text
sigeco.queue-refresh.v1.reception
sigeco.queue-refresh.v1.consultations
sigeco.queue-refresh.v1.nursing
sigeco.queue-refresh.v1.administration
```

No incluyen nombres, fichas, diagnósticos ni otros datos del paciente. Estas
métricas permiten validar el comportamiento local y en staging sin agregar
eventos a la base de datos. Una medición centralizada futura requerirá una
decisión separada de privacidad.

## Por Qué Todavía No Usa Tiempo Real

El polling visible y pausado es suficiente para el volumen actual de la
clínica, es más sencillo de recuperar cuando falla la conexión y evita mantener
canales permanentes por cada estación.

SSE o WebSocket se evaluarán únicamente si las mediciones y el piloto muestran
que 30 segundos en escritorio no cubren el trabajo real.

## Validación En Staging

Antes de producción:

1. abrir las cuatro bandejas con sus roles correspondientes;
2. derivar una visita de Recepción a Consulta, Enfermería y Administración;
3. confirmar que cada cambio aparezca dentro del intervalo acordado;
4. dejar una pestaña oculta y verificar que no acumule solicitudes;
5. modificar un filtro sin aplicarlo y verificar que lo escrito se conserve;
6. probar desconexión y reconexión en móvil;
7. revisar las métricas de sesión;
8. completar el QA responsive acumulado.

Esta tarea no agrega migraciones ni modifica la base de datos. Producción no
debe modificarse sin autorización expresa.
