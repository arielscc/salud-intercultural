# Tarea 10B: deuda previa al plan

## Fecha

2026-08-24

## Objetivo

Dejar la suite en verde antes de encender el CI, para que su primer rojo
signifique algo.

Plan: [Lanzamiento por etapas](../sigeco-lanzamiento-por-etapas/tasks.md).

## Por Qué Existió Esta Tarea

Cinco pruebas venían fallando desde antes de este plan y se venían reportando
como "fallos previos" sin diagnosticar. Al mirarlas de cerca **no eran todas
tests desactualizados**: dos señalaban defectos reales del código, y uno de ellos
era una regresión de seis días atrás.

Es el costo previsible del modo de ejecución vigente desde el 2026-08-02, que
corre solo lint y typecheck por tarea. No es un reproche al modo: es la factura
que ese modo deja para el cierre acumulado, y conviene pagarla antes del CI y no
durante.

## Cambios Implementados

### El correo del usuario ya no viaja en la URL

**Regresión del 2026-08-18** (commit `7c7a430`). Al fallar un ingreso,
`getLoginErrorRedirect(email)` redirigía a `/sigeco/login?error=invalid&email=…`
y la página lo leía con `params.email` para no hacer reescribir el correo.

La intención era buena; el mecanismo, no. Un correo en el query string queda en:

- el historial del navegador, en una computadora compartida de la clínica;
- los logs de acceso del servidor y de cualquier proxy;
- la cabecera `Referer` de todo pedido posterior.

Es correo de personal, no de paciente, así que la gravedad es media. Pero es
exactamente lo que la prueba de privacidad del repositorio prohíbe, y llevaba
seis días sin que nadie lo viera.

**Solución:** el correo se conserva en una cookie corta —`sigeco_login_hint`,
`httpOnly`, `sameSite lax`, dos minutos, limitada a la ruta del login— que se
borra al ingresar bien. El formulario sigue llegando con el correo escrito y la
URL queda limpia.

Se eligió la cookie y no revertir el prellenado porque el formulario desactiva a
propósito el autocompletado del navegador (`autoComplete="off"`,
`data-lpignore`), así que sin esto habría que reescribir el correo en cada
intento fallido.

### Una acción de lectura sin auditoría, documentada como tal

`validateAttributionEvidenceCodeAction` valida permiso pero no genera evento.
Solo responde si un código de campaña existe: no revela datos ni escribe nada.

Ya existía el mecanismo para estos casos —`nonCriticalReadActions` en
`audit-coverage.test.ts`, con `searchReceptionPatientsAction`—, así que se sumó
ahí con su justificación. Auditar cada tecleo de un buscador enterraría los
eventos que sí importan.

### El mapa que vigila los permisos, al día

`security-boundaries` declaraba 94 acciones y existían 104. Mientras estuvo
desactualizado, ese control **dejó de avisar** si una acción nueva quedaba con el
permiso equivocado: es el guardián de los permisos, y estaba ciego.

Se agregaron las once que faltaban, con el permiso que cada una exige en
servidor, y se quitó `updateNursingWorkItemAction`, que ya no existe.

### Un campo "opcional" que no lo era

`paidStudyOrderSchema.total` está documentado como opcional, pero solo aceptaba
llegar **vacío**, no llegar **ausente**: un llamador que no mandara la clave
fallaba con `Required`. En producción no se notaba porque
`parsePaidStudyForm` siempre la envía.

Se corrigió el esquema en lugar de acomodar la prueba: el defecto estaba en el
código, y la prueba tenía razón. El cambio solo amplía lo que se acepta, así que
ninguna entrada válida deja de serlo.

## Decisiones

### Se corrigió el código, no las pruebas

De los cinco fallos, cuatro se resolvieron cambiando el código o el control, y
ninguno bajando la exigencia de una prueba. La única excepción documentada es la
acción de lectura, que ya tenía un mecanismo previsto para ese caso.

### El mismo patrón existe en otro esquema

`optionalMoneyString` en `sale.schema.ts` tiene la misma forma que provocó el
fallo de `total`. Hoy no molesta porque `parseSaleOrderForm` siempre envía la
clave, pero es la misma trampa esperando. Se deja anotado y no se toca acá para
no mezclar un cambio de ventas dentro de una tarea de saneamiento.

## Validación

- `pnpm typecheck`: sin errores.
- `npx eslint src scripts --max-warnings=0`: sin errores.
- **`pnpm test`: 93 archivos, 479 pruebas, 0 fallos.** Es la primera suite
  completamente verde desde el 2026-08-02.

## Pendientes

- QA del ingreso fallido: comprobar en el navegador que el correo vuelve escrito
  y que la URL no lo lleva. Es una cookie de dos minutos limitada a la ruta del
  login; por código funciona, falta verlo.
- `optionalMoneyString` en `sale.schema.ts`, con la misma forma frágil.
- Las pruebas de integración siguen escritas y sin ejecutar: eso corresponde al
  cierre acumulado de la Tarea 11.
