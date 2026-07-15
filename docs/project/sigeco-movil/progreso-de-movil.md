# Progreso De Sigeco Movil Primero

Registro vivo de la iniciativa definida en `docs/project/sigeco-movil/tareas-de-movil.md`. Cada tarea deja aqui su entrada al implementarse: que se hizo, hallazgos, pendientes y commit sugerido. Las validaciones (lint, tsc, tests, QA de navegador) se corren todas juntas en la Tarea 11, no por tarea.

## Estado General

| Tarea | Nombre | Estado |
| --- | --- | --- |
| 1 | Patron de lista responsive y Recepcion en cards | Implementada (QA en Tarea 11) |
| 2 | Resto de listas de trabajo en cards | Implementada (QA en Tarea 11) |
| 3 | Feedback de acciones con toasts (sonner) | Implementada (QA en Tarea 11) |
| 4 | Confirmacion de acciones irreversibles | Implementada (QA en Tarea 11) |
| 5 | Estados de carga (skeleton y spinner) | Implementada (QA en Tarea 11) |
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
- El usuario habilito despues la excepcion compartida necesaria para la Tarea 5. Skeletons y estados pending pasan a movil y escritorio; la Tarea 10 sigue pospuesta.

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

### Tarea 3 — Feedback De Acciones Con Toasts (2026-07-15)

Que se hizo:

- Dependencia nueva: `sonner` 2.0.7 (instalada directa con pnpm; el item de shadcn studio arrastra next-themes y demos, se replico el wrapper a mano como con el drawer).
- `src/components/ui/sonner.tsx`: Toaster adaptado a Marea (unstyled + classNames con tokens: `bg-surface`, `border-border`, radio 9px, titulo `text-text`, icono por tipo con `text-success`/`text-error`/`text-warning`), posicion `bottom-center` (zona del pulgar), duracion 3.5 s.
- Montaje solo movil en `(app)/layout.tsx`: `<div className="sm:hidden"><Toaster /></div>` dentro de `InternalShell` (queda dentro de `.sigeco-app`, los tokens resuelven; position fixed no se recorta porque no hay ancestros con transform). En >= 640 px el contenedor se oculta y desktop no muestra ningun toast.
- Mecanismo 1 — actions que redirigen: se agrego `?aviso=<codigo>` al redirect de exito en 6 actions (`submitReceptionIntakeAction` y `createVisitAction` -> `llegada-registrada`, `updateReceptionPatientAction` -> `ficha-actualizada`, `createFollowUpTaskAction` -> `seguimiento-creado`, `createInventoryItemAction` -> `producto-creado`, `createSaleAction` -> `venta-creada`). `src/components/internal/ActionNotice.tsx` (cliente, montado en el layout bajo Suspense) lee el param, dispara el toast y limpia la URL con `router.replace` sin scroll.
- Mecanismo 2 — actions que solo revalidan: `src/components/internal/NoticeForm.tsx` (cliente) envuelve el form con `useActionState`, ejecuta la server action recibida por prop y dispara el toast al resolver; si la action termina en redirect (exito con destino o `?error=`), el toast no se dispara y lo maneja la pagina destino. Aplicado en 8 paginas: recepcion (Se retiro), detalle de visita (Cerrar visita, Se retiro, Actualizar ruta), consulta (Guardar consulta, Crear indicacion, 3 salidas del paciente), enfermeria (signos, aplicacion, estudio, estado de tarea, nota), venta (Registrar pago), seguimiento (contacto), inventario item (entrada, ajuste), caja workItem (Cerrar visita, Se retiro).
- Mensajes cortos en espanol: "Llegada registrada", "Visita cerrada", "Retiro registrado", "Consulta guardada", "Cobro registrado", etc.

Decisiones:

- El toast se dispara tambien en desktop (NoticeForm no distingue viewport) pero el Toaster esta oculto desde `sm`, asi que desktop no muestra nada y su flujo queda identico; se evito `matchMedia` porque el aislamiento CSS basta.
- Los errores de validacion mantienen su comportamiento actual (redirects `?error=` y avisos inline); fuera de alcance por definicion de la tarea.
- Se cubrieron tambien acciones hermanas de las listadas (estudio, nota y estado en enfermeria, entrada de stock, venta creada) por vivir en las mismas paginas y costar una linea cada una.

Pendientes para el QA (Tarea 11): verificar que el toast no tape el boton recien tocado en 390x844; probar aviso + limpieza de URL con filtros activos (`?vista=pacientes&aviso=...`); confirmar que NoticeForm no rompe el submit sin JS (progressive enhancement de useActionState).

Validaciones: pendientes — QA integral al final de la tanda de tareas de diseno.

Commit sugerido: `feat(sigeco): add sonner toasts for action feedback`

### Tarea 4 — Confirmacion De Acciones Irreversibles (2026-07-15)

Que se hizo:

- `src/components/internal/ConfirmForm.tsx` (cliente): form para acciones irreversibles sobre el Drawer vaul ya instalado. En el submit evalua `window.matchMedia("(max-width: 639px)")`; en movil hace preventDefault y abre un bottom sheet modal (scrim, handle, Escape y arrastre para cancelar) con titulo verbo + sustantivo, la consecuencia explicada, boton confirmar en variante `danger` (rojo) y boton Cancelar visible (guias NN/g). Al confirmar hace `requestSubmit()` del form con un flag que deja pasar el segundo submit. En desktop `matches` es false y el submit pasa directo, identico a hoy. Integra el toast de exito de la Tarea 3 (useActionState, mismo patron de NoticeForm).
- Aplicado reemplazando NoticeForm por ConfirmForm en todos los flujos irreversibles (`applyVisitFlowAction` con `complete` o `left`):
  - Recepcion, fila "Se retiro" (card movil y tabla): `VisitLeftForm` ahora recibe `patientName` para la consecuencia ("La visita de {nombre} se cerrara como retiro...").
  - Detalle de visita: "Cerrar visita" y "Se retiro sin completar".
  - Consulta: "Se va — cerrar visita" (las derivaciones a enfermeria/administracion siguen sin confirmacion: son reversibles via ruta).
  - Caja (workItem): "Cerrar visita" y "Se retiro sin completar".

Decisiones:

- Se extendio el alcance a Consulta y Caja (el doc listaba recepcion + detalle de visita) porque el criterio de aceptacion es global ("ningun toque simple ejecuta una accion irreversible en movil") y los mismos flujos `complete`/`left` viven ahi; costo marginal.
- "Actualizar ruta" y las derivaciones quedan como NoticeForm sin confirmacion: son acciones reversibles (fuera de alcance por definicion).
- Confirmar en rojo tambien para "Cerrar visita" (no es negativa pero si irreversible; el rojo comunica irreversibilidad segun la investigacion).
- No se instalo alert-dialog: el drawer bottom cubre movil y en desktop no hay confirmacion por la regla solo movil.

Pendientes para el QA (Tarea 11): confirmar que el sheet abre sobre el teclado tactil cerrado; verificar doble submit rapido (flag `confirmedRef`); probar cancelar por arrastre, Escape y boton; verificar en desktop que el submit sigue directo sin flash del drawer.

Validaciones: pendientes — QA integral al final de la tanda de tareas de diseno.

Commit sugerido: `feat(sigeco): confirm irreversible visit actions with bottom sheet`

### Tarea 5 — Estados De Carga: Skeleton Y Spinner (2026-07-15)

Que se hizo:

- Nuevo `src/components/internal/ui/Skeleton.tsx`: bloque de carga con `animate-pulse`, radio Marea de 7px y `bg-surface-soft`. Se replico el patron simple de skeleton en lugar de instalar demos o dependencias adicionales.
- Nuevo `src/components/internal/ModuleLoading.tsx`: compositor accesible con `role=status`, aviso para lectores de pantalla y siluetas estables de `PageHeader`, KPIs, lista y panel lateral. Recibe cantidad de KPIs, acciones, filas y presencia de rail para parecerse a cada modulo sin duplicar markup.
- Boundaries `loading.tsx` para dashboard, Recepcion, Consulta, Enfermeria, Caja, Seguimiento e Inventario. Los boundaries de modulo cubren tambien sus rutas de detalle mientras los Server Components resuelven datos.
- `src/components/internal/SubmitButton.tsx` generaliza `useFormStatus`: deshabilita durante el envio, expone `aria-busy`, muestra spinner y admite texto pending sin perder variantes ni tamanos del `Button` Marea.
- Los formularios principales de Recepcion, Consulta, Enfermeria, Caja, Seguimiento e Inventario usan `SubmitButton`, incluidos funnel de llegada y edicion de paciente. El login interno tambien muestra progreso. Los forms GET de busqueda y filtros se conservan porque no ejecutan server actions y su UX se resuelve en las Tareas 6 y 8.

Decisiones:

- Excepcion aprobada a la regla solo movil: `loading.tsx` y `useFormStatus` cambian necesariamente el comportamiento compartido. El feedback de carga queda activo tambien en escritorio.
- No se agrego Suspense granular ni se tocaron queries. Cada boundary reemplaza el contenido de la ruta dentro del shell existente, que permanece visible y navegable.
- Un solo compositor mantiene coherencia visual y permite que cada modulo ajuste su silueta con props pequenas, sin crear siete copias divergentes.

Pendientes para el QA (Tarea 11): simular navegacion lenta en un navegador sin rutas precargadas para medir que el skeleton aparezca sin flash, confirmar que no haya saltos de ancho en labels largos y recorrer todos los boundaries en 390x844 y 1280px.

Validaciones: `pnpm lint` OK, `pnpm typecheck` OK, `pnpm test` 70 tests OK, `pnpm test:integration` 21 tests OK y `pnpm run build` OK. Navegador: el login muestra spinner, texto "Ingresando...", `aria-busy` y boton deshabilitado durante la server action; dashboard estable sin overflow horizontal en 390x844 y 1280x900. La latencia artificial no produjo una captura confiable del boundary porque Next habia precargado la ruta; queda como escenario explicito para la Tarea 11.

Commit sugerido: `feat(sigeco): add loading skeletons and pending button states`
