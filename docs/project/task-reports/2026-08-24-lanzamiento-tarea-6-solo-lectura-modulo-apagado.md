# Tarea 6: modo solo lectura del módulo apagado

## Fecha

2026-08-24

## Objetivo

Que apagar un módulo no esconda el trabajo a medias. Hasta ahora un módulo
apagado desaparecía por completo: si Caja se suspendía con ventas a medio cobrar,
esas ventas dejaban de verse justo cuando había que decidir qué hacer con ellas.

Plan: [Lanzamiento por etapas](../sigeco-lanzamiento-por-etapas/tasks.md).

## Cambios Implementados

### Lectura y escritura dejaron de ser lo mismo

`src/features/modules/permission-access.ts` clasifica los 66 permisos como
`read` o `write`. La clasificación se declara, no se deduce del nombre:
`reminders_review` aprueba un contacto y `patient_duplicates_review` registra una
decisión; ninguno es lectura aunque no diga `write`. Una prueba de cobertura
falla si aparece un permiso sin clasificar.

### Suspendido no es lo mismo que sin lanzar

`getModuleAccessState()` devuelve en una sola consulta los módulos activos y los
**suspendidos**: los que estuvieron lanzados y se apagaron, identificados por
`deactivatedAt`. Un módulo que nunca se encendió sigue cerrado para todos,
porque no tiene trabajo abierto que consultar.

`resolveModuleAccess(rol, estado, permiso, módulo?)` devuelve `allowed`,
`read_only` o `blocked`. `read_only` solo aparece con un permiso de lectura, un
módulo suspendido y un rol de Dirección o super administrador. Nunca con un
permiso de escritura, para nadie.

Es la misma función en las tres capas: `requirePermission`, `runAuditedAction` y
`canUse` en la interfaz.

### La interfaz queda sin controles de escritura

Convertí 44 indicadores de permiso en 26 páginas de `roleHasPermission` a
`canUse`, fijando el módulo donde el permiso lo comparten varias áreas. Con eso,
una pantalla de un módulo suspendido se dibuja completa pero sin sus botones de
guardar, en lugar de ofrecer formularios que el servidor va a rechazar.

Los indicadores de **lectura** se dejaron a propósito con `roleHasPermission`:
si también dependieran del módulo, Dirección entraría a la pantalla y no vería
nada, que es exactamente lo contrario de lo que pide la tarea.

Una prueba nueva recorre las páginas y falla si un permiso de escritura se
decide solo con el rol.

También quedó module-aware `OpenCashSessionCallout`, que ofrecía abrir Caja.
`PatientConsentPanel` no se tocó: está exportado pero ningún archivo lo usa.

### Corrección al mapa de módulos

`visit_discontinuations_read` y `visit_discontinuations_write` estaban asignados
solo a Recepción, pero el Documento de Negocio dice que Recepción, Médico,
Enfermería y Administración pueden registrar "No continuará". Ahora los cuatro
módulos habilitan el permiso, y cada pantalla fija el suyo.

### Vista de pendientes

`getModulePendingWork(codes)` cuenta lo que quedó abierto dentro de cada módulo
suspendido y se muestra en su tarjeta de `/sigeco/modulos`:

| Módulo | Se cuenta |
| --- | --- |
| Recepción | Visitas sin cerrar, tareas abiertas |
| Consulta | Consultas en borrador, pacientes esperando |
| Enfermería | Tareas abiertas, paquetes de sesiones sin terminar |
| Caja y Administración | Ventas con saldo, Cajas sin cerrar, cobros pendientes |
| Inventario | Alertas de stock abiertas |
| Compras | Compras sin recibir por completo |
| Seguimiento | Seguimientos sin resolver, recordatorios por aprobar |
| Opiniones | Casos abiertos |

Solo se consultan los módulos suspendidos que se piden. Catálogo y Reportes no
acumulan pendientes y no aparecen.

### Avisos

El aviso del shell ahora explica que los módulos suspendidos se pueden consultar
en solo lectura, y el menú marca cada uno con una etiqueta "Suspendido". Ambos
solo los ve quien conserva el acceso.

## Decisiones

### El módulo suspendido se lee; el que nunca se lanzó, no

Abrir la lectura de un módulo sin lanzar mostraría pantallas vacías de una etapa
que todavía no existe. La distinción sale del dato que ya guardaba la Tarea 2, no
de una configuración nueva.

### Se ocultan los botones, no la información

Una pantalla en solo lectura sigue mostrando sus datos. Lo que desaparece es la
posibilidad de cambiarlos. Convertir también los indicadores de lectura habría
vaciado la pantalla y perdido el objetivo de la tarea.

### La regla vive en un solo lugar

`resolveModuleAccess` la aplican el servidor y la interfaz. Si estuviera
duplicada, tarde o temprano el menú ofrecería algo que el servidor rechaza, o al
revés.

## Validación

- `pnpm typecheck`: sin errores.
- `npx eslint src scripts --max-warnings=0`: sin errores.
- Pruebas unitarias: 471 en total, 466 aprobadas. Veintinueve nuevas entre la
  clasificación de permisos, la resolución de acceso y las guardas de servidor.
- **Verificación real contra la base de desarrollo:** suspendí Caja con
  `pnpm modules:set` y comprobé el estado resultante:
  - `direccion -> sales_read: read_only | sales_write: blocked`
  - `administracion -> sales_read: blocked | sales_write: blocked`
  - pendientes reales del módulo: 2 ventas con saldo, 1 Caja sin cerrar, 1 cobro
    pendiente.
  - Reactivado después; los once módulos quedaron activos.
- Integración escrita y no ejecutada: apagar y reactivar deja los registros de
  inventario idénticos, el historial conserva el ciclo completo y
  `getModulePendingWork` informa lo que corresponde.

### Fallos previos que no son de esta tarea

Los cinco de siempre: `paid-study.schema` (2), `audit-coverage`,
`privacy-controls` y el mapa de acciones de `security-boundaries`.

## Pendientes

- QA de navegador con un módulo suspendido, entrando con una cuenta de Dirección
  y con una de área, en móvil y escritorio: cierre acumulado (Tarea 12). Es la
  validación que más falta hace acá, porque el modo solo lectura se probó por
  código y por consola, no mirando las pantallas.
- Componentes que reciben `role` y deciden por su cuenta: hoy solo
  `OpenCashSessionCallout` lo hacía y quedó cubierto, pero conviene revisarlo si
  aparecen nuevos.

## Documentación

- [Lanzamiento y suspensión de módulos](../../operations/module-launch-suspension.md):
  procedimiento nuevo, indexado en el README de operaciones.
