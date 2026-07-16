# Progreso De Sigeco Desktop Complementario

Ultima actualizacion: 2026-07-15.

## Estado General

Iniciativa en implementacion. La navegacion y el contexto desktop quedaron resueltos sin cambiar la rama movil/tableta.

| Tarea | Estado | Nota |
| --- | --- | --- |
| 1. Navegacion y contexto | Completada | Sidebar agrupada y breadcrumbs desde `lg` |
| 2. Busqueda global de pacientes | Completada | Command search desktop en el header |
| 3. Toolbar de bandejas | Completada | Patron comun aplicado a los 6 modulos |
| 4. Tabla operativa | Completada | Semantica, foco y columnas prioritarias |
| 5. Lista + preview | Completada | Piloto en Recepcion/Hoy desde `xl` |
| 6. Detalles persistentes | Completada | Contexto y acciones en rail `xl` |
| 7. Historiales y secciones | Pendiente | Tabs solo donde no haya comparacion |
| 8. Formularios por flujo | Pendiente | Grillas solo desde `lg` |
| 9. Confirmacion y feedback | Pendiente | Complemento desktop del patron movil |
| 10. QA y cierre | Pendiente | Validacion integral final |

## Baseline Congelado

- Mobile first cerrado en `docs/project/sigeco-movil/progreso-de-movil.md`.
- Todo viewport menor a 1024 px queda fuera del alcance visual y funcional de esta iniciativa.
- Sistema Marea vigente; no se autoriza un rediseno de marca.
- Tareas 5 y 10 de la iniciativa movil ya no condicionan esta lista: no se agrega paginacion ni se altera el conjunto de datos servido.

## Tarea 1 - Navegacion Y Contexto Desktop (2026-07-15)

Que se hizo:

- Nuevo `DesktopSidebarNav`: usa los mismos items, permisos, rutas, iconos, etiquetas y orden relativo de `sigecoNavItems`, pero agrega una presentacion exclusiva de escritorio con Inicio sin grupo y secciones Atencion, Operacion y Control.
- `InternalShell` usa la navegacion agrupada dentro de la sidebar `lg`; `SidebarNav` y `MobileSidebar` no cambiaron, por lo que el drawer conserva exactamente su lista plana.
- Nuevo `DesktopBreadcrumb` centralizado en el layout interno. Reconoce las rutas reales de llegada, ficha/edicion de paciente, visita, consulta, enfermeria, cobro, venta, seguimiento e inventario; enlaza solo ancestros validos y marca el ultimo nivel con `aria-current=page`.
- El breadcrumb completo usa `hidden lg:flex`, iconos Lucide y tokens Marea. No se agregaron queries, props a paginas, dependencias ni logica de negocio.
- `docs/design/sigeco-visual-system.md` ahora refleja los 7 modulos vigentes, sus grupos desktop y la convivencia con retornos moviles.

Decisiones:

- El agrupamiento no se agrego al array compartido ni al componente movil. Se implemento como una vista desktop separada para cumplir el contrato de preservacion bajo 1024 px.
- Los segmentos dinamicos usan etiquetas funcionales (Ficha, Atencion, Tarea, Cobro, Comprobante, Contacto, Producto) en vez de IDs o transformacion automatica de URLs.
- No se muestra breadcrumb en bandejas: sidebar + titulo ya dan contexto suficiente y el alcance lo pide en detalles y formularios.

Validacion focal: ESLint sobre los cuatro archivos de implementacion, `git diff --check` y verificacion estatica de rutas/breakpoints, todo OK. Lint global, tipos, tests, build y QA responsive integral quedan consolidados en la Tarea 10.

Commit sugerido: `feat(sigeco): add desktop navigation hierarchy and breadcrumbs`

## Tarea 2 - Busqueda Global De Pacientes En Header (2026-07-15)

Que se hizo:

- Nuevo `DesktopPatientSearch`, inspirado en Command, Autocomplete y Popover de shadcn studio y adaptado a Marea. El trigger ocupa el espacio flexible del header sin desplazar fecha, usuario o logout.
- Reutiliza `searchReceptionPatientsAction`, su permiso `patients_read`, el minimo de 2 caracteres, debounce de 300 ms y el formato nombre + codigo + telefono del autocomplete movil.
- El panel soporta flechas, Enter, Escape, seleccion por puntero, estados inicial/loading/vacio, roles combobox/listbox/option y resultado activo anunciado con `aria-activedescendant`.
- `Ctrl+K` y `Cmd+K` abren la busqueda. Al cerrar o navegar se limpia el estado y el foco vuelve explicitamente al trigger.
- El componente completo usa `hidden lg:block`; ademas, tanto el atajo global como el efecto que consulta verifican `matchMedia("(min-width: 1024px)")`. No se emiten consultas ocultas en movil o tableta.
- No se modifico `PatientAutocomplete`, su aislamiento movil, las queries, el ranking ni las rutas.

Decisiones:

- Se reutilizo el Popover Radix ya instalado en lugar de agregar un command palette completo: los resultados vienen del servidor y no requieren filtrado local ni una coleccion adicional.
- La busqueda cubre solo pacientes, como pide el alcance. Otras entidades requeririan permisos, ranking y destinos propios.
- El texto visible del atajo usa `Ctrl K` por estabilidad de layout; el handler acepta tambien `Cmd+K` en macOS.

Validacion focal: ESLint sobre `DesktopPatientSearch` e `InternalShell`, `git diff --check` y auditoria estatica del aislamiento responsive, todo OK. Lint global, tipos, tests, build y QA responsive integral quedan consolidados en la Tarea 10.

Commit sugerido: `feat(sigeco): add desktop patient command search`

## Tarea 3 - Toolbar Comun Para Bandejas (2026-07-15)

Que se hizo:

- Nuevo `DesktopTableToolbar` en `ui/`: banda operativa exclusiva `lg` con slots para vistas, filtros/busqueda, contador y acciones. Usa bordes horizontales, superficie Marea y distribucion estable sin presentarse como card.
- Recepcion integra Hoy/Pacientes, filtro de estado o busqueda segun la vista, contador y Registrar llegada. Los forms conservan los mismos nombres, defaults, metodo GET y search params.
- Seguimientos integra Vencidos/Hoy/Proximos y el contador del filtro activo, conservando los mismos enlaces y paginacion.
- Consulta, Enfermeria, Caja e Inventario usan la misma zona con el conteo de su cola actual; no se inventaron filtros, busquedas ni acciones sin soporte existente.
- Los tabs y cards de filtro anteriores siguen visibles entre `sm` y `lg`; solo se les agrego `lg:hidden`. Los componentes moviles `MobileTabs`, `MobileAutoSubmitSelect`, `PatientAutocomplete` y RecordList no cambiaron.
- La accion Registrar llegada permanece en `PageHeader` bajo `lg` y se mueve al extremo derecho de la toolbar solo en desktop.

Decisiones:

- La toolbar no administra estado cliente. Links y forms siguen usando los search params existentes como unica fuente de verdad.
- Los contadores muestran el lote visible y, donde existe total confiable por paginacion, tambien el total. No se agregaron queries.
- Los modulos sin controles existentes reciben solo contador; esto conserva una anatomia comun sin anticipar funcionalidades de tareas futuras.

Validacion focal: ESLint sobre el componente y las seis bandejas, `git diff --check` y auditoria estatica de ramas responsive, todo OK. Lint global, tipos, tests, build y QA responsive integral quedan consolidados en la Tarea 10.

Commit sugerido: `feat(sigeco): unify desktop work queue toolbars`

## Tarea 4 - Tabla Desktop Operativa (2026-07-15)

Que se hizo:

- `Table` admite caption accesible y, desde `lg`, usa encabezados pegajosos dentro del scroll real de `main`, overflow horizontal visible y foco de fila con fondo + ring mediante `focus-within`.
- Las seis bandejas tienen captions especificos: visitas/pacientes de Recepcion, Consulta, Enfermeria, Caja, Seguimientos e Inventario.
- Se definieron prioridades solo para el rango 1024-1279 px con `lg:hidden xl:table-cell`: telefono y llegada en visitas de Recepcion, ciudad en padron, telefono en Consulta y Seguimientos, indicacion en Caja y SKU en Inventario. En `xl` reaparecen; bajo `lg` la tabla de tableta conserva todas sus columnas.
- Identidad, estado, area/plazo y acciones permanecen visibles. Enfermeria conserva sus cuatro columnas porque ya caben sin reducir contexto.
- Los conteos de visitas del padron se alinearon a la derecha; el stock ya mantenia alineacion numerica y todas las cifras conservan `tabular-nums`.
- La accion secundaria `Se retiro` pasa en desktop a un popover contextual de elipsis con label accesible. Entre `sm` y `lg` conserva el boton directo y la card movil no cambia.

Decisiones:

- No se agrego ordenamiento, seleccion ni configuracion persistente de columnas: requieren estado y contratos que no existen en esta tarea.
- Se uso el Popover Radix existente para la unica accion secundaria actual, evitando una dependencia nueva. La accion y su server action no cambiaron.
- El foco de fila no depende solo del color: agrega un ring interior mientras un enlace o control de la fila tiene foco.

Validacion focal: ESLint sobre la tabla base, el popover de acciones y las seis bandejas, `git diff --check`, auditoria de captions y correspondencia `Th`/`Td`, todo OK. Lint global, tipos, tests, build y QA responsive integral quedan consolidados en la Tarea 10.

Commit sugerido: `feat(sigeco): improve desktop operational data tables`

## Tarea 5 - Piloto Lista Y Preview Persistente (2026-07-15)

Que se hizo:

- Recepcion/Hoy tiene una rama master-detail exclusiva desde `xl`: lista compacta y escaneable a la izquierda, preview pegajoso a la derecha. El bloque actual queda intacto con `xl:hidden` para movil, tableta y desktop de 1024-1279 px.
- La seleccion se representa con `?visita=<id>` y conserva `status`. Los links usan `scroll={false}`, por lo que cambiar de registro no pierde la posicion; back/forward del navegador recorre selecciones.
- La fila seleccionada combina fondo y ring, expone `aria-current` y mantiene visibles paciente, codigo, llegada, area, pendientes y estado.
- El preview reutiliza exclusivamente los datos ya cargados por `getVisits`: identidad, telefono, estado, area, llegada, motivo y cantidad de tareas. No se agregaron queries ni cargas ocultas.
- Las acciones de consulta abren el detalle completo de visita o la ficha del paciente. La edicion y las server actions permanecen en sus paginas originales.
- Nuevo `DesktopPreviewDismiss`: boton de cierre con icono Lucide y Escape; el listener solo actua con `matchMedia("(min-width: 1280px)")` y limpia la seleccion sin scroll.

Decisiones:

- Se uso grid estable en vez de Resizable: introducir tamanos persistentes y manejo de puntero no aporta valor probado en el primer piloto. El patron puede evolucionar despues de QA y uso real.
- No se selecciona automaticamente la primera visita: la URL sigue siendo la unica fuente de seleccion y back/forward no recibe estados implicitos.
- El preview no replica formularios ni acciones destructivas; evita dos superficies de edicion y mantiene clara la separacion entre inspeccionar y actuar.
- El piloto no se extendio a Pacientes ni a otros modulos. Primero debe superar la validacion integral y demostrar reduccion real de cambios de contexto.

Validacion focal: ESLint sobre Recepcion y `DesktopPreviewDismiss`, `git diff --check`, auditoria de aislamiento `xl`, estado en URL y contrato de `getVisits`, todo OK. Lint global, tipos, tests, build y QA responsive integral quedan consolidados en la Tarea 10.

Commit sugerido: `feat(sigeco): pilot desktop queue detail preview`

## Tarea 6 - Detalles Con Resumen Y Acciones Persistentes (2026-07-15)

Que se hizo:

- Nuevo `DesktopDetailContext`: encabezado compacto para el rail con eyebrow/codigo, nombre, metadato y estado opcional. Vive oculto hasta `xl`, usa tokens Marea y no crea una card adicional.
- La segunda columna de ficha de paciente, visita, consulta, enfermeria, cobro administrativo, venta con saldo, seguimiento e inventario es pegajosa desde `xl`, con alto maximo relativo al viewport, scroll propio y overscroll contenido.
- El contexto dentro del rail tambien es sticky: identidad y estado permanecen arriba mientras el usuario recorre formularios y acciones de la columna lateral.
- Cada pantalla reutiliza datos ya cargados: codigo/nombre/telefono y estado de visita, venta, seguimiento o stock. No se agregaron queries, permisos, server actions ni estados cliente.
- Los formularios existentes permanecen en su columna y conservan sus acciones primarias/secundarias. No se duplicaron submits ni se movieron acciones destructivas junto a la identidad.
- Breadcrumbs de la Tarea 1, resumen principal de la primera columna y back links moviles siguen siendo la anatomia de entrada; este cambio agrega persistencia desktop sin reemplazarlos.

Decisiones:

- El rail empieza en `xl` porque es el mismo breakpoint de las dos columnas; bajo 1280 px las clases base y `max-sm:contents` quedan intactas.
- El rail puede desplazarse internamente cuando sus formularios superan 800 px de alto. Esto mantiene accesible la accion sin inmovilizar toda la pagina.
- Una venta sin saldo no crea segunda columna ni rail: no existe accion pendiente que justificar y la identidad permanece en el resumen principal.
- El contexto es una banda sin marco con separador inferior, evitando cards anidadas o una tercera jerarquia visual.

Validacion focal: ESLint sobre el componente y los ocho detalles, `git diff --check` y auditoria estructural de ubicacion/aislamiento `xl`, todo OK. Lint global, tipos, tests, build y QA responsive integral quedan consolidados en la Tarea 10.

Commit sugerido: `feat(sigeco): add persistent desktop detail context`

## Siguiente Paso

Ejecutar la Tarea 7: historiales y secciones escaneables en desktop.
