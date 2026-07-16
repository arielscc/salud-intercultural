# Progreso De Sigeco Desktop Complementario

Ultima actualizacion: 2026-07-15.

## Estado General

Iniciativa en implementacion. La navegacion y el contexto desktop quedaron resueltos sin cambiar la rama movil/tableta.

| Tarea | Estado | Nota |
| --- | --- | --- |
| 1. Navegacion y contexto | Completada | Sidebar agrupada y breadcrumbs desde `lg` |
| 2. Busqueda global de pacientes | Pendiente | Reutiliza busqueda existente |
| 3. Toolbar de bandejas | Pendiente | Empieza en Recepcion y Seguimientos |
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

## Siguiente Paso

Ejecutar la Tarea 2: busqueda global de pacientes en el header desktop, reutilizando la server action y el formato de resultados existentes sin consultar bajo 1024 px.
