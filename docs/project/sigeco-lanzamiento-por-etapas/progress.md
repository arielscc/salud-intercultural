# Progress — Lanzamiento Por Etapas De SIGECO

Última actualización: 2026-08-24.

Plan de ejecución: [tasks.md](./tasks.md)

## Estado General

Plan creado el 2026-08-24. Ninguna tarea iniciada.

SIGECO tiene implementación local de todos los módulos operativos, pero no
tiene forma de exponer solo una parte al personal. Este plan agrega la
activación controlada de módulos desde el super administrador, completa lo que
falta para que Administración y Caja funcionen sin la ruta clínica, y cierra los
pendientes de plataforma que hoy bloquean cualquier salida a producción.

La Etapa 1 lanza `administracion`, `inventario`, `compras` y `catalogo`. Las
etapas siguientes encienden Recepción, Consulta, Enfermería y, por último,
seguimiento, opiniones y reportes.

Este plan **no reemplaza** a [mejoras integrales](../sigeco-mejoras-integrales/tasks.md)
ni al [dashboard del médico](../sigeco-medico-dashboard/tasks.md): toma de ellos
los pendientes que bloquean el lanzamiento (CI, staging, backup, gate de
seguridad) y los ordena como camino a producción. El estado de aquellas tareas
se sigue llevando en sus propios archivos.

## Resumen

| Estado | Cantidad |
| --- | ---: |
| Pendiente | 20 |
| En progreso | 0 |
| Bloqueada | 0 |
| Terminada | 0 |
| Descartada | 0 |

## Progreso Por Fase

| Fase | Tareas | Estado | Gate |
| --- | --- | --- | --- |
| A. Activación controlada de módulos | 1-6 | Pendiente | Un módulo apagado es inalcanzable y auditable |
| B. Etapa 1: Caja y Administración | 7-10 | Pendiente | Se vende y cobra sin ruta clínica |
| C. Plataforma y salida a producción | 11-16 | Pendiente | Producción autorizada y Etapa 1 encendida |
| D. Etapas siguientes | 17-20 | Pendiente | Cada módulo se enciende con QA y capacitación |

## Estado Por Tarea

| # | Tarea | Prioridad | Estado | Dependencias |
| --- | --- | --- | --- | --- |
| 1 | Catálogo de módulos y mapa de permisos | P0 | Pendiente | Ninguna |
| 2 | Estado de activación y su historial | P0 | Pendiente | 1 |
| 3 | Gate de módulos en servidor | P0 | Pendiente | 1-2 |
| 4 | Navegación e inicio según módulos activos | P0 | Pendiente | 3 |
| 5 | Pantalla de activación del super administrador | P0 | Pendiente | 3-4 |
| 6 | Modo solo lectura del módulo apagado | P1 | Pendiente | 5 |
| 7 | Alta mínima de cliente desde Administración | P0 | Pendiente | 4 |
| 8 | Venta directa sin visita | P0 | Pendiente | 7 |
| 9 | Listado y búsqueda de ventas | P1 | Pendiente | 8 |
| 10 | Datos maestros reales de la Etapa 1 | P0 | Pendiente | 8-9 |
| 11 | CI remoto y protección de ramas | P0 | Pendiente | Fases A y B |
| 12 | Staging aislado y ensayo de la Etapa 1 | P0 | Pendiente | 11 |
| 13 | Backup y restauración probados en remoto | P0 | Pendiente | 12 |
| 14 | Cierre del gate de seguridad | P0 | Pendiente | 13 |
| 15 | Despliegue y activación de la Etapa 1 | P0 | Pendiente | 14 |
| 16 | Documentación al día | P1 | Pendiente | 15 |
| 17 | Lanzamiento de Recepción | P1 | Pendiente | 15 |
| 18 | Lanzamiento de Consulta | P1 | Pendiente | 17 |
| 19 | Lanzamiento de Enfermería | P1 | Pendiente | 18 |
| 20 | Lanzamiento de seguimiento, opiniones y reportes | P2 | Pendiente | 19 |

## Decisiones Vigentes

- **Activación global**, no por sucursal. La dimensión por sede queda como
  migración aditiva futura si Cochabamba necesita otro ritmo.
- **Un módulo se puede apagar** con motivo obligatorio y auditoría; conserva los
  datos y el trabajo abierto en solo lectura para Dirección.
- **Solo el super administrador** activa o desactiva. Dirección ve estado e
  historial.
- **Dependencias duras:** Consulta requiere Recepción; Enfermería requiere
  Consulta; Compras requiere Inventario.
- **En la Etapa 1 se cobra a un cliente identificado**, dado de alta con un
  formulario mínimo desde Administración, sin abrir visita.
- **El comprobante de la Etapa 1 es el recibo interno vigente.** La facturación
  fiscal no está en alcance.
- **La Etapa 1 sale a producción real**, no a una instalación local.
- El super administrador no evade el gate de módulos: un módulo apagado lo está
  para todos.

## Riesgos Conocidos

- **Orden invertido respecto del recorrido del paciente.** Lo natural sería
  lanzar Recepción antes que Administración. Durante la Etapa 1 el personal
  registrará clientes en un lugar que después deja de ser el habitual; hay que
  decirlo explícitamente en la capacitación.
- **Dinero e inventario reales desde el primer día.** Backup probado (Tarea 13)
  y auditoría activa son condición previa, no mejora posterior.
- **Deuda documental de agosto.** Alrededor de catorce commits sin reporte ni
  actualización de progreso; se salda en la Tarea 16.
- **181 commits de diferencia entre `develop` y `main`.** La promoción de la
  Tarea 15 es grande y debe revisarse con CI verde, no fusionarse a ciegas.
- **Permiso nuevo sin módulo.** Si alguien agrega un `InternalPermission` y no lo
  mapea, quedaría fuera del gate. La prueba de cobertura de la Tarea 1 existe
  para impedirlo.

## Próximo Trabajo

Comenzar por la Tarea 1. Es solo código puro —catálogo de módulos, mapa de
permisos y helpers— sin base de datos ni UI, y es la que define el vocabulario
que usan todas las demás.

## Registro

### 2026-08-24 — Creación Del Plan

- Dirección decidió lanzar por etapas, empezando por Administración y Caja.
- Se confirmaron las decisiones de activación: global, reversible con motivo,
  exclusiva del super administrador y con dependencias duras.
- Se analizó el acoplamiento real en el código: `requirePermission` y
  `runAuditedAction` son los dos únicos puntos de guarda del sistema, lo que
  permite aplicar el gate de módulos sin tocar las 50 páginas ni las 126
  acciones auditadas una por una.
- Se identificaron los tres bloqueos reales de una Etapa 1 sin ruta clínica:
  `Sale.patientId` y `Payment.patientId` obligatorios, el alta de pacientes
  disponible solo en el funnel de Recepción, y la bandeja de Administración
  alimentada únicamente por `VisitWorkItem`.
- Se definieron 20 tareas en cuatro fases.
