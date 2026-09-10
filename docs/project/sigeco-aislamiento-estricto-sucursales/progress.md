# Progress — Aislamiento Operativo Y Continuidad Clínica Por Sucursal

Última actualización: 2026-09-10.

Plan: [tasks.md](./tasks.md)

## Estado General

Plan híbrido dividido en 17 tareas consecutivas. La frontera técnica ya cuenta
con un contrato ejecutable, un detector automático, un contexto autenticado de
sucursal obligatorio y roles operativos resueltos desde cada membresía. La
identidad queda global y solo conserva la capacidad de plataforma del super
administrador. Todavía no se completó la partición general de operaciones ni se
aplicó RLS. La identidad global del paciente y su expediente por sucursal ya
están separados. Leads, campañas, entradas públicas y atribución ya exigen una
sede verificable y sus métricas se calculan localmente. El recorrido completo
de una visita —recepción, estados, ruta, pasos, trabajos, abandonos y tiempos—
ya materializa la sede y usa relaciones compuestas. La migración
`20260908120000_require_explicit_branch_code` queda vigilada por el detector:
elimina siete defaults de El Alto y hace explícitas las principales escrituras
operativas.

## Decisiones Confirmadas Por Dirección

- Todas las sucursales pertenecen a una sola clínica y entidad.
- El paciente conserva una identidad y contacto globales.
- Cada visita e historia clínica pertenece a la sede donde ocurrió.
- Médicos y enfermería pueden consultar antecedentes de otras sedes, en solo
  lectura, auditados y limitados a la información de su rol, porque rotan entre
  sucursales.
- Actualizar el contacto maestro de un paciente o proveedor se refleja para
  toda la clínica.
- Productos y proveedores conservan identidad global; stock, precios,
  condiciones y operaciones son locales.

## Resumen

| Estado | Cantidad |
| --- | ---: |
| Pendiente | 10 |
| En progreso | 0 |
| Bloqueada | 0 |
| Terminada | 7 |

## Progreso Por Fase

| Fase | Tareas | Estado | Resultado esperado |
| --- | --- | --- | --- |
| A. Frontera técnica | 1-4 | Terminada (4/4) | Contrato, contexto, roles y backfill seguro |
| B. Partición de dominios | 5-13 | En progreso (3/9) | Maestros únicos y operaciones pertenecientes a una sede |
| C. Base de datos y cierre | 14-17 | Pendiente | Auditoría local, constraints, RLS y QA acumulado |

## Estado Por Tarea

| # | Tarea | Prioridad | Estado | Dependencias |
| --- | --- | --- | --- | --- |
| 1 | Contrato de tenencia y detector automático | P0 | Terminada | Ninguna |
| 2 | Contexto central de sucursal en servidor | P0 | Terminada | 1 |
| 3 | Roles y permisos por sucursal | P0 | Terminada | 2 |
| 4 | Herramientas de backfill y reconciliación | P0 | Terminada | 1-3 |
| 5 | Identidad global y expediente local del paciente | P0 | Terminada | 4 |
| 6 | Leads, campañas y entradas públicas | P0 | Terminada | 2, 4-5 |
| 7 | Visitas, recepción, rutas y tiempos | P0 | Terminada | 5 |
| 8 | Consulta, recetas, órdenes y catálogos clínicos | P0 | Implementada; validación acumulada pendiente | 7 |
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

- Contrato canónico para los 107 modelos Prisma y chequeo automático de
  modelos, campos, relaciones, defaults y fallbacks de sucursal.
- Deuda heredada registrada con coincidencia exacta, responsable y tarea de
  retiro: 34 excepciones de modelo y 31 hallazgos de código asignados a tareas
  posteriores.
- `BranchRequestContext` resuelve usuario, asignación, sede activa y rol
  operativo exclusivamente desde sesión y membresías activas.
- `InternalUser` conserva la identidad y la capacidad global de plataforma;
  `InternalUserBranch` conserva rol, estado y sede predeterminada.
- Médicos y enfermería pueden mantener el mismo rol clínico activo en varias
  sedes por rotación. Los demás roles operativos conservan una sola sede activa.
- El selector clínico distingue `Trabajar en esta sucursal` de `Solo consultar`:
  la sede predeterminada es la única que admite escrituras y cambiarla no borra
  ninguna asignación ni dato histórico.
- Los superadministradores usan una sola cuenta y reciben todas las sedes
  activas o en preparación; cada request continúa limitado a la sede elegida.
- Caja, compras, seguimiento, opiniones, recordatorios y selección de personal
  validan pertenencia y rol en la sucursal de la operación.
- Páginas, Server Actions, APIs, documentos y jobs tienen fronteras explícitas;
  las acciones con IDs operativos comprueban la pertenencia antes de mutar.
- Una cookie inválida o la falta de sede conduce a selección segura y nunca a
  El Alto ni a la primera sucursal de la consulta.
- Activación de módulos materializada por sucursal.
- Selector de sucursal limitado a asignaciones del usuario.
- Superadministradores asignados a las sucursales existentes.
- Dashboard y varios flujos operativos ya filtran la sede activa.
- Migración preparada para retirar defaults de El Alto en siete tablas.
- Reconciliador determinista con `dry-run`, decisiones manuales por ID técnico,
  checksums antes/después y bloqueo explícito de `SET NOT NULL` ante pendientes.
- Primer adaptador para los accesos históricos de usuarios, compatible con el
  esquema anterior y posterior a la migración de roles por sucursal.
- `Patient` conserva una identidad corporativa única y versionada;
  `PatientBranchRecord` contiene estado, ficha y datos clínicos locales.
- Recepción dispone de coincidencia global exacta y crea la relación local sin
  duplicar; listas, fichas aproximadas y acceso de Administración quedan
  limitados a la sede activa.
- Visitas conservan una fotografía inmutable del nombre, documento, teléfono y
  dirección; los consentimientos de contacto y las notas tienen sucursal.
- El reconciliador de pacientes separa la migración estructural del
  endurecimiento para que ninguna ambigüedad clínica se resuelva por defecto.
- El formulario público resuelve la sede antes de persistir PII mediante una
  prueba firmada, hostname o configuración fija de servidor; un campo editable
  del navegador nunca decide ownership.
- Las campañas corporativas tienen asignaciones explícitas y sus leads,
  atribuciones, dashboards, deduplicación, idempotencia y exportaciones quedan
  limitados a una sede.
- Los reconciliadores de leads Prisma y Payload reportan únicamente IDs
  técnicos y el endurecimiento bloquea cualquier fila histórica pendiente.
- Visitas, check-ins, estados, rutas, pasos, trabajos, abandonos y eventos de
  tiempo exigen la sede y quedan unidos mediante claves compuestas.
- Las bandejas, detalles, derivaciones, reportes y el dashboard de recepción
  reciben una sucursal obligatoria; una ruta activa de Cochabamba no aparece en
  los conteos de El Alto.

Estos avances no equivalen a aislamiento completo y no permiten adelantar la
Tarea 16.

### Tarea 8 — Implementación

- Consultas, versiones, diagnósticos, planes, resultados, recetas, ítems,
  evoluciones, notas y órdenes exigen sucursal y relaciones compuestas.
- Los catálogos clínicos conservan definiciones globales, con activación y
  frecuencia de uso locales. Las semillas requieren `--branch=<codigo>`.
- El perfil profesional se configura por usuario y sede; la receta usa el
  perfil de la sucursal de atención.
- La historia transversal se solicita desde un paciente/visita, solo por un
  médico asignado, con motivo y consentimiento de continuidad. El acceso
  registrado dura 15 minutos; se revalidan rol, asignación y consentimiento.
  Las visitas muestran su origen en modo de solo lectura. Las precargas para
  editar conservan exclusivamente la sede activa.
- Migraciones de expansión y endurecimiento preparadas, sin aplicar a una base.
  Los perfiles con varias sedes requieren atribución explícita antes de endurecer.
- Detalle y operación: [reporte T8](../task-reports/2026-09-10-tarea-8-consulta-recetas-ordenes-catalogos.md).

## Próximo Paso

Ejecutar la Tarea 9: Enfermería, estudios, adjuntos y sesiones, incluida su
continuidad limitada. La integración y el despliegue se validan en la Tarea 17.
