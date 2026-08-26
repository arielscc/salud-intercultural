# Investigacion De Arquitectura De Informacion Para Sigeco Desktop

Fecha: 2026-07-15.

Estado: investigacion aplicada; iniciativa desktop cerrada el 2026-07-16 tras QA integral.

## Proposito

Definir como debe evolucionar Sigeco en escritorio como complemento de la iniciativa movil primero. El objetivo no es hacer una version mas grande de movil, sino aprovechar el espacio, el puntero y el teclado para reducir cambios de contexto, facilitar la comparacion y acelerar el trabajo repetitivo.

Esta investigacion no autoriza cambios de negocio, permisos, queries ni rutas. Primero fija principios, limites responsivos y patrones de presentacion; la implementacion se divide en `tareas-de-desktop.md`.

## Fuentes Consultadas

- [Catalogo de componentes de shadcn studio](https://shadcnstudio.com/components): incluye variantes de Autocomplete, Breadcrumb, Command, Data Table, Resizable, Tabs, Tooltip, Dialog, Collapsible, Sonner y otros componentes aplicables al panel.
- [Table de shadcn studio](https://shadcnstudio.com/docs/components/table): recomienda HTML semantico, encabezados claros, headers pegajosos, estados de fila, columnas responsivas, estados vacios y paginacion.
- [Data table de Carbon](https://carbondesignsystem.com/components/data-table/usage/): concentra busqueda, filtros, ajustes y acciones globales en una toolbar; contempla ordenamiento, expansion, seleccion y paginacion segun la tarea.
- [Table de GOV.UK](https://design-system.service.gov.uk/components/table/): refuerza el uso de captions, encabezados de columna/fila y alineacion especifica para valores numericos.
- [Tabs de GOV.UK](https://design-system.service.gov.uk/components/tabs/): los tabs son apropiados para usuarios frecuentes de sistemas de casos cuando las secciones son relacionadas, no deben compararse al mismo tiempo y la primera es la mas usada.
- [Recognition rather than recall de NN/g](https://www.nngroup.com/articles/recognition-and-recall/): las acciones, opciones y datos necesarios deben permanecer visibles o recuperables sin depender de la memoria.
- [Card sorting de NN/g](https://www.nngroup.com/articles/card-sorting-definition/): la agrupacion y nomenclatura deben responder al modelo mental de los usuarios, no a la estructura interna del software.
- [F-shaped scanning de NN/g](https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content/): una jerarquia deliberada, encabezados descriptivos y agrupaciones visibles evitan que el usuario tenga que encontrar su propio recorrido de lectura.

## Capacidades De Diseno Que Requiere La Iniciativa

Las siguientes son las habilidades que deben aplicarse durante el trabajo, no componentes de interfaz:

1. Auditoria de contenido: inventariar datos, acciones, estados, duplicados y vacios por pantalla.
2. Arquitectura por tareas: ordenar informacion por frecuencia, urgencia y secuencia operativa, no por tablas de base de datos.
3. Taxonomia y rotulado: usar terminos clinicos y operativos que los roles ya reconocen.
4. Jerarquia visual: distinguir contexto, dato primario, excepcion, accion y detalle secundario.
5. Diseno de informacion densa: alinear, agrupar y comparar sin convertir cada dato en una card.
6. Divulgacion progresiva: mantener visible lo necesario para decidir y esconder solo detalle secundario.
7. Diseno de tablas: definir columna identificadora, prioridades, alineacion, estados, acciones y comportamiento al crecer.
8. Evaluacion heuristica y QA de navegador: verificar reconocimiento, feedback, prevencion de errores, teclado, foco y estabilidad responsive.

Skills locales recomendados para ejecutar y revisar la iniciativa: `plan-design-review` antes de cambios estructurales, `design-review` para consistencia visual, `browse` para recorridos y capturas, y `qa` para el cierre integral. No sustituyen la validacion con personal real de recepcion, consulta, enfermeria y caja.

## Auditoria Del Estado Actual

### Fortalezas

- El sistema Marea ya esta orientado a una herramienta operativa de escritorio: sidebar fija desde `lg`, header persistente, tema claro y densidad media.
- Las bandejas ya ofrecen tablas semanticas desde `sm` y las pantallas de detalle usan dos columnas desde `xl`.
- Los tokens, botones, estados, formularios y tipografia son consistentes; no hace falta un nuevo sistema visual.
- La iniciativa movil ya resolvio cards, retorno, controles tactiles y reordenamiento. Esa experiencia debe quedar congelada durante esta tanda.

### Brechas Priorizadas

| Prioridad | Hallazgo | Consecuencia |
| --- | --- | --- |
| Alta | La navegacion desktop es una lista plana y el header no aporta acceso global | El usuario salta por modulos, pero no dispone de agrupacion, ubicacion ni acceso rapido al paciente |
| Alta | Busqueda, filtros, tabs y acciones aparecen en bloques distintos segun el modulo | Aumenta el recorrido visual y cada bandeja se aprende por separado |
| Alta | Los detalles largos apilan muchas cards y pierden contexto al hacer scroll | Cuesta relacionar identidad, estado, historial y accion actual |
| Alta | La tabla base solo resuelve presentacion; no define toolbar, header pegajoso, prioridad de columnas ni foco de fila | La densidad no escala bien y las acciones quedan dispersas |
| Media | El dashboard resume volumen, pero no funciona aun como cola de excepciones y accesos de trabajo | El espacio desktop informa mas de lo que ayuda a decidir el siguiente paso |
| Media | Las acciones irreversibles siguen directas en desktop y los avisos visuales solo existen en movil | Falta prevencion y confirmacion perceptible en el flujo de teclado/puntero |
| Media | No existe una anatomia comun para formularios extensos | Secciones, acciones y resumen cambian de posicion entre modulos |

## Modelo De Presentacion Propuesto

Toda pantalla desktop debe seguir, cuando aplique, esta secuencia:

1. **Ubicar:** modulo, pagina y entidad actual visibles.
2. **Entender:** resumen y excepciones antes del detalle historico.
3. **Reducir:** busqueda, tabs y filtros en una toolbar unica.
4. **Comparar:** tabla alineada con la entidad en la primera columna y el estado cerca de la accion.
5. **Inspeccionar:** abrir un detalle o preview sin perder innecesariamente la cola de trabajo.
6. **Actuar:** accion primaria persistente; acciones secundarias agrupadas y destructivas confirmadas.
7. **Confirmar:** feedback visible y cercano despues de cada operacion.

Reglas de densidad:

- No crear cards para datos sueltos. Usar cards solo para unidades independientes, herramientas enmarcadas o items repetidos.
- Mantener filas de tabla cercanas a los 46 px actuales. Una fila alta solo se justifica si contiene dos lineas utiles.
- Reservar color para estado, riesgo y accion; la estructura debe depender primero de alineacion, espacio, borde y tipografia.
- Mantener visibles identidad, estado, plazo y accion. Notas, metadatos y trazabilidad pueden usar expansion, tabs o panel secundario.
- Usar tabs solo cuando las secciones sean pares, el usuario no necesite compararlas y la primera sea la mas frecuente. Para recorridos lineales se conservan secciones y encabezados.

## Contrato De Preservacion Movil

La iniciativa desktop comienza en `lg` (`min-width: 1024px`), porque ese es el breakpoint donde aparece el shell persistente. El rango inferior a 1024 px, incluido movil y tableta, conserva la interfaz actual.

Tecnicas permitidas:

1. Markup desktop nuevo con `hidden lg:*`; la rama actual permanece sin cambios o se limita con `lg:hidden` solo cuando exista una sustitucion equivalente.
2. Ajustes visuales exclusivamente con variantes `lg:` o `xl:`. No se cambian clases base ni `sm:` para conseguir un resultado desktop.
3. Comportamiento interactivo desktop decidido con `window.matchMedia("(min-width: 1024px)")` al ejecutar la accion, nunca al renderizar en servidor.
4. Componentes cliente compartidos pueden recibir una variante desktop, pero su valor por defecto conserva el comportamiento movil actual.
5. Queries, server actions, permisos y orden de datos solo se comparten si el resultado movil queda semanticamente identico. Si no puede garantizarse, el cambio se pospone o requiere aprobacion explicita.

Matriz minima de regresion: 390x844, 768x1024, 1024x768, 1280x800 y 1440x900. En los dos primeros viewports no debe aparecer ningun control, agrupacion, cambio de orden ni comportamiento de esta iniciativa.

## Mapa De Componentes Shadcn Studio

| Necesidad | Patron de shadcn studio | Uso previsto |
| --- | --- | --- |
| Acceso rapido | Command + Autocomplete | Busqueda global de pacientes en header desktop |
| Ubicacion | Breadcrumb | Detalles y formularios, sin reemplazar el retorno movil |
| Bandejas | Data Table + Table | Toolbar, header pegajoso, estados de fila y columnas priorizadas |
| Vistas relacionadas | Tabs | Historiales que no necesitan comparacion simultanea |
| Contexto persistente | Resizable | Lista + preview solo en pantallas amplias donde aporte valor |
| Detalle secundario | Collapsible | Metadatos o trazabilidad no esenciales para la decision |
| Acciones secundarias | Dropdown Menu + Tooltip | Comandos de baja frecuencia e iconos no obvios |
| Prevencion de error | Alert Dialog | Confirmacion desktop de operaciones irreversibles |
| Feedback | Sonner | Avisos en esquina superior derecha para desktop |

Los componentes se toman como patrones, no como un tema visual nuevo. Deben adaptarse a Tailwind 3.4, tokens Marea, radios existentes, iconos Lucide y componentes internos. Antes de instalar se revisa licencia/disponibilidad y el arbol de dependencias; si una variante agrega demos o dependencias innecesarias, se replica solo el patron necesario y se documenta.

## Decisiones Y Limites

- Se conserva Marea; no se cambia paleta, tipografia, marca ni lenguaje visual.
- No se aplica un patron master-detail a todos los modulos. Primero se prueba en una cola con alto cambio de contexto y se valida antes de generalizar.
- No se agrega personalizacion persistente de columnas ni densidad en la primera tanda; requiere definir almacenamiento, defaults por rol y soporte.
- No se implementa paginacion nueva: la iniciativa movil la dejo pospuesta y cambiar el conjunto servido afecta todos los viewports.
- Card sorting y tree testing quedan como investigacion con usuarios antes de renombrar o reordenar modulos. La primera tarea solo agrega agrupacion visual desktop, sin cambiar rutas ni permisos.
