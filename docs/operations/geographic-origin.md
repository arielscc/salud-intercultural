# Departamento Y Procedencia Geográfica

Esta guía explica cómo registrar y consultar la procedencia de pacientes y
visitas en SIGECO.

## Dos Datos Diferentes

SIGECO conserva dos procedencias:

1. **Procedencia habitual:** lugar donde vive normalmente el paciente. Se
   guarda en su ficha y puede corregirse cuando cambie de residencia.
2. **Procedencia de la visita:** lugar desde el que llegó para esa atención. Se
   guarda dentro de la visita y no cambia cuando se edita la ficha.

Ejemplo: una persona vive en El Alto, está temporalmente en Cochabamba y viaja
desde Cochabamba para su control. Su ficha conserva El Alto y la visita conserva
Cochabamba.

## Cómo Registrar Una Llegada

1. En el primer paso, elegir una ciudad frecuente o buscarla.
2. Si no aparece, usar **Otro** y escribir la ciudad.
3. Confirmar país y, cuando sea Bolivia, el departamento.
4. En el último paso, indicar si hoy llegó desde el mismo lugar.
5. Si llegó desde otro lugar, completar la procedencia de esa visita.
6. Finalizar el registro.

El Alto, La Paz, Cochabamba, Santa Cruz de la Sierra y Oruro están disponibles
como opciones rápidas. El catálogo también reconoce otras ciudades principales
y normaliza abreviaciones frecuentes como `Cbba`.

## Reglas

- Una llegada nueva necesita ciudad y país.
- Si el país es Bolivia, también necesita departamento.
- Una ciudad conocida se enlaza con su departamento correcto. Por ejemplo,
  Cochabamba no puede quedar dentro del departamento de La Paz.
- Para otro país, el estado, provincia o departamento es opcional.
- Una visita cerrada conserva su procedencia histórica aunque después cambie la
  procedencia habitual del paciente.
- Los registros anteriores a la Tarea 10 usan la mejor procedencia disponible
  en la ficha al momento de la migración. Si no existía, muestran
  `No informado`.

## Filtros

En **Recepción → Visitas**, ciudad y departamento filtran la procedencia de cada
visita. Esto permite contar, por ejemplo, llegadas y retornos desde Cochabamba.

En **Recepción → Pacientes**, los mismos filtros se aplican a la procedencia
habitual.

## Ambientes

La migración `20260729190000_patient_geographic_origin` está aplicada únicamente
en desarrollo local. Antes de staging o producción se debe:

1. ejecutar la migración y el seed sintético en staging;
2. probar una llegada habitual de El Alto;
3. probar una visita que llega desde Cochabamba;
4. cerrar la visita, cambiar la ficha y confirmar que el origen histórico no
   cambió;
5. revisar filtros en escritorio y móvil.

No se debe ejecutar la migración en producción sin autorización expresa.
