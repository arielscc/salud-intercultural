# Progreso De Sigeco Movil Primero

Registro vivo de la iniciativa definida en `docs/project/sigeco-movil/tareas-de-movil.md`. Cada tarea deja aqui su entrada al implementarse: que se hizo, hallazgos, pendientes y commit sugerido. Las validaciones (lint, tsc, tests, QA de navegador) se corren todas juntas en la Tarea 11, no por tarea.

## Estado General

| Tarea | Nombre | Estado |
| --- | --- | --- |
| 1 | Patron de lista responsive y Recepcion en cards | Pendiente |
| 2 | Resto de listas de trabajo en cards | Pendiente |
| 3 | Feedback de acciones con toasts (sonner) | Pendiente |
| 4 | Confirmacion de acciones irreversibles | Pendiente |
| 5 | Estados de carga (skeleton y spinner) | Pospuesta (compartida con web) |
| 6 | Busqueda de pacientes con autocomplete | Pendiente |
| 7 | Acciones principales y retorno en detalles moviles | Pendiente |
| 8 | Filtros y tabs tactiles | Pendiente |
| 9 | Telefono con mascara y teclado numerico | Pendiente |
| 10 | Paginacion de listas largas | Pospuesta (compartida con web) |
| 11 | QA integral y cierre documental | Pendiente |

## Contexto Y Decisiones (2026-07-14)

- Origen: el usuario pidio una evaluacion completa de diseno y usabilidad de Sigeco orientada a uso mayoritario desde telefonos, reutilizando componentes de shadcn studio. La evaluacion completa (fortalezas, 10 hallazgos priorizados y mapa de componentes) vive en la seccion "Evaluacion Completa" del doc de tareas.
- Modo de trabajo acordado para la tanda: solo implementar UI y documentar; nada de tests/QA por tarea. Todo se valida junto en la Tarea 11.
- Base ya construida antes de esta iniciativa (ver progreso de simplificacion): drawer de navegacion movil (vaul), KPIs compactos 3x2 con tonos, acciones del header del dashboard al 50% en movil, pickers de fecha/hora en popover, fechas centralizadas en date-fns.
- Instalacion de componentes: los "components" de shadcn studio son gratuitos e instalables con CLI (`pnpm dlx shadcn@latest add @ss-components/...`, estilo `radix-vega` ya configurado en `components.json`); los "blocks" (statistics, widgets) son de cuenta paga y se replican a mano. Todo se adapta a Tailwind 3.4 + tokens Marea.
- Los `<select>` nativos se conservan dentro de formularios por decision explicita (el picker del sistema es mejor experiencia en movil); ver Tarea 8.
- Orden recomendado de implementacion: el del doc de tareas (impacto descendente segun la tabla de hallazgos). Las tareas 1-2 (listas) desbloquean la mayor ganancia; 3-5 dan percepcion de solidez; 6-10 pulen flujos concretos.

## Contexto Y Decisiones (2026-07-15)

- El usuario endurecio el alcance: las tareas modifican solo la version movil; la version web/desktop no cambia en nada visible ni de comportamiento. La regla transversal 4 del doc de tareas se reescribio con las tres tecnicas de aislamiento permitidas (ramas CSS por breakpoint, `matchMedia` en el handler, atributos inertes en desktop).
- Se hizo investigacion externa de arquitectura de informacion y presentacion de datos en movil (NN/g, UXmatters, CSS-Tricks y otros); resultados y fuentes en `docs/project/sigeco-movil/investigacion-diseno-movil.md`. La investigacion valida el patron cards-bajo-sm de las Tareas 1-2, define las guias de bottom sheet para la Tarea 4 (modal, scrim, cierre visible, confirmar en rojo con verbo + sustantivo) y fundamenta los atributos de teclado de la Tarea 9.
- Tareas 5 (estados de carga) y 10 (paginacion) quedan pospuestas: no pueden aislarse a movil (`loading.tsx`, estados pending y datos paginados afectan ambos viewports). Se retomaran cuando el usuario habilite cambios compartidos.
- Orden de ejecucion resultante: 1, 2, 7, 3, 4, 6, 8, 9, 11.
- La Tarea 11 (QA) suma la verificacion explicita "desktop intacto" en 1280px sobre toda pantalla tocada.

## Entradas Por Tarea

(sin entradas todavia; se agregan al implementar cada tarea)
