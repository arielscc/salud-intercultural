# Investigacion De Diseno Movil (2026-07-15)

Proposito: fundamentar con fuentes externas las decisiones de arquitectura de informacion y presentacion de datos de la iniciativa "Sigeco movil primero" (`docs/project/sigeco-movil/tareas-de-movil.md`), bajo la restriccion nueva del usuario: **las tareas modifican solo la version movil; la version web/desktop no cambia en nada visible ni de comportamiento**.

## 1. Arquitectura De Informacion En Movil

- La navegacion se usa mas en movil que en desktop, asi que las etiquetas de navegacion deben ser claras y visibles; el icono hamburguesa no es universalmente entendido por usuarios de baja alfabetizacion digital (NN/g). Sigeco ya mitiga esto: el drawer movil muestra icono + etiqueta por modulo.
- Priorizar contenido sobre estructura: en pantalla chica cada registro debe exponer solo 1-2 datos primarios; el resto se revela por profundidad (pagina de detalle), no por densidad. "El usuario solo necesita suficiente informacion para elegir el item; el detalle completo vive en la pantalla secundaria" (UXmatters).
- Progressive disclosure como necesidad practica en movil: mostrar solo lo que el usuario necesita en cada etapa y revelar mas al profundizar; evita sobrecarga y scroll largo (Digia, NN/g).
- Zona del pulgar: las acciones primarias deben caer en el arco natural del pulgar (parte inferior/media de la pantalla); los targets tactiles minimos recomendados son 44x44 px (las guias del proyecto ya piden 40 px; en componentes nuevos se apunta a 44 px cuando el layout lo permita).

## 2. Presentacion De Listas Y Tablas

Anti-patrones documentados (UXmatters, UX Movement, Appnroll):

- Scroll horizontal en tablas: navegacion en dos ejes confunde y esconde columnas criticas (exactamente el hallazgo #1 de la evaluacion).
- Convertir cada fila en un mini layout de dos columnas etiqueta:valor repetido: destruye la comparabilidad y repite labels que el header ya daba.
- Encabezados complejos sin contexto de pagina; centrado vertical del contenido de fila.

Patrones recomendados:

- Cards apiladas con pocos campos clave y detalle expandible o en pagina propia; util para volumenes grandes de datos.
- Acortar: eliminar columnas que no sirven a la tarea central (a menudo solo 1-2 columnas importan de verdad en movil).
- Enfatizar el valor critico en bold; usar chips/iconos/abreviaturas en vez de texto verboso ("Si/No", estados largos).
- Controles de orden/filtro en lenguaje simple y de un toque.

Esto valida el patron ya definido en las Tareas 1-2: cards debajo de `sm` con titulo + dato critico + chip de estado, tabla intacta desde `sm`.

## 3. Feedback, Carga Y Confirmaciones

- Toasts: el resultado de una accion debe confirmarse dentro del viewport actual; en movil la posicion inferior queda en la zona del pulgar y no tapa el header.
- Skeleton vs spinner: skeleton para contenido con silueta conocida (listas, dashboards); spinner sobre el propio boton para acciones puntuales (guardar, cobrar). Cargas < 500 ms no necesitan skeleton. Nota: en esta iniciativa los estados de carga quedan pospuestos porque `loading.tsx` y los estados pending de botones afectan tambien a desktop (ver seccion 5).
- Bottom sheets (NN/g): adecuados para informacion temporalmente importante y acciones contextuales de la pantalla actual; usar variante modal (con scrim) cuando el usuario debe resolver antes de continuar; incluir boton de cierre visible (no solo swipe ni solo handle); nunca apilar sheets ni usarlos como navegacion.
- Acciones destructivas: agregar friccion proporcional a la irreversibilidad; boton de confirmacion en rojo con etiqueta verbo + sustantivo ("Marcar retiro", no "Aceptar"); para acciones de altisimo riesgo se prefiere dialogo centrado sobre bottom sheet. Los casos de Sigeco ("Se retiro", "Cerrar visita") son irreversibles de riesgo medio y contextuales a la fila -> bottom sheet modal con scrim, consecuencia explicada, confirmar en rojo y cancelar es el patron correcto en movil.

## 4. Formularios Moviles

- Configurar `type`, `inputmode` y `autocomplete` correctos es la mejora de mayor retorno: teclado adecuado reduce el tiempo de tipeo ~30% y los errores ~50% (CSS-Tricks, UX Movement). Para telefono: `type="tel"` (teclado de marcado). Estos atributos son inertes en desktop (el teclado fisico ignora `inputmode`), por lo que son seguros bajo la regla "solo movil".
- Busqueda con sugerencias en vivo supera al patron formulario + submit + recarga: menos tipeo, menos espera, y el usuario confirma visualmente que el registro existe antes de navegar.
- Los pickers nativos del sistema (select, date) siguen siendo superiores en movil a los reemplazos custom; se conservan (decision ya documentada en la Tarea 8).

## 5. Tecnica: Cambios Solo Movil Sin Tocar La Web

Restriccion: la version desktop no cambia ni visual ni funcionalmente. Tres tecnicas seguras, en orden de preferencia:

1. **Ramas CSS por breakpoint**: el markup movil lleva `sm:hidden` y el markup actual `hidden sm:block` (o simplemente se conserva sin cambios cuando el agregado es solo movil). Seguro con SSR (no hay hidratacion condicionada), sin parpadeo. Costo: DOM duplicado, aceptable en listas de <= 80 filas como las de Sigeco.
2. **`matchMedia` evaluado en el handler**: para comportamiento (no layout), decidir en el momento de la interaccion con `window.matchMedia("(max-width: 639px)").matches`. Como no condiciona el render inicial, no hay problemas de hidratacion; en desktop el flujo actual corre identico.
3. **Atributos inertes en desktop**: `inputmode`, `autocomplete`, `enterkeyhint`, `type="tel"` solo alteran teclados tactiles.

Lo que NO puede aislarse a movil (y por eso se pospone):

- `loading.tsx`: cambia el comportamiento de navegacion del App Router en todos los viewports (hoy la pagina anterior queda visible hasta que llega la nueva; con `loading.tsx` habria swap inmediato tambien en desktop).
- Paginacion por search params: cambia los datos que el servidor envia, iguales para ambos viewports.
- Estados pending de botones (`useFormStatus` + disabled + spinner): comportamiento compartido por naturaleza.

## 6. Aplicacion A Las Tareas

| Tarea | Clasificacion | Tecnica solo movil |
| --- | --- | --- |
| 1 Listas en cards (Recepcion) | Solo movil directa | Cards `sm:hidden`; tabla actual intacta desde `sm` |
| 2 Resto de listas en cards | Solo movil directa | Igual que T1 |
| 3 Toasts (sonner) | Solo movil con tecnica | Contenedor del Toaster oculto desde `sm` (`sm:hidden`); desktop sigue sin toasts, como hoy |
| 4 Confirmacion de irreversibles | Solo movil con tecnica | `matchMedia` en el handler: < 640 px abre bottom sheet; >= 640 px envia directo como hoy |
| 5 Estados de carga | Pospuesta | Compartida con web (`loading.tsx` y pending afectan ambos) |
| 6 Autocomplete de pacientes | Solo movil con tecnica | Autocomplete `sm:hidden`; el form de busqueda actual queda `hidden sm:block` |
| 7 Reorden de detalles + Volver | Solo movil directa | `order-*` responsive; el enlace "Volver" y la barra pegajosa llevan `sm:hidden` |
| 8 Filtros y tabs tactiles | Solo movil con tecnica | Auto-submit del filtro solo si `matchMedia` movil; toggle-group `sm:hidden`, links actuales desde `sm` |
| 9 Telefono con teclado numerico | Solo movil con tecnica | Atributos inertes (`type="tel"`, `autocomplete="tel"`); mascara visual solo con puntero tactil (`matchMedia("(pointer: coarse)")`) |
| 10 Paginacion | Pospuesta | Compartida con web (los datos servidos cambian para ambos) |
| 11 QA integral | Sin cambio | Agrega verificacion explicita de que desktop (1280 px) quedo identico |

## Fuentes

- NN/g — Information Architecture: Study Guide: https://www.nngroup.com/articles/ia-study-guide/
- NN/g — Bottom Sheets: Definition and UX Guidelines: https://www.nngroup.com/articles/bottom-sheet/
- NN/g — Skeleton Screens 101: https://www.nngroup.com/articles/skeleton-screens/
- UXmatters — Designing Mobile Tables: https://www.uxmatters.com/mt/archives/2020/07/designing-mobile-tables.php
- UX Patterns for Developers — Data Table Pattern: https://uxpatterns.dev/patterns/data-display/table
- Appnroll — 5 Practical Solutions to Make Responsive Data Tables: https://medium.com/appnroll-publication/5-practical-solutions-to-make-responsive-data-tables-ff031c48b122
- Digia — Progressive Disclosure in Mobile UX: https://www.digia.tech/post/progressive-disclosure-mobile-ux/
- Digia — Bottom Sheets vs Modals: https://www.digia.tech/post/bottom-sheets-vs-modals-interruption-layer/
- Webstacks — Mobile UX Design Guide 2025: https://www.webstacks.com/blog/mobile-ux-design
- CSS-Tricks — Better Form Inputs for Better Mobile User Experiences: https://css-tricks.com/better-form-inputs-for-better-mobile-user-experiences/
- CSS-Tricks — Finger-friendly numerical inputs with inputmode: https://css-tricks.com/finger-friendly-numerical-inputs-with-inputmode/
- UX Movement — Input Types: Give Users the Right Keyboard on Mobile Forms: https://uxmovement.com/mobile/input-types-give-users-the-right-keyboard-on-mobile-forms/
- Onething — Skeleton Screens vs Loading Spinners: https://www.onething.design/post/skeleton-screens-vs-loading-spinners
- Joel Pascual — A UX guide to destructive actions: https://medium.com/design-bootcamp/a-ux-guide-to-destructive-actions-their-use-cases-and-best-practices-f1d8a9478d03
