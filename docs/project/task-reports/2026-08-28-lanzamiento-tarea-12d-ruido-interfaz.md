# Tarea 12D: ruido de interfaz detectado en el QA

## Fecha

2026-08-28

## Objetivo

Cerrar los tres restos que el QA encontró y que no impiden operar, para que el
siguiente QA no vuelva a reportarlos.

Plan: [Lanzamiento por etapas](../sigeco-lanzamiento-por-etapas/tasks.md).

## Las Tres Rutas Legacy

`/sigeco/pacientes`, `/sigeco/pacientes/nuevo` y `/sigeco/visitas` eran tres
`page.tsx` cuyo cuerpo entero era una llamada a `redirect()`. React instrumenta
el render de cada componente; uno que lanza al instante deja una medición de
duración negativa, y el navegador registraba en cada visita:

```
Uncaught TypeError: Failed to execute 'measure' on 'Performance':
'LegacyPatientsPage' cannot have a negative time stamp
```

No rompía la navegación. Ensuciaba la consola donde se buscan errores de verdad.

Pasaron a `redirects()` en `next.config.mjs`, que es el lugar de una
redirección estructural: ocurre antes de renderizar nada. Se comprobó primero
que **nada en el código enlaza a esas rutas**; existen solo para no romper
marcadores anteriores a la fusión V3.7.

No son permanentes a propósito: un 308 se queda cacheado en el navegador y estas
rutas todavía pueden moverse.

Las dos rutas con parámetro —`pacientes/[id]` y `visitas/[id]`— se dejaron como
estaban. Son `async`, y por eso nunca produjeron el error.

**Un detalle que ahora es carga:** `/sigeco/pacientes/nuevo` dependía de que su
`page.tsx` estático ganara sobre `pacientes/[id]`. Al borrarlo, la redirección
correcta depende de que `redirects()` corra antes del enrutado por sistema de
archivos. Es comportamiento documentado de Next y quedó verificado, pero
conviene saberlo antes de tocar esa carpeta.

## El Formulario Que Perdía Lo Escrito

React limpia el formulario cuando la acción termina. Los cuatro campos del alta
de cliente eran no controlados y sin `defaultValue`, así que un teléfono mal
escrito obligaba a teclear todo de nuevo.

**Era peor que cosmético.** Cuando el servidor encuentra una ficha parecida, la
pantalla ofrece «Registrar de todos modos» — sobre un formulario ya vacío. Ese
botón enviaba nada.

`registerWalkInClientAction` ahora devuelve `values` con lo que la persona
escribió, en los dos resultados que no navegan (`invalid` y `duplicates`), y el
formulario los repone como `defaultValue`. El caso `created` no los necesita:
ahí se navega a la ficha.

## El Cero Negativo

`-{formatBs(descuento)}` con el signo escrito a mano mostraba `-0.00 Bs` cuando
no había descuento. Aparecía en dos lugares:

| Archivo | Qué mostraba |
| --- | --- |
| `order-picker/OrderPickerDialog.tsx` | `Descuento -0.00 Bs` en cada cobro sin descuento |
| `administracion/caja/page.tsx` | `Egresos y devoluciones en efectivo -Bs 0,00` |

En los dos, el signo ahora aparece solo cuando hay algo que restar.

`DoctorOrderConfirmPanel.tsx` tiene el mismo patrón pero ya estaba protegido por
`adminDiscountCents > 0`. Se dejó como estaba.

## Dos Controles Que Hubo Que Actualizar

La suite completa se corrió a propósito, porque esta tarea borra rutas y cambia
el tipo que devuelve una acción. **Encontró tres fallos**, los dos primeros
causados por el propio cambio:

- `scripts/security-boundaries.test.ts` enumera cada página privada. Sus tres
  entradas borradas se quitaron de `legacyRedirectPages`, con la razón anotada
  en el archivo.
- `scripts/secret-policy.test.ts` fallaba con `ENOENT` al leer los archivos
  borrados: `git ls-files` los sigue nombrando hasta que el borrado se commitea.
  Se agregó un filtro por existencia. Sin él, cualquier borrado sin commitear
  vuelve a romper esa prueba con un error que no habla de secretos.

## Validación

Lint y typecheck sin errores. **482 pruebas en 94 archivos, todas en verde.**

Verificado en el navegador a 1440 px:

| Criterio | Resultado |
| --- | --- |
| Consola en las tres rutas | Sin errores; las tres redirigen con `307` |
| Error de validación | Aviso visible y los tres campos conservan lo escrito |
| «Registrar de todos modos» | Crea la ficha; antes enviaba vacío |
| Descuento en cero | `0.00 Bs` |
| Descuento real | `-10.00 Bs`, total 40,00 |
| Caja sin egresos | `Bs 0,00` |

## Pendientes

- Con esto cierran 12B, 12C y 12D. Falta lo que la Tarea 12 todavía debe: el
  PR #2 sin fusionar, el recorrido por staging desplegado, rotar los dos
  secretos y el cierre acumulado.
