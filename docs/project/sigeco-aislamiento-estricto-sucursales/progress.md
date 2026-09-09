# Progress — Aislamiento Operativo Y Continuidad Clínica Por Sucursal

Última actualización: 2026-09-09.

Plan: [tasks.md](./tasks.md)

## Estado General

Plan híbrido dividido en 17 tareas consecutivas. La frontera técnica ya cuenta
con un contrato ejecutable, un detector automático y un contexto autenticado de
sucursal obligatorio en páginas, acciones y APIs internas. Todavía no se inició
la partición general de operaciones ni se aplicó RLS. La migración
`20260908120000_require_explicit_branch_code` queda vigilada por el detector:
elimina siete defaults de El Alto y hace explícitas las principales escrituras
operativas.

## Decisiones Confirmadas Por Dirección

- Todas las sucursales pertenecen a una sola clínica y entidad.
- El paciente conserva una identidad y contacto globales.
- Cada visita e historia clínica pertenece a la sede donde ocurrió.
- Solo los médicos pueden consultar historia de otras sedes, en solo lectura y
  con auditoría, porque rotan entre sucursales.
- Actualizar el contacto maestro de un paciente o proveedor se refleja para
  toda la clínica.
- Productos y proveedores conservan identidad global; stock, precios,
  condiciones y operaciones son locales.

## Resumen

| Estado | Cantidad |
| --- | ---: |
| Pendiente | 15 |
| En progreso | 0 |
| Bloqueada | 0 |
| Terminada | 2 |

## Progreso Por Fase

| Fase | Tareas | Estado | Resultado esperado |
| --- | --- | --- | --- |
| A. Frontera técnica | 1-4 | En curso (2/4) | Contrato, contexto, roles y backfill seguro |
| B. Partición de dominios | 5-13 | Pendiente | Maestros únicos y operaciones pertenecientes a una sede |
| C. Base de datos y cierre | 14-17 | Pendiente | Auditoría local, constraints, RLS y QA acumulado |

## Estado Por Tarea

| # | Tarea | Prioridad | Estado | Dependencias |
| --- | --- | --- | --- | --- |
| 1 | Contrato de tenencia y detector automático | P0 | Terminada | Ninguna |
| 2 | Contexto central de sucursal en servidor | P0 | Terminada | 1 |
| 3 | Roles y permisos por sucursal | P0 | Pendiente | 2 |
| 4 | Herramientas de backfill y reconciliación | P0 | Pendiente | 1-3 |
| 5 | Identidad global y expediente local del paciente | P0 | Pendiente | 4 |
| 6 | Leads, campañas y entradas públicas | P0 | Pendiente | 2, 4-5 |
| 7 | Visitas, recepción, rutas y tiempos | P0 | Pendiente | 5 |
| 8 | Consulta, recetas, órdenes y catálogos clínicos | P0 | Pendiente | 7 |
| 9 | Enfermería, estudios, adjuntos y sesiones | P0 | Pendiente | 7-8 |
| 10 | Maestros comerciales y configuración por sucursal | P0 | Pendiente | 4 |
| 11 | Compras, stock, lotes, traslados y alertas | P0 | Pendiente | 10 |
| 12 | Ventas, pagos, Caja y documentos | P0 | Pendiente | 5, 7, 10-11 |
| 13 | Seguimientos, recordatorios, opiniones y reportes | P0 | Pendiente | 5-12 |
| 14 | Módulos y auditoría operativa | P0 | Pendiente | 2-3, 13 |
| 15 | Barrido completo de aplicación y constraints | P0 | Pendiente | 5-14 |
| 16 | PostgreSQL Row-Level Security | P0 | Pendiente | 15 |
| 17 | Cierre acumulado y despliegue controlado | P0 | Pendiente | 1-16 |

## Preparación Ya Disponible

- Contrato canónico para los 100 modelos Prisma y chequeo automático de
  modelos, campos, relaciones, defaults y fallbacks de sucursal.
- Deuda heredada registrada con coincidencia exacta, responsable y tarea de
  retiro: 63 excepciones de modelo y 42 hallazgos de código.
- `BranchRequestContext` resuelve usuario, asignación, sede activa y rol
  operativo exclusivamente desde sesión y membresías activas.
- Páginas, Server Actions, APIs, documentos y jobs tienen fronteras explícitas;
  las acciones con IDs operativos comprueban la pertenencia antes de mutar.
- Una cookie inválida o la falta de sede conduce a selección segura y nunca a
  El Alto ni a la primera sucursal de la consulta.
- Activación de módulos materializada por sucursal.
- Selector de sucursal limitado a asignaciones del usuario.
- Superadministradores asignados a las sucursales existentes.
- Dashboard y varios flujos operativos ya filtran la sede activa.
- Migración preparada para retirar defaults de El Alto en siete tablas.

Estos avances no equivalen a aislamiento completo y no permiten adelantar la
Tarea 16.

## Próximo Paso

Ejecutar la Tarea 3: almacenar y aplicar el rol operativo de cada usuario por
sucursal, conservando una sola identidad global.
