# Tarea 1: catálogo de módulos y mapa de permisos

## Fecha

2026-08-24

## Objetivo

Declarar en código qué módulos existen en SIGECO, qué dependencias duras tienen
entre sí y qué permiso pertenece a cuál, como base del lanzamiento por etapas.
Esta tarea no cambia el comportamiento del sistema: no toca la base de datos, la
navegación ni ninguna guarda. Define el vocabulario que usan las tareas
siguientes.

Plan: [Lanzamiento por etapas](../sigeco-lanzamiento-por-etapas/tasks.md).

## Cambios Implementados

- `src/features/modules/catalog.ts`: once módulos (`core`, `administracion`,
  `inventario`, `compras`, `catalogo`, `recepcion`, `consulta`, `enfermeria`,
  `seguimientos`, `opiniones`, `reportes`) con nombre visible, descripción,
  dependencias duras y orden de presentación. `core` se marca `alwaysActive`.
  Incluye `sigecoLaunchStages`, las cuatro etapas de lanzamiento como
  documentación ejecutable.
- `src/features/modules/permission-modules.ts`: mapa de los 64 valores de
  `InternalPermission` hacia los módulos que los habilitan, y `retiredPermissions`
  derivado de las entradas vacías.
- `src/features/modules/activation.ts`: helpers puros `normalizeActiveModules`,
  `moduleIsActive`, `modulesEnablingPermission`, `permissionIsEnabled`,
  `resolveActivationBlockers`, `moduleCanBeDeactivated` y
  `resolveDeactivationBlockers`.
- `src/features/modules/catalog.test.ts` y `activation.test.ts`: 31 pruebas.

## Decisiones

### Un permiso puede tener varios módulos que lo habilitan

Un permiso queda habilitado cuando **al menos uno** de sus módulos está activo.
Es lo que permite que Administración lea y cree fichas de pacientes en la Etapa 1
con Recepción apagada, sin duplicar permisos ni relajar roles.

El mapa es la red amplia, pensada para bloquear acciones de un módulo apagado.
La pertenencia exacta de una ruta a un módulo se resolverá aparte con
`requireModule` en la Tarea 3, porque varias rutas comparten un mismo permiso.

### Los permisos de leads quedan retirados

`leads_read`, `leads_create`, `leads_update`, `leads_contact` y `leads_reminder`
no los habilita ningún módulo. La UI interna de leads se retiró en la V3.7 y las
acciones de `src/features/crm/actions.ts` no tienen ninguna pantalla que las
invoque; se verificó que no existen consumidores fuera de esa carpeta. A partir
de la Tarea 3 esas acciones quedarán bloqueadas también para el super
administrador, que es el único rol que todavía conserva esos permisos.

### El seguimiento es un módulo con dueño único

`followups_*`, `reminder_rules_manage` y `reminders_review` los habilita solo
`seguimientos`. Consecuencia a tener presente: mientras ese módulo esté apagado,
la tarjeta con la que el médico agenda un seguimiento y el trabajo de contacto de
Recepción no estarán disponibles, aunque Consulta y Recepción sí lo estén. Como
`seguimientos` solo depende de `recepcion`, Dirección puede adelantarlo a la
Etapa 2 o 3 sin tocar código. **Queda pendiente de confirmación de Dirección** si
se adelanta o se mantiene en la Etapa 4.

### Se agregó el bloqueo de desactivación

El plan pedía `resolveActivationBlockers`. Se agregó además
`resolveDeactivationBlockers`, que responde la misma regla dura desde el otro
lado: qué módulos activos dependen del que se quiere apagar. Sin esa función se
podría apagar Recepción y dejar Consulta encendida, rompiendo la invariante que
Dirección aprobó. Es el mismo grafo de dependencias, sin costo adicional.

### El núcleo se declara, no se codifica en una constante suelta

`core` es un módulo del catálogo con la marca `alwaysActive`. `moduleIsActive` lo
resuelve por esa marca y no por comparar contra la cadena `"core"`, para que el
día que otro módulo deba ser permanente baste declararlo.

## Validación

- `npx eslint src/features/modules --max-warnings=0`: sin errores.
- `pnpm typecheck`: sin errores.
- `npx vitest run src/features/modules`: 2 archivos, 31 pruebas aprobadas.

Pruebas incluidas:

- **Cobertura del enum:** todo valor de `InternalPermission` está mapeado y el
  mapa no declara permisos inexistentes. Un permiso nuevo sin mapear falla la
  prueba. Es la garantía de que nada quede fuera del gate de la Tarea 3.
- Integridad del catálogo: códigos únicos, dependencias existentes, sin ciclos,
  y la cadena Enfermería → Consulta → Recepción declarada.
- Las cuatro etapas cubren todos los módulos apagables sin repetir, y cada etapa
  se puede activar en orden sin dependencias faltantes.
- Etapa 1 simulada: vender, cobrar, Caja, inventario, compras y catálogo quedan
  habilitados; visitas, consulta, enfermería, consentimientos, seguimientos,
  opiniones y reportes quedan apagados; Administración conserva lectura y alta
  de fichas.
- Los permisos retirados siguen apagados incluso con los once módulos activos.

## Pendientes

- Suite completa, integración, build y QA de navegador: corresponden al cierre
  acumulado (Tareas 11 y 12 del plan), según el modo de ejecución vigente.
- Confirmar con Dirección en qué etapa se enciende `seguimientos`.
- Los permisos `modules_read` y `modules_manage` se agregarán en la Tarea 5 y
  pertenecerán a `core`; la prueba de cobertura obligará a mapearlos.

## Corrección Al Plan

La Tarea 7 mencionaba un permiso `patients_write` que no existe en el enum. Se
corrigió en `tasks.md`: los permisos reales son `patients_create` y
`patients_update`.
