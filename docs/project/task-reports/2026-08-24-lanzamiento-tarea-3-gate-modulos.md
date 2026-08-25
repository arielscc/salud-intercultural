# Tarea 3: gate de módulos en servidor

## Fecha

2026-08-24

## Objetivo

Que una página o una acción de un módulo apagado no se pueda ejecutar, aunque se
conozca la URL. Es la tarea que convierte el catálogo y el estado de las Tareas 1
y 2 en un control real.

Plan: [Lanzamiento por etapas](../sigeco-lanzamiento-por-etapas/tasks.md).

## Cambios Implementados

### Dos puntos de control para todo el sistema

- `requirePermission` exige el permiso del rol y, además, que el módulo esté
  lanzado. Cubre las 50 páginas privadas.
- `runAuditedAction` aplica la misma verificación antes de ejecutar. Cubre las
  126 acciones auditadas y los route handlers de archivos clínicos.
- `requireModule(code)` queda disponible para rutas que pertenecen a un módulo
  pero no piden un permiso propio. Todavía no tiene llamadores.

El super administrador **no** evade el gate: un módulo apagado lo está para
todos. Lo que puede hacer es encenderlo.

### La ruta manda cuando el permiso lo comparten varios módulos

`requirePermission` y `runAuditedAction` aceptan un `module` opcional. Sin él
basta con que uno de los módulos que declaran el permiso esté activo; con él
manda la pantalla.

Hizo falta porque varios permisos son compartidos a propósito. `/sigeco/inventario`
usa `inventory_read`, que también habilitan Administración, Compras, Consulta y
Enfermería: sin fijar el módulo, Inventario seguiría abierto con Inventario
apagado. Quedaron fijados:

| Pantalla o acción | Permiso | Módulo |
| --- | --- | --- |
| `/sigeco/recepcion` (vista pacientes), ficha y edición | `patients_read`, `patients_update` | `recepcion` |
| `/sigeco/catalogo` y detalle | `service_catalog_read` | `catalogo` |
| `/sigeco/inventario`, lotes, traslados, proveedores | `inventory_read`, `suppliers_read` | `inventario` |
| `/sigeco/enfermeria` y detalle | `nursing_read` | `enfermeria` |
| `/sigeco/sucursales` | `reports_read` | `core` |
| Editar ficha desde Recepción | `patients_update` | `recepcion` |
| Umbral de descuento del catálogo | `discount_threshold_manage` | `catalogo` |
| Umbral del producto y ajuste de lote | `discount_threshold_manage`, `inventory_lot_adjust` | `inventario` |

`/sigeco/sucursales` merece explicación: administra sedes, que son parte del
núcleo, pero está protegida con `reports_read`. Sin fijar `core` habría quedado
apagada en la Etapa 1, cuando justamente hace falta para configurar El Alto.

### El rechazo por módulo es un evento propio

Un módulo apagado se audita como `action: "module.disabled"`,
`entityType: "module"`, `result: "denied"`, con el módulo, la acción intentada y
el permiso en el contexto. Dirección puede filtrar por esa acción en
`/sigeco/auditoria` y ver qué se intentó usar antes de que esa etapa estuviera
lanzada, sin confundirlo con una falta de permiso, que sigue registrándose con la
acción intentada y `reason: "missing_permission"`.

### Avisos distintos

El redirect al inicio ahora lleva `?aviso=modulo-no-disponible` o
`?aviso=permiso-denegado`, y `ActionNotice` los muestra como advertencia, no como
éxito. Antes el rechazo por permiso redirigía en silencio; ahora la persona
entiende por qué volvió al inicio y las dos causas se distinguen.

### Escritura del estado y script de línea de comandos

`setModuleActivation` en `src/modules/database/queries/modules.ts` enciende o
apaga un módulo y registra el evento en una sola transacción, aplicando las
dependencias duras en los dos sentidos y exigiendo motivo al apagar. El script
`pnpm modules:set` la usa.

Esto **excede la letra de la tarea** y se hizo por una razón concreta: con el
gate activo y solo el núcleo encendido, el entorno local queda inutilizable hasta
que exista la pantalla de la Tarea 5. La lógica vive en la capa de queries
justamente para que esa pantalla la reutilice en lugar de reimplementarla con
reglas propias.

### Pruebas que impiden la regresión

`scripts/module-gate.test.ts` recorre el código y falla cuando una página o una
acción usa un permiso compartido sin decidir su módulo. Las acciones que lo
comparten a propósito —tiempos por área, captación, alta de ficha, adjuntos—
están listadas con su justificación, y otra prueba avisa si esa lista queda
obsoleta. Verifiqué que ambas fallan de verdad quitando un `module` a propósito.

## Decisiones

### El gate va sobre el permiso, no sobre la ruta

Interceptar `requirePermission` y `runAuditedAction` cubre todo el sistema sin
tocar 50 páginas ni 126 acciones una por una, y sin dejar huecos cuando alguien
agregue una pantalla nueva. El `module` opcional resuelve el único caso que el
permiso no puede decidir solo.

### Los permisos retirados quedan bloqueados

`leads_*` no los habilita ningún módulo, así que las acciones de `features/crm`
ahora se rechazan incluso para el super administrador, que era el único rol que
todavía los conservaba. No hay UI que las invoque desde la V3.7.

### El error de dominio no se envuelve

`setModuleActivation` valida fuera de `withDatabaseError`. Si el rechazo se
convirtiera en `DatabaseError`, la pantalla de la Tarea 5 perdería el motivo y no
podría decir qué dependencia falta.

## Validación

- `pnpm typecheck`: sin errores.
- `npx eslint src scripts --max-warnings=0`: sin errores.
- Pruebas unitarias: 430 en total, 425 aprobadas. Se agregaron 20: seis del gate
  en acciones auditadas (rechazo sin ejecutar, auditoría como `module.disabled`,
  distinción con el rechazo por permiso, super administrador sin excepción,
  módulo fijado, permisos retirados) y cuatro de la verificación estática.
- Verificación real contra la base de desarrollo con `pnpm modules:set`:
  activar Compras sin Inventario, apagar Inventario con Compras activa, apagar
  sin motivo y apagar el núcleo se rechazan con el mensaje correcto; encender en
  orden funciona y deja los once eventos en el historial.
- La base de desarrollo quedó con los once módulos activos, para que el entorno
  se comporte igual que antes de este cambio.

### Fallos previos que no son de esta tarea

Cinco pruebas ya fallaban en `HEAD` y siguen fallando. Lo verifiqué corriendo la
suite sobre el árbol sin mis cambios:

- `src/features/clinical-care/schemas/paid-study.schema.test.ts` (2): el esquema
  pide `total` y la prueba no lo envía.
- `scripts/audit-coverage.test.ts`: `validateAttributionEvidenceCodeAction` no
  pasa por el servicio de auditoría.
- `scripts/privacy-controls.test.ts`: una redirección con datos en la URL.
- `scripts/security-boundaries.test.ts`: el mapa de acciones quedó desactualizado
  (102 actuales contra 92 documentadas).

Es deuda acumulada del modo de ejecución vigente desde el 2026-08-02. Hay que
saldarla antes del cierre acumulado de la Tarea 11; no la toqué acá para no
mezclar dos cosas en el mismo cambio.

## Pendientes

- QA de navegador con un módulo apagado, en móvil y escritorio: cierre acumulado
  (Tarea 12).
- Pruebas de integración escritas y no ejecutadas, ahora también con los casos de
  `setModuleActivation`.
- La navegación todavía muestra enlaces a módulos apagados: es la Tarea 4. Hoy
  esos enlaces llevan al inicio con el aviso, así que no hay acceso indebido,
  pero sí una pantalla que no debería ofrecerse.
- **Riesgo de despliegue:** la migración de la Tarea 2 debe aplicarse antes de
  publicar este código. Sin la tabla `ModuleActivation`, toda página protegida
  falla.

## Documentación

- [Desarrollo local](../../operations/local-development.md): sección nueva sobre
  módulos activos y `pnpm modules:set`.
