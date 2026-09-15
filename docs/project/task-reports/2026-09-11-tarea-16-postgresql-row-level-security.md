# Tarea 16 — PostgreSQL Row-Level Security

Fecha: 2026-09-11  
Estado: implementada y validada en PostgreSQL local y Neon staging durante la
Tarea 17; credenciales permanentes de runtime pendientes de provisionar.

## Resultado

PostgreSQL cuenta ahora con una segunda barrera preparada para impedir que un
defecto de filtros en la aplicación exponga o modifique operaciones de otra
sucursal. La migración `20260911210000_postgres_row_level_security`:

- crea `sigeco_web` sin ownership, `BYPASSRLS`, creación de schema,
  administración de roles ni `TRUNCATE`;
- crea `sigeco_maintenance` como rol técnico propietario. En PostgreSQL donde
  el ejecutor puede conceder `BYPASSRLS`, fuerza RLS también al propietario; en
  servicios administrados como Neon, donde esa capacidad está prohibida, usa
  `ENABLE` sin `FORCE` y el propietario conserva el bypass implícito reservado
  al mantenimiento;
- no establece contraseñas: los secretos se provisionan y rotan fuera del
  repositorio;
- activa RLS en las 86 tablas de operación, los dos modelos de acceso
  transversal controlado y la auditoría híbrida; `FORCE` se aplica cuando el
  rol técnico dispone de `BYPASSRLS`;
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
- haya ownership técnico y `ENABLE/FORCE ROW LEVEL SECURITY`, con la variante
  administrada explícita que mantiene al rol web bajo políticas;
- los 89 modelos no globales aparezcan en la migración;
- los seis parámetros se configuren de forma local a la transacción.

## Validación acumulada de la Tarea 17

- La migración se aplicó desde cero en PostgreSQL local y sobre Neon staging.
- La integración aprobó 121/121 casos, incluidos aislamiento sin filtro Prisma,
  escritura cruzada, continuidad médica/Enfermería y reutilización del pool.
- En staging, `sigeco_web` devolvió cero filas sin contexto, cuatro visitas
  exclusivamente de El Alto con esa sede activa, cero en Cochabamba y rechazó
  un `UPDATE` cruzado con SQLSTATE `42501`.
- Los 127 controles SQL quedaron en cero antes y después del ensayo operativo.
- `sigeco_web` y `sigeco_maintenance` quedaron sin superusuario, creación de
  base, creación de roles, herencia ni bypass. Neon conserva el bypass solo en
  su cuenta propietaria, que no debe utilizarse como `DATABASE_URL` de la
  aplicación.
- Falta provisionar fuera del repositorio una contraseña permanente para
  `sigeco_web`, separar `MAINTENANCE_DATABASE_URL` y sustituir la URL propietaria
  de staging antes de desplegar el runtime.
