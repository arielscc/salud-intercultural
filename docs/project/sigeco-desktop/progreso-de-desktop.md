# Progreso De Sigeco Desktop Complementario

Ultima actualizacion: 2026-07-15.

## Estado General

Iniciativa en implementacion. La navegacion y el contexto desktop quedaron resueltos sin cambiar la rama movil/tableta.

| Tarea | Estado | Nota |
| --- | --- | --- |
| 1. Navegacion y contexto | Completada | Sidebar agrupada y breadcrumbs desde `lg` |
| 2. Busqueda global de pacientes | Completada | Command search desktop en el header |
| 3. Toolbar de bandejas | Completada | Patron comun aplicado a los 6 modulos |
| 4. Tabla operativa | Pendiente | Sin paginacion nueva |
| 5. Lista + preview | Pendiente | Piloto condicionado a evaluacion |
| 6. Detalles persistentes | Pendiente | Preserva orden movil |
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

## Siguiente Paso

Ejecutar la Tarea 4: tabla desktop operativa con semantica, prioridad de columnas y estados de fila.
