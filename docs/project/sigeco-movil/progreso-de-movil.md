# Progreso De Sigeco Movil Primero

Registro vivo de la iniciativa definida en `docs/project/sigeco-movil/tareas-de-movil.md`. Cada tarea deja aqui su entrada al implementarse: que se hizo, hallazgos, pendientes y commit sugerido. Las validaciones (lint, tsc, tests, QA de navegador) se corren todas juntas en la Tarea 11, no por tarea.

## Estado General

| Tarea | Nombre | Estado |
| --- | --- | --- |
| 1 | Patron de lista responsive y Recepcion en cards | Implementada (QA en Tarea 11) |
| 2 | Resto de listas de trabajo en cards | Implementada (QA en Tarea 11) |
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

### Tarea 1 — Patron De Lista Responsive Y Recepcion En Cards (2026-07-15)

Que se hizo:

- Nuevo `src/components/internal/ui/RecordList.tsx` con cuatro piezas: `RecordList` (ul con `divide-y`, solo movil via `sm:hidden`), `RecordItem` (fila tocable: titulo con link estirado `after:absolute after:inset-0` que hace tap-target a toda la fila, status arriba a la derecha, lineas secundarias libres como children, accion opcional abajo a la derecha con `relative` para quedar sobre el link estirado), `RecordListEmpty` (estado vacio) y `RecordTable` (wrapper `hidden sm:block` que conserva la tabla actual intacta en desktop). Sin dependencias nuevas: es el patron list/card de shadcn studio replicado con tokens Marea (no hay item gratuito equivalente en el registry para listas de registros).
- `recepcion/page.tsx`: ambas vistas dentro del mismo `Card p-0` ahora renderizan `RecordList` (movil) + `RecordTable` con la `Table` original (desktop). Vista Hoy: titulo = paciente, pill de estado, linea llegada + area, linea telefono, chip "N pendientes" solo si hay, y "Se retiro" como boton separado con target `min-h-10` (40px). Vista Pacientes: titulo = nombre, chip "N visitas", linea codigo + telefono, linea ciudad (solo si tiene).
- Deduplicaciones en la pagina: el form "Se retiro" se extrajo a `VisitLeftForm` (usado por tabla y card) y los mensajes de vacio a `emptyVisitsMessage`/`emptyPatientsMessage` (usados por ambas presentaciones).

Decisiones:

- Filas divididas dentro del Card (patron lista) en vez de cards sueltas con borde propio: mayor densidad y menos ruido visual en 390px, alineado con la investigacion (registro = titulo + 1-2 datos + estado; el detalle vive en su pagina).
- En movil el chip "Tareas" se omite cuando es cero (en la tabla se muestra "—"); la ausencia comunica lo mismo y ahorra una linea.
- Regla solo movil respetada: la tabla desktop no cambio ni una clase; el markup movil es rama nueva `sm:hidden`.

Pendientes para el QA (Tarea 11): verificar que el link estirado no tape el boton "Se retiro" en dispositivos reales; revisar nombres largos junto a pills anchas en 390px.

Validaciones: pendientes — QA integral al final de la tanda de tareas de diseno.

Commit sugerido: `feat(sigeco): add responsive record list and apply to reception`

### Tarea 2 — Resto De Listas De Trabajo En Cards (2026-07-15)

Que se hizo:

- `RecordItem` se extendio para las tablas secundarias: `href` ahora es opcional (filas no navegables como items de venta, pagos y movimientos renderizan el titulo como texto y no llevan estado activo tactil) y `title` acepta ReactNode (titulos con formato: fecha de visita, montos en tabular-nums).
- Bandejas convertidas (mismo patron de la Tarea 1: `RecordList` movil + `RecordTable` con la tabla intacta):
  - Consultas: titulo paciente, pill de estado, llegada + area, telefono, chip "Registrada" si hay consulta.
  - Enfermeria: titulo paciente, chip de estado, codigo, tarea (font-medium, truncada), descripcion, indicacion (tipo + medico).
  - Caja (pendientes derivados): titulo paciente, chip de venta/area con tono, codigo, tarea, descripcion, indicacion, total + saldo.
  - Seguimientos: titulo paciente, chip de estado, "Vence {fecha}" como primera linea (en error si vencido), tarea, codigo + telefono, aviso "Pidio no recibir seguimiento".
  - Inventario (productos): titulo producto, chip "Stock bajo" solo si aplica, codigo + SKU, "Stock X · Minimo Y" con stock resaltado, mensaje de alerta si existe.
- Tablas secundarias convertidas: ultimas llegadas del dashboard (hora + area), visitas de la ficha de paciente (fecha como titulo + area), cronologia administrativa de la ficha (total como titulo, chip de estado, pagado + saldo), detalle de venta (descripcion + total destacado, tipo + cantidad x precio), pagos de venta (monto como titulo, chip de metodo, fecha, referencia) y movimientos de inventario (tipo como titulo, delta con color como status, stock despues + fecha, motivo).
- Mensajes de vacio compartidos entre tabla y lista movil en cada pagina (constantes extraidas para los multilinea; los de una linea se reutilizan inline).

Decisiones:

- En movil, "Vence" en seguimientos sube a primera linea (el vencimiento es el dato operativo del modulo; el doc de tareas pedia vencimiento visible).
- En las cards se agrego contexto minimo que en la tabla daba el header ("Vence", "Stock", "Stock despues", "Pagado", "Ref."), siguiendo la guia de no depender de encabezados en filas moviles.
- Valores "—" de columnas opcionales (SKU, ciudad, referencia, tarea sin chip) se omiten en la card en vez de mostrarse vacios.
- Regla solo movil respetada en las 9 paginas tocadas: ninguna tabla desktop cambio de markup; todo lo nuevo vive en ramas `sm:hidden`.

Pendientes para el QA (Tarea 11): cards de Caja con 5 lineas (verificar densidad en 390px); truncados con `min-w-0` dentro del grid; verificar que el detalle de venta sin filas vacias no muestre lista vacia sin mensaje (los items de venta siempre existen).

Validaciones: pendientes — QA integral al final de la tanda de tareas de diseno.

Commit sugerido: `feat(sigeco): render all work queues as cards on mobile`
