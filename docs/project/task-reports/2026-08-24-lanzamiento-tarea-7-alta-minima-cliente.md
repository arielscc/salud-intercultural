# Tarea 7: alta mínima de cliente desde Administración

## Fecha

2026-08-24

## Objetivo

Poder cobrarle a alguien sin abrir una visita ni depender de Recepción. Es el
primero de los tres bloqueos que impedían vender sin la ruta clínica:
`Sale.patientId` y `Payment.patientId` son obligatorios y el único alta de
paciente era el funnel de Recepción, que abre visita, ruta y tarea operativa.

Plan: [Lanzamiento por etapas](../sigeco-lanzamiento-por-etapas/tasks.md).

## Cambios Implementados

### Permisos

`administracion` suma `patients_create` y `patients_update`. Sigue sin
`visits_create`: registrar una llegada es otra cosa y la hace Recepción.

### Alta mínima

`walkInClientSchema` pide nombre y teléfono; teléfono alternativo y una
observación son opcionales. Nada más: es lo que hace falta para cobrar y para
volver a encontrar la ficha. Fecha de nacimiento, procedencia, alergias y
antecedentes los completa Recepción en su funnel cuando la persona venga a una
atención.

`registerWalkInClientAction` reutiliza `createPatientRecord`, la misma función
que usa el funnel: genera el código interno, normaliza nombre y teléfono para la
detección de duplicados y **no** crea `Visit`, `PatientRoute` ni `VisitWorkItem`.
La ficha resultante es una ficha normal.

### Las fichas parecidas se muestran, no se esconden

Antes de crear, el servidor busca coincidencias con
`findPossibleDuplicatePatients` —la misma detección de la Tarea 12 del plan
integral—. Si encuentra alguna, la acción **devuelve** las candidatas en lugar de
redirigir, y el formulario las muestra con un enlace para usar esa ficha o un
botón para confirmar que es otra persona.

Devolver el resultado en vez de redirigir no es un capricho: poner nombres y
teléfonos en la URL los deja en el historial del navegador, en los logs del
servidor y en cualquier referer. Hay una prueba de privacidad en el repositorio
que vigila exactamente eso.

### Pantallas

- `/sigeco/administracion/clientes`: búsqueda por nombre, teléfono o código, y
  los últimos clientes.
- `/sigeco/administracion/clientes/nuevo`: el formulario corto.
- `/sigeco/administracion/clientes/[id]`: ficha de Administración con contacto,
  observación y las ventas del cliente.

Las tres se guardan con el módulo `administracion` fijado, así que pertenecen a
Caja y no a Recepción aunque compartan el permiso `patients_read`.

La ficha de Administración usa una consulta propia, `getWalkInClientById`, que
trae identificación y contacto y **no** trae alergias, antecedentes ni
medicación. Administración no necesita esos datos para cobrar y no debería
cargarlos. El enlace a la ficha clínica completa aparece solo cuando Recepción
está lanzada.

## Decisiones

### No se agregó documento de identidad

El plan mencionaba "documento" entre los campos opcionales. **No se implementó**:
el modelo `Patient` no tiene ese campo y el funnel de Recepción tampoco lo pide,
así que el sistema no modela documentos en ninguna parte. Agregarlo solo acá
dejaría a Administración con un dato que Recepción no puede ver ni completar, y
obligaría a decidir si entra en la detección de duplicados y si debe ser único.
Es una decisión de identidad del paciente que merece su propia tarea, no un
agregado lateral de esta.

Si Dirección lo necesita para el recibo o para identificar clientes, conviene
tratarlo como cambio de la ficha del paciente, no del alta de mostrador.

### La ficha es una sola, desde el principio

No hay un modelo "cliente" separado del paciente. Cuando Recepción se lance, la
misma ficha recibe visitas sin migrarse ni duplicarse, y si alguien la vuelve a
registrar, la detección de duplicados la encuentra. Un modelo aparte habría
partido el historial de la persona en dos.

## Validación

- `pnpm typecheck`: sin errores.
- `npx eslint src scripts --max-warnings=0`: sin errores.
- Pruebas unitarias: 471 en total, 466 aprobadas (los cinco fallos previos de
  siempre). Nuevas: validación del formulario corto y la matriz de permisos de
  Administración.
- **Verificación real contra la base de desarrollo**, creando y borrando una
  ficha de prueba:
  - `creado: SI-000014 Cliente Prueba Mostrador`
  - `visitas: 0 | rutas: 0 | tareas: 0`
  - la detección de duplicados encontró la ficha por su teléfono
  - la ficha de Administración devolvió `{"visits":0,"sales":0}`
- Integración escrita y no ejecutada, en `patients-visits.integration.test.ts`:
  la ficha se crea sin visita, después acepta una visita normal sin duplicarse, y
  no guarda datos clínicos.

## Pendientes

- Cobrarle a este cliente es la Tarea 8: hoy la ficha existe y se puede buscar,
  pero la venta todavía nace de la bandeja del médico.
- QA de navegador del formulario y del caso de duplicados, en móvil y escritorio:
  cierre acumulado (Tarea 12).
- Editar los datos del cliente desde Administración: el permiso
  `patients_update` ya está, la pantalla es trabajo posterior. Hoy se corrige
  desde Recepción cuando ese módulo esté lanzado.
