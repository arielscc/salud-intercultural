# Tarea 16 — PostgreSQL Row-Level Security

Fecha: 2026-09-11  
Estado: implementada; migración y pruebas sobre PostgreSQL real pendientes de
la Tarea 17.

## Resultado

PostgreSQL cuenta ahora con una segunda barrera preparada para impedir que un
defecto de filtros en la aplicación exponga o modifique operaciones de otra
sucursal. La migración `20260911210000_postgres_row_level_security`:

- crea `sigeco_web` sin ownership, `BYPASSRLS`, creación de schema,
  administración de roles ni `TRUNCATE`;
- crea `sigeco_maintenance` como rol técnico propietario y con bypass reservado
  a migraciones, reconciliaciones, copias y mantenimiento controlado;
- no establece contraseñas: los secretos se provisionan y rotan fuera del
  repositorio;
- activa y fuerza RLS en las 86 tablas de operación, los dos modelos de acceso
  transversal controlado y la auditoría híbrida;
- conserva como globales los 23 maestros definidos en el contrato —identidad,
  sedes, pacientes, proveedores y catálogos—, sin convertirlos artificialmente
  en datos de una sucursal. Sus permisos funcionales continúan en las guardas
  de identidad, rol y auditoría de la aplicación.

Las políticas locales validan sede, usuario, rol operativo y membresía activa.
El modo `consult` permite leer la sede seleccionada pero `WITH CHECK` bloquea
`INSERT`, `UPDATE` y `DELETE`. Super administración y Dirección usan la misma
sede activa que los demás roles y no reciben bypass.

## Contexto Prisma y pool

`src/modules/database/client.ts` intercepta cada unidad de trabajo Prisma. Si
existe contexto autenticado, abre o reutiliza una transacción interactiva y
establece con `set_config(..., true)`:

- `app.branch_code`;
- `app.user_id`;
- `app.effective_role`;
- `app.access_mode`;
- `app.continuity_access_id`;
- `app.platform_audit_write`.

El tercer argumento `true` vuelve cada valor local a la transacción. Al commit
o rollback desaparece y una conexión reutilizada por el pool no conserva la
sucursal anterior. Las transacciones anidadas reutilizan el mismo cliente y
las transacciones Prisma por arreglo quedaron prohibidas para evitar consultas
fuera del contexto.

La resolución autenticada de sucursal activa el contexto en el flujo que
consume `BranchRequestContext`. Si una ruta olvida resolver ese contexto, la
cuenta web llega a PostgreSQL sin variables y RLS no devuelve filas
operativas ni acepta escrituras.

## Continuidad clínica

La lectura remota requiere un acceso temporal exacto para el paciente, usuario
y sede solicitante, una membresía clínica activa, consentimiento de continuidad
vigente, motivo registrado, sede de origen incluida y fecha de expiración
futura. El acceso médico alcanza el historial clínico autorizado; Enfermería
solo obtiene sus antecedentes, órdenes dirigidas a su área y adjuntos derivados
de esos estudios. Las políticas remotas son exclusivamente `SELECT`.

El identificador temporal se instala únicamente alrededor de la consulta que
lo necesita y el contexto previo se restaura al terminar. Los grants de
adjuntos siguen siendo de un uso, revalidan rol/sede/usuario y solo hacen
visible el archivo mientras el grant no haya vencido ni sido consumido.

## Procesos técnicos

La sincronización de campañas ya no escribe asignaciones de varias sucursales
en una sola transacción: enumera las sedes configuradas y ejecuta cada
asignación con su contexto explícito. La exportación técnica de métricas hace lo
mismo para una única sede y registra auditoría.

`MAINTENANCE_DATABASE_URL` queda reservado para Prisma CLI y herramientas
técnicas. El wrapper `scripts/run-with-maintenance-database.ts` lo instala antes
de ejecutar seeds, reconciliaciones, verificaciones o mantenimiento. Solo en
local existe compatibilidad temporal con `DATABASE_URL`; staging y producción
fallan si falta la credencial separada. Backups y simulacros prefieren también
la conexión técnica o su URL específica.

## Detector

`pnpm branch:tenancy:check`, incluido en `pnpm typecheck`, comprueba que:

- existan los dos roles con capacidades opuestas;
- la cuenta web no pueda asumir el rol técnico;
- haya ownership técnico y `ENABLE/FORCE ROW LEVEL SECURITY`;
- los 89 modelos no globales aparezcan en la migración;
- los seis parámetros se configuren de forma local a la transacción.

## Validación

- `pnpm lint` ✅
- `pnpm typecheck` ✅
- Detector: 112 modelos clasificados, 0 excepciones de modelo y 0 excepciones
  de código.
- Node local: advertencia por versión 24; el proyecto declara Node 22.

Por las reglas del repositorio no se aplicó la migración, no se ejecutaron
pruebas de integración ni se conectó una base durante esta tarea. La Tarea 17
debe provisionar contraseñas fuera del repositorio, aplicar todas las
migraciones sobre una restauración aislada y staging, y demostrar la matriz
negativa, el vencimiento de accesos y la ausencia de fuga al reutilizar el pool.
