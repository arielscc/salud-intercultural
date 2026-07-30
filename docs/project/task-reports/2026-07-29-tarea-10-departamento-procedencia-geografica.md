# Reporte De Cambios — Tarea 10: Departamento Y Procedencia Geográfica

## Fecha

2026-07-29.

## Objetivo

Separar ciudad, departamento y país; distinguir la residencia habitual del
origen de cada visita; y permitir medir llegadas y retornos desde Cochabamba.

## Cambios

- La ficha del paciente conserva ciudad, departamento y país de procedencia
  habitual.
- Cada visita guarda su propia ciudad, departamento, país y si coincide con la
  ficha.
- Una visita cerrada no depende de cambios posteriores en el paciente.
- El formulario de llegada ofrece opciones rápidas para El Alto, La Paz,
  Cochabamba, Santa Cruz de la Sierra y Oruro.
- Se incorporó búsqueda de ciudades, catálogo ampliado y entrada **Otro**.
- Bolivia exige departamento; para otros países, estado o provincia es
  opcional.
- Las ciudades conocidas se normalizan con su departamento correcto. `Cbba`,
  por ejemplo, queda como Cochabamba, Cochabamba, Bolivia.
- El último paso pregunta si la persona llegó hoy desde su residencia habitual
  y muestra campos separados cuando la respuesta es negativa.
- La edición de ficha modifica solamente la procedencia habitual.
- La ficha, el historial y el detalle de visita muestran el origen
  correspondiente.
- Recepción puede filtrar pacientes habituales y visitas por ciudad y
  departamento en escritorio, tableta y móvil.
- Los fixtures sintéticos incluyen una visita desde Cochabamba para el futuro
  QA de staging.

## Base De Datos

- Migración `20260729190000_patient_geographic_origin`.
- Nuevo campo `Patient.country`.
- Nuevos campos históricos en `Visit`: `originCity`, `originDepartment`,
  `originCountry` y `originMatchesPatient`.
- Índices por ciudad, departamento, país y fecha.
- Los datos anteriores se completan con la mejor información disponible en la
  ficha; si no existía, quedan explícitamente como `No informado`.
- Migración aplicada únicamente en `salud_intercultural_dev`.
- Staging y producción no fueron modificados.

## Pruebas Preparadas

- Normalización de ciudades, países y abreviaciones.
- Departamento obligatorio para Bolivia.
- Procedencia internacional sin estado obligatorio.
- Procedencia habitual diferente de la visita.
- Preservación de una visita cerrada desde Cochabamba.
- Filtros por ciudad y departamento.

## Validación Local

- `pnpm typecheck`: aprobado.
- `pnpm exec prisma validate`: aprobado.
- Migración local: aplicada correctamente.
- Pruebas específicas: 18 aprobadas en 3 archivos.
- `pnpm lint`: aprobado sin advertencias.
- `git diff --check`: aprobado.
- Integración completa y QA de gstack: aplazados para el cierre de todas las
  tareas, por decisión del usuario.

## Pendientes

- Ejecutar la integración completa al finalizar el conjunto de tareas.
- Aplicar migración y seed en staging.
- Validar con Recepción los nombres frecuentes y añadir municipios si el uso
  real lo requiere.
- Ejecutar el QA integral de gstack al cierre de todas las tareas.
- Solicitar autorización antes de cualquier cambio en producción.

La implementación local queda **en progreso** hasta completar integración y QA
acumulados.

## Commit Sugerido

`feat(sigeco): capture geographic origin`
