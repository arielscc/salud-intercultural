# Tarea 12C: la base que no responde

## Fecha

2026-08-28

## Objetivo

Que una base lenta o caída dé un error entendible en vez de dejar la pantalla
colgada, y que el arranque local no falle en la primera corrida.

Plan: [Lanzamiento por etapas](../sigeco-lanzamiento-por-etapas/tasks.md).

## El Defecto

`PrismaPg` se construía sin `connectionTimeoutMillis`. El valor por defecto de
`pg` es cero, que significa **esperar para siempre**. Con PostgreSQL apagado, el
ingreso quedaba en «Ingresando…» indefinidamente: sin timeout, sin mensaje y sin
volver a habilitar el botón.

En producción eso deja al personal frente a un botón muerto, sin saber si el
cobro entró.

## Cambios Implementados

### Timeout de conexión

`src/modules/database/client.ts`: `connectionTimeoutMillis` de **10 segundos**.
Distingue «la base tarda» de «la base no está». El valor también cubre la espera
por un lugar libre en el pool, así que uno más corto haría fallar picos de carga
legítimos.

### El ingreso explica qué pasó

`loginInternalUser` quedó envuelta en una traducción de fallos de
infraestructura al aviso `sistema`, con `unstable_rethrow` para dejar pasar
`redirect` y `notFound`, que Next implementa lanzando. Sin esa línea, cada
salida normal de la acción se leería como error de sistema.

El mensaje no habla de credenciales: el intento nunca llegó a compararse, y
decir «inválidas» mandaría a revisar una contraseña correcta. Tampoco dice qué
se rompió —a quien entra no le sirve y a quien ataca sí— y no audita el intento,
porque si la base es justo lo que falló, escribir el evento fallaría igual.

El correo escrito se conserva: la cookie no depende de la base.

### Cerrar sesión ya no depende de la base

`logoutInternalUser` hace primero lo que siempre funciona —borrar la cookie del
navegador— y después lo que puede fallar. Quien pidió salir, sale.

Esto excede lo que pedía el alcance, que hablaba solo del ingreso. Se incluyó
porque es el mismo defecto en el mismo archivo: en staging, el 2026-08-27,
cerrar sesión también quedaba colgado.

### El defecto que apareció al verificar

La primera versión del arreglo **no funcionaba**, y se vio al probarla: tras
cerrar sesión con la base caída, la cookie seguía en el navegador.

La causa es anterior a esta tarea. `setInternalSessionCookie` la crea con
`path: "/sigeco"`, pero `clearInternalSessionCookie` llamaba a
`cookieStore.delete(nombre)`, que apunta al path `/` y **no toca** una cookie
guardada en `/sigeco`. La cookie del correo ya lo hacía bien; la de sesión, no.

Con la base sana el defecto quedaba tapado: borrar la fila de sesión invalida el
token aunque la cookie sobreviva. Con la base caída no se borra ninguna de las
dos y **la sesión sobrevive al cierre**.

Se agregó la constante `internalSessionCookiePath`, usada al crear y al borrar,
para que no puedan volver a divergir.

## Validación

Lint y typecheck sin errores. Las 38 pruebas de `internal-auth` pasan.

Medido contra la base local, apagando y encendiendo el contenedor:

| Caso | Antes | Ahora |
| --- | --- | --- |
| Ingreso con la base caída | Colgado, sin fin | `303` en **10,3 s** a `?error=sistema` |
| Aviso en pantalla | Ninguno | «No pudimos verificar tus datos ahora…» |
| Botón | Atascado en «Ingresando…» | Vuelve a «Entrar», habilitado |
| Correo escrito | — | Se conserva |
| Cerrar sesión con la base caída | Colgado; sesión viva | Redirige a login; **cookie borrada** |
| Cerrar sesión con la base sana | Cookie sobrevivía | Cookie borrada; `/sigeco` rebota a login |

Con la base caída, `/sigeco` responde `500` y no una pantalla de sesión abierta:
el gate falla cerrado, que es lo correcto.

## Lo Que No Quedó Comprobado

El margen de transacción se subió de 5 s a 15 s
(`transactionOptions`), porque el 2026-08-28
`updateInventoryItemSuppliersRecord` tardó 6256 ms contra un contenedor recién
creado y `pnpm seed:demo` murió con «expired transaction».

**No se pudo atribuir el arreglo.** Se probó contra una base vacía nueva, en un
contenedor recién reiniciado: el seed pasa en la primera corrida —30 productos,
13 servicios, 3,9 s—. Pero al volver el límite a 5 s **también pasa**. Con el
volumen ya caliente el fallo no se reproduce.

Reproducirlo de verdad exige un volumen nuevo, `docker compose down -v`, que
borra la base local. No se hizo sin autorización.

El margen queda como resguardo razonable —esa misma transacción corre desde la
aplicación, y una función fría contra una base fría paga lo mismo—, pero
declarado como no verificado, no como fix comprobado.

## Pendientes

- Confirmar el criterio del seed contra un volumen nuevo, cuando se pueda
  borrar la base local.
- `scripts/security/incident-drill-local.ts` y `scripts/backup/drill-local-backup.ts`
  construyen su propio `PrismaClient` contra otra base y no heredan estos
  valores. No son scripts de arranque y un cuelgue ahí lo ve quien corre el
  simulacro; se dejaron como estaban a propósito.
- Queda la Tarea 12D. La Tarea 12 no cierra hasta que cierre.
