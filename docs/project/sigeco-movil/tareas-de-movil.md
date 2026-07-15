# Tareas De Sigeco Movil Primero

Proposito: que todo Sigeco pueda operarse comodamente desde un telefono (el uso mayoritario esperado), cerrando las brechas de diseno y usabilidad detectadas en la evaluacion de abajo. Se prioriza reutilizar componentes ya publicados en shadcn studio (https://shadcnstudio.com/components), instalados o replicados segun disponibilidad, siempre adaptados a los tokens Marea.

Docs relacionados:

- Spec visual de Sigeco: `docs/design/sigeco-visual-system.md`
- Progreso de esta iniciativa: `docs/project/sigeco-movil/progreso-de-movil.md`
- Investigacion de diseno movil que fundamenta estas tareas: `docs/project/sigeco-movil/investigacion-diseno-movil.md`
- Antecedentes de trabajo movil ya hecho: `docs/project/sigeco-simplificacion/progreso-de-simplificacion.md` (drawer de navegacion, KPIs 3x2, acciones del header al 50%)

## Reglas Transversales (aplican a todas las tareas)

1. Solo diseno y usabilidad: no se cambia logica de negocio, queries, permisos ni server actions (salvo agregar parametros de feedback visual donde una tarea lo pida explicitamente).
2. Componentes de shadcn studio: se instalan via CLI (`@ss-components/...`, estilo `radix-vega`) cuando el componente es gratuito; si es de pago o el CLI arrastra demos innecesarios, se replica el patron a mano como ya se hizo con drawer y los pickers. Se documenta que se instalo y que se replico.
3. Todo componente generado se adapta a Tailwind 3.4 y a los tokens Marea (`bg-surface`, `text-text`, `text-muted`, `border-border`, radios 9px/7px, `focus-ring`); nunca quedan tokens genericos de shadcn (`bg-popover`, `text-foreground`) ni sintaxis de Tailwind v4.
4. Solo movil estricto (regla endurecida el 2026-07-15): la version web/desktop no cambia en nada visible ni de comportamiento. Tres tecnicas permitidas: (a) ramas CSS por breakpoint (markup movil con `sm:hidden`, markup actual intacto o con `hidden sm:block`); (b) comportamiento decidido en el handler con `window.matchMedia("(max-width: 639px)")` al momento de la interaccion (sin condicionar el render inicial, sin problemas de hidratacion); (c) atributos inertes en desktop (`inputmode`, `type="tel"`, `autocomplete`, `enterkeyhint`). Si una mejora no puede aislarse a movil con estas tecnicas, la tarea se pospone (ver Tareas 5 y 10). Fundamento y detalle en `investigacion-diseno-movil.md`, seccion 5.
5. Objetivos tactiles: minimo 40px de alto en elementos interactivos nuevos; el contenido tocable de una fila/card es toda la superficie, no solo el nombre.
6. En esta tanda solo se implementa UI y se documenta; lint, typecheck, tests y QA de navegador quedan para la fase final de QA integral (Tarea 11). Cada tarea deja su entrada en el progreso con commit sugerido.
7. El usuario hace todos los commits con los mensajes sugeridos. Docs en ASCII.

## Evaluacion Completa (2026-07-14)

Alcance revisado: los 7 modulos de la navegacion (Inicio, Recepcion, Consulta, Enfermeria, Caja, Seguimiento, Inventario), sus paginas de detalle, el funnel de llegada, la ficha de paciente, el login y los componentes compartidos (`src/components/internal/**`).

Fortalezas ya presentes:

- Sistema visual Marea consistente (tokens en `sigeco.css`, componentes `ui/` propios: Card, Chip, KpiCard, Table, Button, Field, TimelineItem, CollapsibleSection, InfoRow, StatusPill).
- Navegacion movil resuelta con drawer izquierdo (vaul) y KPIs compactos 3x2; inputs con altura tactil correcta (`min-h-11`); pickers de fecha/hora en popover ya adaptados.
- El funnel de llegada tiene indicador de pasos (Paso N de 4) y guarda estado por paso.
- Layouts de detalle apilan bien en movil (columnas solo desde `xl:`); `main` nunca scrollea horizontal (regla `min-width: 0`).

Hallazgos, de mayor a menor impacto en telefono:

| # | Hallazgo | Donde | Impacto movil |
| --- | --- | --- | --- |
| 1 | Todas las listas son `<table>` de 4-7 columnas con scroll horizontal; en 390px se ven ~2 columnas y el estado/accion quedan fuera de pantalla | Recepcion (hoy y pacientes), Consultas, Enfermeria, Caja, Seguimientos, Inventario, tablas de ficha/venta | Critico: es la pantalla de trabajo principal de cada rol |
| 2 | Ninguna accion da feedback visual al completarse (no hay toasts); la pagina solo se revalida en silencio | Todas las server actions (registrar llegada, cerrar visita, cobros, contactos, etc.) | Alto: en movil el resultado queda fuera del viewport y el usuario duda si funciono |
| 3 | Acciones irreversibles sin confirmacion: "Se retiro" dispara la server action directo desde la fila | Recepcion (tabla hoy), detalle de visita ("Cerrar visita", "Se retiro sin completar") | Alto: toque accidental facil en pantalla chica |
| 4 | Sin estados de carga: no hay `loading.tsx` ni skeletons; en red movil la navegacion parece muerta | Todos los modulos | Alto en 3G/4G |
| 5 | En los detalles, el trabajo principal (Derivar, Registrar cobro, Registrar contacto) vive en la columna lateral que en movil cae al final de un scroll largo; ademas no hay enlace "Volver" | visitas/[id], consultas/[visitId], ventas/[saleId], seguimientos/[taskId], enfermeria/[workItemId], administracion/[workItemId] | Alto |
| 6 | Busqueda de pacientes por formulario + recarga completa (submit "Buscar"); el funnel ya busca en vivo pero con UI propia minima | Recepcion vista pacientes, paso 0 del funnel | Medio-alto: la busqueda es la puerta de entrada de recepcion |
| 7 | Filtros piden dos toques (elegir en select nativo + boton "Filtrar"); tabs de vista/filtro son links sueltos | Recepcion (filtro de estado), Seguimientos (Vencidos/Hoy/Proximos) | Medio |
| 8 | Telefono se captura como input de texto libre (hay `normalizePhone` pero sin mascara ni teclado numerico) | Funnel paso 1, editar ficha | Medio |
| 9 | Listas sin paginacion, cortadas en 30-80 registros sin aviso | Recepcion pacientes (30), Seguimientos (60), Inventario (80) | Medio: el padron crecera |
| 10 | Selects nativos en 7 paginas: correctos en movil (picker del sistema) pero visualmente ajenos al sistema | Formularios de detalle | Bajo (decision documentada en Tarea 8) |

Mapa de componentes shadcn studio a usar: sonner (toasts), skeleton + spinner (carga), drawer ya instalado (confirmaciones bottom en movil), autocomplete/command (busqueda), toggle-group/tabs (filtros), phone-input o input-mask (telefono), pagination (paginacion), list/card (patron de filas moviles), select (solo si la Tarea 8 decide reemplazar nativos).

## Ajuste De Alcance: Solo Movil Estricto (2026-07-15)

El usuario pidio que toda la lista se priorice y ejecute solo para movil, sin modificar la version web. Clasificacion resultante (tecnica por tarea en `investigacion-diseno-movil.md`, seccion 6):

- Solo movil directas: Tareas 1, 2 y 7.
- Solo movil con tecnica de aislamiento (CSS por breakpoint o `matchMedia` en el handler): Tareas 3, 4, 6, 8 y 9.
- Pospuestas por ser inseparables de la web: Tarea 5 (`loading.tsx` y estados pending cambian la navegacion y los submits tambien en desktop) y Tarea 10 (la paginacion cambia los datos servidos para ambos viewports). Se retomaran cuando el usuario habilite cambios compartidos.

Orden de ejecucion resultante: 1, 2, 7, 3, 4, 6, 8, 9 y al final 11 (QA integral, que ademas verifica que desktop quedo identico).

## Tarea 1 — Patron De Lista Responsive Y Recepcion En Cards

**Objetivo:** crear el patron reutilizable "tabla en desktop, cards apiladas en movil" y estrenarlo en Recepcion, la pantalla mas usada.

**Alcance:**

- Nuevo componente en `src/components/internal/ui/` (por ejemplo `RecordList.tsx`): en `< sm` renderiza cada registro como card tocable (titulo, linea secundaria, chips de estado a la derecha, accion opcional); desde `sm` delega en la `Table` actual sin cambios. Referencia visual: componentes `list` y `card` de shadcn studio.
- Toda la card navega al detalle (tap en cualquier punto); las acciones secundarias ("Se retiro") quedan como boton separado con su propio target de 40px.
- Aplicarlo a `recepcion/page.tsx`: vista "Hoy" (paciente, hora, area, tareas, estado, se retiro) y vista "Pacientes" (nombre, codigo, telefono, ciudad, visitas).
- Los estados vacios actuales se conservan en ambas presentaciones.

**Fuera de alcance:** el resto de las listas (Tarea 2); cambios en queries.

**Criterios de aceptacion:**

- En 390px no hay scroll horizontal y se ven paciente + estado sin desplazarse.
- Desde 640px la tabla actual queda identica a hoy.
- Toda la informacion que muestra la tabla existe tambien en la card (ninguna columna se pierde, se reacomoda).

**Commit sugerido:** `feat(sigeco): add responsive record list and apply to reception`

## Tarea 2 — Resto De Listas De Trabajo En Cards

**Objetivo:** extender el patron de la Tarea 1 a todas las bandejas y tablas restantes.

**Alcance:**

- Consultas (lista), Enfermeria (bandeja), Caja/administracion (bandeja de cobros), Seguimientos (lista con vencimiento visible), Inventario (productos).
- Tablas secundarias de paginas de detalle: visitas en ficha de paciente, detalle y pagos en venta, ultimas llegadas del dashboard.
- Cada modulo define que 2-3 datos son primarios en la card; el resto va en la linea secundaria o chips.

**Fuera de alcance:** paginacion (Tarea 10); cambios de columnas en desktop.

**Criterios de aceptacion:**

- Ninguna pagina de Sigeco muestra scroll horizontal de tabla en 390px.
- Las bandejas mantienen sus enlaces de detalle y acciones por fila.

**Commit sugerido:** `feat(sigeco): render all work queues as cards on mobile`

## Tarea 3 — Feedback De Acciones Con Toasts (Sonner)

**Objetivo:** que toda accion confirme su resultado sin depender de donde quedo el viewport. Solo en movil: desktop sigue exactamente como hoy (sin toasts).

**Alcance:**

- Instalar `sonner` desde shadcn studio (componente gratuito) y adaptar el Toaster a tokens Marea; montarlo una sola vez en el layout de Sigeco, dentro de un contenedor `sm:hidden` para que los toasts solo existan en movil. Posicion inferior (zona del pulgar).
- Mecanismo unico de aviso: las server actions que hoy redirigen agregan un search param de resultado (por ejemplo `?aviso=visita-cerrada`) y un componente cliente chico lo lee, dispara el toast y limpia la URL. Para forms que no redirigen se usa `useActionState` con toast en el cliente.
- Cubrir las acciones principales: registrar llegada, cerrar visita, se retiro, derivar, guardar consulta, crear indicacion, registrar aplicacion, registrar cobro, registrar contacto, crear seguimiento, crear/ajustar producto.
- Mensajes en espanol, cortos, con tono del sistema ("Visita cerrada", "Cobro registrado").

**Fuera de alcance:** cambiar la logica o las validaciones de las actions; toasts de error de validacion (los errores siguen mostrandose en el form).

**Criterios de aceptacion:**

- Cada accion cubierta muestra exactamente un toast al completarse en movil (posicion inferior).
- En desktop (>= 640 px) no aparece ningun toast; el comportamiento actual queda identico.
- La URL no queda sucia con el param de aviso tras mostrarse.

**Commit sugerido:** `feat(sigeco): add sonner toasts for action feedback`

## Tarea 4 — Confirmacion De Acciones Irreversibles

**Objetivo:** que "Se retiro" y "Cerrar visita" no puedan dispararse con un toque accidental en telefono. Solo en movil: desktop conserva el envio directo actual.

**Alcance:**

- Componente de confirmacion reutilizable sobre el `Drawer` ya instalado: bottom sheet modal (direction bottom, scrim, handle y boton de cierre visible, siguiendo las guias NN/g de bottom sheets); texto de consecuencia + boton confirmar en rojo con etiqueta verbo + sustantivo ("Marcar retiro", "Cerrar visita") + cancelar.
- Activacion solo movil: el handler evalua `window.matchMedia("(max-width: 639px)")` al momento del toque; en movil intercepta y abre el sheet, en desktop deja pasar el submit directo como hoy.
- Aplicarlo a: "Se retiro" (tabla de Recepcion), "Cerrar visita" y "Se retiro sin completar" (detalle de visita).
- El form de server action se envia solo al confirmar (en movil).

**Fuera de alcance:** confirmaciones para acciones editables o reversibles (guardar consulta, cobros); confirmacion en desktop (queda para otra tanda si el usuario la pide).

**Criterios de aceptacion:**

- En movil, ningun toque simple ejecuta una accion irreversible; siempre media la confirmacion con la consecuencia explicada.
- En desktop (>= 640 px) el flujo actual queda identico (submit directo).
- La confirmacion es operable con teclado y con gesto de arrastre para cancelar en movil.

**Commit sugerido:** `feat(sigeco): confirm irreversible visit actions with bottom sheet`

## Tarea 5 — Estados De Carga (Skeleton Y Spinner)

**Retomada el 2026-07-15:** el usuario habilito expresamente los cambios compartidos con escritorio requeridos por esta tarea. Los `loading.tsx` y estados pending se aplican por igual en todos los viewports; esta es una excepcion aprobada a la regla transversal 4.

**Objetivo:** que navegar y enviar formularios siempre muestre progreso, especialmente en red movil.

**Alcance:**

- Componente `Skeleton` (shadcn studio, gratuito) adaptado a Marea (`bg-surface-soft` con pulso) y `loading.tsx` por modulo: dashboard, recepcion, consultas, enfermeria, caja, seguimientos, inventario, replicando la silueta real (header + KPIs/cards + lista).
- Estado pendiente en botones de submit: extender el `Button` interno con spinner + `useFormStatus` (patron ya usado en el funnel, generalizado) y aplicarlo a los forms principales.

**Fuera de alcance:** suspense granular por seccion; optimizacion de queries.

**Criterios de aceptacion:**

- Navegar a cualquier modulo muestra skeleton inmediato en lugar de pantalla congelada.
- Los submits principales deshabilitan el boton y muestran spinner mientras corren.

**Commit sugerido:** `feat(sigeco): add loading skeletons and pending button states`

## Tarea 6 — Busqueda De Pacientes Con Autocomplete

**Objetivo:** encontrar un paciente escribiendo, sin submit ni recarga, desde recepcion. Solo en movil: desktop conserva el form de busqueda actual.

**Alcance:**

- Componente de autocomplete basado en shadcn studio (`autocomplete`/`command`; instalar el gratuito que aplique y adaptarlo) con debounce, resultados con nombre + codigo + telefono, y navegacion al detalle al elegir.
- Aislamiento por breakpoint: el autocomplete se renderiza en un bloque `sm:hidden`; el form de busqueda actual de la vista "Pacientes" queda intacto con `hidden sm:block`. La tabla/lista sigue mostrando el padron.
- Unificar el paso 0 del funnel con este componente en movil, con el mismo aislamiento (el paso 0 actual queda para desktop); la logica de busqueda existente de `searchReceptionPatientsAction` se reutiliza tal cual.

**Fuera de alcance:** busqueda global multi-entidad (command palette); cambios al ranking de resultados del servidor.

**Criterios de aceptacion:**

- En movil, escribir 2+ caracteres muestra sugerencias sin recargar; elegir una navega a la ficha (o precarga el funnel, segun contexto).
- Funciona con teclado tactil sin que el teclado tape los resultados en 390x844.
- En desktop (>= 640 px) la busqueda actual queda identica.

**Commit sugerido:** `feat(sigeco): patient search autocomplete in reception and intake`

## Tarea 7 — Acciones Principales Y Retorno En Detalles Moviles

**Objetivo:** que en cada pagina de detalle la accion principal del rol quede alcanzable sin scroll largo, y que siempre haya un "Volver" visible.

**Alcance:**

- Reordenar en movil las columnas de los detalles (`order-*` responsive): el bloque de accion principal (Derivar paciente, Registrar cobro, Registrar contacto, Registrar aplicacion) sube justo debajo del encabezado del paciente; desde `xl` el layout actual no cambia.
- Enlace "Volver" (chevron + etiqueta del modulo) al inicio de cada pagina de detalle, con `sm:hidden` para que desktop quede identico: visita, consulta, enfermeria, venta, cobro, seguimiento, ficha, item de inventario.
- Evaluar por pagina si ademas conviene barra inferior pegajosa con el submit principal (`sm:hidden`); aplicarla donde el form principal siga quedando bajo el pliegue.

**Fuera de alcance:** breadcrumbs completos; cambios de jerarquia de informacion en desktop.

**Criterios de aceptacion:**

- En 390px, la accion principal de cada detalle se alcanza con maximo un scroll corto (una pantalla).
- En movil, todas las paginas de detalle tienen retorno visible al modulo padre.
- En desktop (>= 1280 px, layout `xl`) nada cambia.

**Commit sugerido:** `feat(sigeco): mobile-first ordering and back links on detail pages`

## Tarea 8 — Filtros Y Tabs Tactiles

**Objetivo:** filtrar con un solo toque y dar a los tabs de vista un componente consistente. Solo en movil: desktop conserva el select + boton "Filtrar" y los links actuales.

**Alcance:**

- Los filtros por select (estado en Recepcion) se auto-envian al cambiar solo en movil: el `onChange` evalua `window.matchMedia("(max-width: 639px)")` y hace submit; en desktop no pasa nada al cambiar y el boton "Filtrar" sigue siendo el paso de aplicacion, como hoy.
- Tabs de vista (Hoy/Pacientes) y de filtro (Vencidos/Hoy/Proximos) unificados en un componente de tabs/toggle-group estilo shadcn studio adaptado a Marea, con contador opcional (por ejemplo "Vencidos 3") y scroll horizontal seguro; se renderiza en un bloque `sm:hidden` y los links actuales quedan intactos con `hidden sm:flex`.
- Decision documentada: los `<select>` nativos dentro de formularios se conservan (el picker nativo del sistema es superior en movil); solo se restyled el trigger si hace falta coherencia visual.

**Fuera de alcance:** reemplazo masivo de selects por listbox custom; filtros nuevos.

**Criterios de aceptacion:**

- En movil, cambiar el filtro de estado en Recepcion aplica el filtro sin toque extra.
- Los tabs moviles muestran estado activo claro y son operables con teclado.
- En desktop (>= 640 px) filtros y tabs quedan identicos a hoy.

**Commit sugerido:** `feat(sigeco): one-tap filters and unified view tabs`

## Tarea 9 — Telefono Con Mascara Y Teclado Numerico

**Objetivo:** capturar telefonos consistentes y rapidos de tipear en movil, sin alterar la experiencia desktop.

**Alcance:**

- Input de telefono basado en shadcn studio (`phone-input` o `input-mask`, el gratuito que aplique) adaptado a Marea: `type="tel"` + `autocomplete="tel"` (atributos inertes en desktop: el teclado fisico los ignora), mascara local de Bolivia (8 digitos, prefijo +591 opcional) aplicada solo con puntero tactil (`matchMedia("(pointer: coarse)")`), integrado con el `normalizePhone` existente para no cambiar el formato guardado.
- Aplicarlo en: funnel paso 1, editar ficha de paciente.

**Fuera de alcance:** validacion internacional completa; migracion de telefonos ya guardados.

**Criterios de aceptacion:**

- En movil se abre teclado numerico; el valor enviado al servidor conserva el formato que las actions esperan hoy.
- En movil, numeros pegados con espacios/guiones se normalizan visiblemente.
- En desktop el input se ve y comporta igual que hoy (sin mascara activa).

**Commit sugerido:** `feat(sigeco): masked phone input with numeric keyboard`

## Tarea 10 — Paginacion De Listas Largas [POSPUESTA]

**Pospuesta el 2026-07-15:** no puede aislarse a movil. La paginacion por search params cambia los datos que el servidor envia, iguales para ambos viewports; una paginacion solo movil requeriria servir el padron completo a desktop y paginado a movil, lo que no es posible decidir en el servidor. Se retomara cuando el usuario habilite cambios que tambien toquen la web.

**Objetivo:** que el padron y las listas grandes sean navegables mas alla del corte actual.

**Alcance:**

- Componente de paginacion (shadcn studio `pagination`, gratuito) adaptado a Marea, operado por search params (server components, sin estado cliente).
- Aplicarlo a: Recepcion vista pacientes, Seguimientos, Inventario. Las queries ya aceptan `pageSize`; se agrega `page` sin tocar su logica interna mas alla del offset.
- En movil: variante compacta (anterior/siguiente + posicion).

**Fuera de alcance:** infinite scroll; cambios de ordenamiento.

**Criterios de aceptacion:**

- Con mas registros que el `pageSize`, aparece paginacion funcional y accesible en movil y desktop.
- Los filtros/busquedas activos se conservan al cambiar de pagina.

**Commit sugerido:** `feat(sigeco): paginate patient, follow-up and inventory lists`

## Tarea 11 — QA Integral Y Cierre Documental

**Objetivo:** validar toda la tanda movil de una vez y cerrar la iniciativa.

**Alcance:**

- lint, `npx tsc --noEmit`, 70 tests unitarios.
- QA de navegador en 390x844 y 1280px: los 7 modulos, funnel completo, un detalle por modulo, confirmaciones, toasts, autocomplete y filtros; verificar `scrollWidth` = viewport en cada pagina.
- Verificacion "desktop intacto": en 1280px, cada pantalla tocada por las tareas 1-9 debe verse y comportarse igual que antes de la iniciativa (sin toasts, sin confirmaciones, busqueda y filtros con el flujo actual).
- Revisar los pendientes anotados por tareas anteriores (labels largos en KPIs, flag oculto en movil para lectores de pantalla).
- Actualizar el progreso con hallazgos y cerrar el estado general.

**Fuera de alcance:** features nuevas descubiertas durante el QA (se anotan como pendientes para otra tanda).

**Criterios de aceptacion:**

- Todas las validaciones pasan; cada hallazgo de QA queda corregido o documentado como pendiente consciente.

**Commit sugerido:** `docs(sigeco): close mobile-first initiative with qa notes`
