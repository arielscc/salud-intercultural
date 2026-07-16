# Tareas De Sigeco Desktop Complementario

Proposito: aprovechar escritorio para comparacion, contexto persistente y trabajo repetitivo, sin alterar la experiencia movil primero ya cerrada.

Docs relacionados:

- Investigacion: `docs/project/sigeco-desktop/investigacion-arquitectura-informacion.md`
- Progreso: `docs/project/sigeco-desktop/progreso-de-desktop.md`
- Sistema visual: `docs/design/sigeco-visual-system.md`
- Baseline movil: `docs/project/sigeco-movil/progreso-de-movil.md`
- Componentes de referencia: https://shadcnstudio.com/components

## Reglas Transversales

1. Solo desktop estricto desde `lg` (1024 px). Movil y tableta quedan visual y funcionalmente identicos.
2. No cambiar clases base o `sm:` para resolver una tarea desktop; usar ramas `hidden lg:*`, variantes `lg:`/`xl:` o `matchMedia("(min-width: 1024px)")`.
3. No cambiar negocio, permisos, rutas, queries ni server actions, salvo que la tarea lo autorice y garantice paridad movil.
4. Reutilizar componentes internos y adaptar patrones de shadcn studio a Marea, Tailwind 3.4 y Lucide. Documentar instalacion o replica.
5. Mantener acciones y contexto visibles; no esconder informacion necesaria para decidir dentro de tabs, menus o accordions.
6. No crear cards anidadas ni usar cards como secciones decorativas. Priorizar toolbars, tablas, paneles y layouts sin marco.
7. Cada tarea registra archivos, decisiones y commit sugerido en el progreso. El usuario realiza los commits.
8. Validacion focal durante cada tarea; lint, tipos, tests, build y QA responsive integral se consolidan en la Tarea 10.
9. Docs y mensajes de commit en ASCII.

## Orden Recomendado

1, 2, 3, 4, 5, 6, 7, 8, 9 y 10. La Tarea 5 es un piloto: solo se extiende a mas modulos si su validacion confirma una mejora real.

## Tarea 1 - Navegacion Y Contexto Desktop

**Objetivo:** hacer visible la estructura del sistema y la ubicacion actual sin cambiar la navegacion movil.

**Alcance:**

- Agrupar visualmente la sidebar desktop por trabajo (Atencion, Operacion y Control), conservando rutas, etiquetas, orden relativo y permisos.
- Agregar breadcrumb desktop en detalles y formularios mediante una rama `hidden lg:flex`.
- Mantener el drawer y `SidebarNav` movil sin agrupaciones ni cambios.

**Criterios:** a 1024 px o mas la ubicacion se reconoce por sidebar + breadcrumb; a 768 px o menos el DOM interactivo visible y el recorrido actual no cambian.

**Referencia shadcn studio:** Breadcrumb, Sidebar.

**Commit sugerido:** `feat(sigeco): add desktop navigation hierarchy and breadcrumbs`

## Tarea 2 - Busqueda Global De Pacientes En Header

**Objetivo:** acceder a una ficha desde cualquier modulo sin navegar primero a Recepcion.

**Alcance:**

- Command/autocomplete desktop en el espacio libre del header, visible solo desde `lg`.
- Reutilizar la busqueda de pacientes existente, debounce y formato de resultados de `PatientAutocomplete`.
- Atajo de teclado mostrado en el control y foco restaurado al cerrar.
- Elegir un resultado navega a la ficha; no se agregan otras entidades.

**Criterios:** funciona con puntero y teclado, no ejecuta consultas bajo 1024 px y no desplaza fecha/usuario/logout.

**Referencia shadcn studio:** Command, Autocomplete, Popover.

**Commit sugerido:** `feat(sigeco): add desktop patient command search`

## Tarea 3 - Toolbar Comun Para Bandejas

**Objetivo:** unificar busqueda, vista, filtros y acciones en una sola zona predecible.

**Alcance:**

- Crear `DesktopTableToolbar` o equivalente, solo `lg`, con slots para busqueda, filtros, tabs, contador y accion primaria.
- Aplicar primero a Recepcion y Seguimientos; luego a Consulta, Enfermeria, Caja e Inventario usando controles existentes.
- Mantener intactos los formularios, tabs y filtros actuales bajo `lg`.
- El estado sigue representado en search params; no duplicar fuentes de verdad.

**Criterios:** controles en orden consistente, labels accesibles, foco visible y sin salto de layout al aplicar filtros.

**Referencia shadcn studio:** Data Table, Tabs, Select, Button Group.

**Commit sugerido:** `feat(sigeco): unify desktop work queue toolbars`

## Tarea 4 - Tabla Desktop Operativa

**Objetivo:** mejorar lectura, comparacion y accion sobre listas densas.

**Alcance:**

- Extender la tabla con caption accesible, header pegajoso dentro del scroll real, primera columna identificadora y alineacion numerica.
- Definir prioridad de columnas por modulo; evitar scroll horizontal a 1024 px mediante ocultado desktop escalonado solo cuando el dato siga accesible en detalle.
- Agregar estados claros de hover, foco y fila activa; mantener las cards moviles sin cambios.
- Acciones de baja frecuencia pasan a menu contextual; la accion primaria permanece visible.

**Criterios:** se identifica entidad, estado, plazo y accion sin scroll horizontal a 1024 px; navegacion por teclado no depende solo del color.

**Referencia shadcn studio:** Data Table, Table, Dropdown Menu, Tooltip.

**Commit sugerido:** `feat(sigeco): improve desktop operational data tables`

## Tarea 5 - Piloto Lista Y Preview Persistente

**Objetivo:** reducir idas y vueltas entre una cola y sus detalles en pantallas amplias.

**Alcance:**

- Seleccionar una cola de alta frecuencia (Recepcion como primera candidata) y mostrar lista + preview desde `xl`.
- El preview contiene identidad, estado, ruta y acciones de consulta; la edicion completa conserva su pagina.
- Seleccion reflejada en URL para back/forward y enlace directo.
- No duplicar server actions ni cargar previews ocultos en movil/tableta.

**Criterios:** el usuario inspecciona registros consecutivos sin perder filtros ni posicion; Escape/foco/back funcionan; el patron no se generaliza sin evaluacion.

**Referencia shadcn studio:** Resizable, Scroll Area, Separator.

**Commit sugerido:** `feat(sigeco): pilot desktop queue detail preview`

## Tarea 6 - Detalles Con Resumen Y Acciones Persistentes

**Objetivo:** conservar identidad, estado y siguiente accion durante el recorrido de detalles largos.

**Alcance:**

- Anatomia desktop comun: breadcrumb, header de entidad, resumen principal, contenido y rail lateral pegajoso.
- Aplicar a visita, paciente, consulta, enfermeria, venta, seguimiento e inventario.
- El rail contiene estado y accion primaria; acciones destructivas no compiten visualmente con la principal.
- Mantener el orden y los back links moviles actuales.

**Criterios:** a 1280x800 la identidad y la accion principal permanecen disponibles durante scroll; no hay cards dentro de cards.

**Referencia shadcn studio:** Card solo para unidades reales, Separator, Badge.

**Commit sugerido:** `feat(sigeco): add persistent desktop detail context`

## Tarea 7 - Historiales Y Secciones Escaneables

**Objetivo:** reducir longitud aparente sin ocultar informacion que deba compararse.

**Alcance:**

- Clasificar secciones de detalle en resumen, trabajo actual, historial y metadatos.
- Usar tabs desktop solo para historiales pares que no se comparan simultaneamente; usar collapsible para metadatos secundarios.
- Conservar en movil todas las secciones y su orden actual.
- Cada panel de tab incluye heading, estado vacio y URL/hash recuperable.

**Criterios:** ninguna accion ni alerta queda oculta; back/forward conserva seccion; screen reader anuncia tab y panel.

**Referencia shadcn studio:** Tabs, Collapsible.

**Commit sugerido:** `feat(sigeco): organize desktop detail histories`

## Tarea 8 - Formularios Desktop Por Flujo

**Objetivo:** presentar formularios largos segun la secuencia mental del trabajo.

**Alcance:**

- Definir shell desktop de formulario con secciones, grilla de dos columnas solo para campos relacionados y rail de resumen/acciones cuando aporte contexto.
- Aplicar al funnel de llegada, edicion de paciente y formularios largos de detalle.
- Mantener una sola columna, orden, targets y teclado movil actuales.
- Errores aparecen junto al campo y en resumen cuando el submit implique scroll.

**Criterios:** el orden de tab sigue el orden visual y de negocio; no hay campos relacionados separados entre columnas arbitrarias.

**Referencia shadcn studio:** Form, Field, Collapsible, Alert.

**Commit sugerido:** `feat(sigeco): structure desktop forms by workflow`

## Tarea 9 - Confirmacion Y Feedback Desktop

**Objetivo:** prevenir errores y hacer visible el resultado de acciones con puntero o teclado.

**Alcance:**

- Alert Dialog centrado desde `lg` para cerrar visita y registrar retiro; el bottom sheet movil queda intacto.
- Montar Sonner desktop en esquina superior derecha usando los avisos ya existentes.
- Revisar labels de consecuencias, foco inicial, retorno de foco y bloqueo de doble submit.

**Criterios:** ninguna accion irreversible desktop se ejecuta sin confirmacion; cada exito emite un solo aviso; movil conserva drawer y toast inferior.

**Referencia shadcn studio:** Alert Dialog, Sonner.

**Commit sugerido:** `feat(sigeco): add desktop confirmations and action feedback`

## Tarea 10 - QA Integral Y Cierre Documental

**Objetivo:** demostrar que desktop mejoro y que movil/tableta no sufrieron regresiones.

**Alcance:**

- Ejecutar format check, lint, typecheck, unit, integration y build.
- QA por rol y por modulo en 390x844, 768x1024, 1024x768, 1280x800 y 1440x900.
- Comparar capturas mobile/tablet con el baseline de la iniciativa movil.
- Probar teclado, foco, back/forward, URLs con filtros, vacios, errores, loading y acciones irreversibles.
- Actualizar investigacion, tareas, progreso, sistema visual e indice del proyecto con decisiones finales.

**Criterios:** checks en verde, cero overflow incoherente, cero controles desktop bajo 1024 px y evidencia documental completa.

**Commit sugerido:** `docs(sigeco): close desktop information architecture initiative`

