# Tarea 5: pantalla de activación del super administrador

## Fecha

2026-08-24

## Objetivo

Encender y apagar módulos desde la interfaz, con control y evidencia, en lugar de
hacerlo con un script. Es la tarea que pone el lanzamiento por etapas en manos de
Dirección y del super administrador.

Plan: [Lanzamiento por etapas](../sigeco-lanzamiento-por-etapas/tasks.md).

## Cambios Implementados

### Permisos

- `modules_read` y `modules_manage` agregados al enum, con la migración aditiva
  `20260824220000_module_management_permissions`.
- Ambos pertenecen a `core` en el mapa de módulos. Es deliberado: si el gate
  pudiera bloquearlos, un módulo apagado por error dejaría el sistema sin forma
  de volver a encenderlo.
- `direccion` recibe `modules_read`; el super administrador ya tiene todos.
  Ningún otro rol los tiene.

La prueba de cobertura de la Tarea 1 hizo su trabajo: falló hasta que los dos
permisos nuevos quedaron mapeados.

### Pantalla `/sigeco/modulos`

- **Etapas**: las cuatro del plan, con cuántos módulos de cada una están
  encendidos.
- **Módulos**: nombre, descripción, estado, de qué depende, desde cuándo está
  lanzado y quién lo hizo. Un módulo apagado que estuvo activo muestra la fecha,
  la persona y el motivo.
- **Tres estados visibles y distintos**: `Lanzado`, `Sin lanzar` y `Suspendido`.
  El último es el que estuvo activo y se apagó; confundirlo con "todavía no
  llegó su turno" borraría justamente la información que hace falta en un
  incidente.
- **Encender** pide confirmación. Si falta una dependencia no hay botón: se
  explica cuál falta, por nombre.
- **Apagar** pide motivo escrito (obligatorio en el formulario y revalidado en el
  servidor) y confirmación. Si otro módulo activo depende de este, tampoco hay
  botón: se nombra cuál hay que apagar antes.
- **Historial**: módulo, cambio, quién, cuándo y motivo, del más reciente al más
  antiguo.
- Dirección ve todo en solo lectura, con un aviso que lo explica.

### Aviso en el shell

Cuando hay módulos suspendidos, el shell muestra una franja que los nombra y
enlaza a la pantalla. Solo llega a quien tiene `modules_read`: el resto del
personal no necesita enterarse de una suspensión que no puede resolver, y la
consulta ni siquiera se ejecuta para ellos.

`getSuspendedModules` distingue "apagado" de "nunca lanzado" por `deactivatedAt`.

### Acción y auditoría

`setModuleActivationAction` valida con Zod, ejecuta dentro de `runAuditedAction`
y delega la regla en `setModuleActivation`, la misma función que usa
`pnpm modules:set`. No hay dos caminos con reglas distintas.

La acción auditada se llama `module.activate` o `module.deactivate` según el
caso, para que Dirección pueda filtrar los apagados en `/sigeco/auditoria`.

### Los accesos denegados a una página ahora se auditan

El criterio de la tarea pide que un rol ajeno que abra `/sigeco/modulos` quede
**redirigido y auditado**. Hasta hoy `requirePermission` solo redirigía: la
auditoría existía para las acciones, no para las páginas.

`requirePermission` y `requireModule` ahora registran el rechazo antes de
redirigir: `page.denied` cuando falta el permiso y `module.disabled` cuando el
módulo está apagado, con la misma forma que ya usaban las acciones.

**Este cambio es de todo el sistema, no solo de esta pantalla.** Es intencional:
el menú nunca ofrece una pantalla que el rol no puede abrir, así que un intento
por URL es una señal, no ruido. El volumen esperado es bajo y el valor para el
QA negativo por rol de la Tarea 14 es alto.

Para lograrlo hubo que separar `appendAuditEvent` y `getRequestId` en
`src/modules/audit/append.ts`: `service.ts` importa `@/modules/permissions` para
resolver al usuario, así que si las guardas importaran `service.ts` los dos
módulos quedarían en círculo. `service.ts` reexporta `appendAuditEvent` y su API
pública no cambió.

### Ajuste menor

`ConfirmForm` acepta `confirmVariant`. Encender un módulo no es una acción
destructiva y el botón rojo de confirmación sobraba ahí. El valor por omisión
sigue siendo `danger`, así que ningún uso existente cambia.

## Decisiones

### El núcleo no aparece con botones

`core` se muestra con la marca "Siempre activo" y sin acciones. El servidor
igual lo rechaza (`always_active`), pero ofrecer un botón que siempre falla es
una trampa.

### Las dependencias se explican, no se insinúan

Cuando una dependencia bloquea, la tarjeta no muestra un botón deshabilitado:
dice qué módulo falta encender o apagar, por su nombre visible. El mensaje de
error del servidor hace lo mismo con la lista que devuelve
`ModuleActivationError.blockers`.

### La pantalla lee, la capa de queries decide

La página calcula los bloqueos con los helpers puros solo para **mostrar** el
estado. Quien decide sigue siendo `setModuleActivation`, que revalida todo en el
servidor dentro de la transacción.

## Validación

- `npx prisma validate` y `npx prisma migrate deploy`: migración aplicada en
  desarrollo; los dos valores nuevos existen en el enum de PostgreSQL.
- `pnpm typecheck`: sin errores.
- `npx eslint src scripts --max-warnings=0`: sin errores.
- Pruebas unitarias: 455 en total, 450 aprobadas. Trece nuevas:
  - `src/modules/permissions/permissions.test.ts` cubre las guardas: deja pasar
    con permiso y módulo, rechaza y audita al rol sin permiso, rechaza y audita
    el módulo apagado, respeta el módulo fijado, no exceptúa al super
    administrador y nunca bloquea el núcleo.
  - `module-activation.schema.test.ts` cubre el motivo obligatorio al apagar, el
    motivo vacío o demasiado corto y el módulo inexistente.
  - Integración (escrita, no ejecutada): `getSuspendedModules` distingue el
    módulo nunca lanzado del apagado con motivo.
- Se actualizaron `security-boundaries` (la página nueva y su acción) y las
  pruebas del menú, que ahora incluye "Módulos".

### Fallos previos que no son de esta tarea

Los cinco de siempre: `paid-study.schema` (2), `audit-coverage`,
`privacy-controls` y el mapa de acciones de `security-boundaries`, que sigue
desactualizado en diez entradas anteriores a este plan. Agregué la mía para que
quede correcta cuando alguien lo reconcilie.

## Pendientes

- QA de navegador de la pantalla en 390, 768, 1024, 1280 y 1440 px, y el
  recorrido real de encender, apagar y volver a encender: cierre acumulado
  (Tarea 12).
- Falta verificar con una cuenta de Dirección que la vista de solo lectura se
  comporte como se espera; por código no tiene ningún formulario.
- La Tarea 6 agrega el modo solo lectura del módulo suspendido: hoy el aviso
  existe, pero el contenido del módulo apagado no es consultable.
