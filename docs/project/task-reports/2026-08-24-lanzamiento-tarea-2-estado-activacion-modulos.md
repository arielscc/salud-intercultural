# Tarea 2: estado de activación y su historial

## Fecha

2026-08-24

## Objetivo

Persistir qué módulos de SIGECO están encendidos y conservar cada cambio como
historia inalterable. El catálogo, las dependencias y el orden siguen viviendo
en código (Tarea 1); la base guarda únicamente el estado.

Esta tarea todavía **no cambia el comportamiento del sistema**: no hay gate ni
pantalla. Una base ya en uso sigue funcionando igual hasta la Tarea 3.

Plan: [Lanzamiento por etapas](../sigeco-lanzamiento-por-etapas/tasks.md).

## Cambios Implementados

### Modelo

- `enum ModuleActivationStatus` con `active` e `inactive`.
- `ModuleActivation`: `code` como clave primaria, estado, `activatedAt`,
  `activatedById`, `deactivatedAt`, `deactivatedById`, `note` y marcas de
  tiempo. Las referencias a `InternalUser` usan `ON DELETE RESTRICT ON UPDATE
  RESTRICT`, para que borrar una cuenta no borre quién encendió un módulo.
- `ModuleActivationEvent`: módulo, estado anterior, estado nuevo, motivo, actor,
  rol del actor al momento del cambio y fecha. Es el historial append-only.
- Tres relaciones nuevas en `InternalUser`: `activatedModules`,
  `deactivatedModules` y `moduleActivationEvents`.

`actorRole` se guarda como fotografía histórica, igual que en `AuditEvent`: si
mañana el usuario cambia de rol, el evento conserva con qué rol se hizo.

### Migración

`prisma/migrations/20260824210000_module_activation/migration.sql`, aditiva:

- Crea el enum, las dos tablas, sus índices y sus llaves foráneas.
- Instala el trigger `ModuleActivationEvent_prevent_update_delete`, que rechaza
  `UPDATE` y `DELETE` con el mismo patrón que `reject_audit_event_mutation`.
- Siembra las once filas del catálogo: `core` activo, los otros diez apagados.
  Idempotente por código (`ON CONFLICT DO NOTHING`).
- Registra el encendido de `core` como primer evento del historial, sin actor
  porque lo hace la instalación y no una persona.

No toca ninguna tabla existente: no hay `DROP` ni `ALTER TABLE` sobre nada
anterior. Una prueba lo verifica sobre el archivo.

### Lectura

`src/modules/database/queries/modules.ts`:

- `getActiveModules()`: memoizado por request con `cache` de React. El layout,
  el gate de permisos y cada página lo pedirán por separado dentro del mismo
  render y debe costar una sola consulta. Pasa el resultado por
  `normalizeActiveModules`, así que descarta códigos retirados y garantiza el
  núcleo.
- `getModuleActivationStates()`: une el catálogo en código con las filas de la
  base y devuelve los once módulos en orden, con quién los encendió o apagó.
  Es la lectura que consumirá la pantalla de la Tarea 5.
- `getModuleActivationHistory({ code?, limit? })`: historial del cambio más
  reciente al más antiguo, con tope acotado entre 1 y 200.

## Decisiones

### El estado vive en base; el significado, en código

La base no guarda nombres, descripciones ni dependencias. Si guardáramos el
catálogo en base, activar un módulo dependería de datos editables y una fila
mal escrita podría dejar el sistema en un estado que el código no entiende. Con
esta separación, una fila con un código desconocido simplemente se ignora.

### Un módulo sin fila está apagado

`getActiveModules` lee solo las filas activas y `getModuleActivationStates`
resuelve la ausencia como apagado. Un módulo nuevo del catálogo no necesita
migración para existir: nace apagado, y la acción de la Tarea 5 creará su fila
al encenderlo por primera vez.

### El núcleo es activo por definición

`core` se siembra activo, pero además `moduleIsActive` y
`getModuleActivationStates` lo resuelven por la marca `alwaysActive` del
catálogo. Aunque alguien apague su fila a mano en la base, el sistema sigue
siendo usable y el super administrador conserva el acceso para corregir.

### La memoización tiene un límite conocido

`cache` de React memoiza dentro de un request. Una acción que cambia el estado y
vuelve a leer en el mismo request obtendría el valor anterior. Las acciones de
la Tarea 5 revalidan y redirigen, así que el siguiente render lee el estado
nuevo; queda anotado en el código para que no sorprenda.

## Validación

- `npx prisma format` y `npx prisma validate`: esquema válido.
- `npx prisma migrate deploy` sobre `salud_intercultural_dev`: migración
  aplicada. `npx prisma migrate status`: 65 migraciones, base al día y sin
  desvío respecto del esquema.
- Verificación directa en PostgreSQL:
  - Las once filas existen y solo `core` está activo.
  - El evento inicial de `core` está registrado.
  - `UPDATE` sobre `ModuleActivationEvent` falla con
    `ModuleActivationEvent is append-only: UPDATE is not allowed`.
  - `DELETE` falla con el mensaje equivalente.
- `pnpm typecheck`: sin errores.
- `npx eslint src scripts --max-warnings=0`: sin errores.
- Pruebas unitarias: 35 aprobadas, incluida la nueva verificación del archivo de
  migración en `scripts/migration-files.test.ts`.

## Pendientes

- `src/modules/database/queries/modules.integration.test.ts` quedó escrito y no
  ejecutado, según el modo de ejecución vigente: cubre el estado inicial, el
  módulo sin fila, la fila con código retirado y el rechazo de `UPDATE` y
  `DELETE` sobre el historial. Se ejecuta en el cierre acumulado (Tarea 11), y
  su comportamiento ya fue verificado a mano contra la base de desarrollo.
- La migración se probó desde la base de desarrollo. Falta correrla desde una
  base vacía y desde una copia restaurada, que forma parte del cierre acumulado
  y de la Tarea 12.
- Escribir el estado (activar y desactivar) es la Tarea 5. Esta tarea solo lee.

## Documentación

- [Ownership de datos](../../architecture/data-ownership.md): fila nueva de
  activación de módulos.
