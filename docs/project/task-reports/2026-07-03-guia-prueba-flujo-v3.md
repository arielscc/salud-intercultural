# Guia De Prueba Flujo V3

Fecha: 2026-07-03

## Objetivo

Crear una guia operativa documentada para probar de punta a punta el flujo V3 completo implementado en Sigeco hasta V3.6.

## Cambios Implementados

- Se agrego [Guia de prueba manual - Flujo completo V3 Sigeco](../../operations/sigeco-v3-full-flow-testing.md).
- Se documento el recorrido `Lead -> Paciente -> Visita -> Consulta -> Enfermeria -> Administracion -> Cobro -> Inventario -> Seguimiento`.
- Se incluyeron precondiciones, comandos locales, datos sugeridos de QA, criterios de aprobacion, evidencias y pruebas negativas minimas.
- Se agregaron los datos de prueba debajo de cada punto del flujo, con valor exacto por campo y proposito operativo.
- Se revisaron las rutas reales de `/sigeco` y se agregaron pantallas/formularios faltantes: filtros de leads, pacientes y visitas; detalle de inventario con entrada y ajuste; bandejas de consulta, enfermeria, administracion y seguimiento.
- Se corrigio la seccion de creacion de lead para distinguir la bandeja `/sigeco/leads` del formulario `/sigeco/leads/nuevo`, y se alineo la validacion negativa con el schema actual: telefono obligatorio, nombre opcional.
- Se alineo la etiqueta de estado de enfermeria con la interfaz actual: `Recibida` en lugar de `Tomada`.
- Se enlazo la guia desde el indice de operaciones.
- Se enlazo la guia desde el estado central de implementacion V3.

## Decisiones

- La guia vive en `docs/operations` porque es un procedimiento repetible de validacion.
- El tablero de V3 mantiene el estado del proyecto y apunta a la guia como herramienta de QA.
- Las credenciales se documentan como variables y placeholders para evitar versionar passwords reales.
- La prueba exige evidencia mobile en 390px porque los reportes V3 repiten ese pendiente.

## Validacion

- Cambio documental. No se ejecutaron suites de aplicacion.
- `git diff --check` paso sin errores.

## Pendientes

- Ejecutar una corrida real siguiendo la guia.
- Registrar bugs encontrados con ruta, pasos y evidencia.
- Automatizar con pruebas E2E los caminos criticos que se repitan en QA manual.
