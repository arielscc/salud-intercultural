# Tarea 3: Roles Y Permisos Por Sucursal

## Fecha

2026-09-09.

## Objetivo

Conservar una sola identidad por persona y resolver su rol operativo desde la
asignación de la sucursal activa, permitiendo la rotación de médicos y
enfermería sin abrir acceso multisucursal a los demás roles.

## Cambios Implementados

- `InternalUser` dejó de almacenar el rol operativo. Ahora conserva únicamente
  `platformRole`, una capacidad global nullable cuyo único valor permitido es
  `super_admin`.
- `InternalUserBranch` almacena `role`, `active`, `isDefault` y fecha de
  actualización. La membresía puede desactivarse sin borrarse, preservando
  trazabilidad y las asignaciones de las demás sedes.
- Varias sucursales activas se permiten únicamente cuando todas las membresías
  tienen el mismo rol `medico` o `enfermeria`. Administración, Recepción y los
  demás roles operativos quedan limitados a una sede activa.
- El contexto central proyecta sobre el usuario el rol de la sucursal elegida.
  La navegación, los permisos, los módulos y las Server Actions continúan
  usando una interfaz común, pero ya no dependen de un rol global.
- Una membresía desactivada deja de ser seleccionable inmediatamente. La cookie
  no puede reactivarla y la sesión puede seguir utilizándose en otra sede donde
  la cuenta mantenga una membresía activa.
- Los superadministradores reciben todas las sucursales activas o en
  preparación con rol `super_admin`. Solo las sedes activas son seleccionables
  para operar y todas las consultas siguen usando la sucursal activa.
- La administración de usuarios separa la capacidad global de los roles por
  sede. Permite configurar rol y estado en cada sucursal y elegir una
  predeterminada activa.
- La auditoría registra creación de acceso, activaciones, desactivaciones,
  cambios de rol, cambio de sede predeterminada y promociones o retiros de la
  capacidad global. El rol guardado en cada evento es el de la sede activa.
- Caja y compras validan que responsables, beneficiarios, receptores y
  autorizadores pertenezcan a la sucursal de la operación. Seguimientos,
  opiniones, recordatorios, propuestas y asignaciones de personal aplican la
  misma regla.
- Los seeds, el ensayo de Etapa 1, readiness, staging, backup y simulacro de
  incidentes crean o consultan roles mediante membresías. El comando
  `internal:set-role` exige sucursal para roles operativos y deja activa
  únicamente la sede indicada; las rotaciones se configuran explícitamente.
- Las pruebas de integración dejaron de crear identidades con un rol global y
  ahora declaran su membresía. Se añadieron casos para rotación de Enfermería,
  membresía desactivada y rechazo de múltiples sedes para Administración.

## Migración

La migración `20260909120000_scope_operational_roles_by_branch`:

1. agrega la capacidad global y los campos de membresía;
2. copia el rol anterior a todas las membresías existentes;
3. convierte las cuentas `super_admin` a capacidad de plataforma;
4. detiene cuentas históricas no clínicas con varias sedes para que no conserven
   acceso cruzado accidental;
5. materializa para los superadministradores todas las sucursales activas o en preparación sin
   seleccionar un contexto operativo transversal;
6. se detiene con `BRANCH_ROLE_BACKFILL_REQUIRES_MEMBERSHIP` si encuentra una
   identidad sin membresía, en vez de inventarle una sucursal;
7. hace obligatorio el rol de membresía y elimina `InternalUser.role`.

La migración no reasigna datos operativos ni concede una sede implícita. Si el
guard detecta una identidad huérfana, debe reconciliarse de forma explícita en
la Tarea 4 antes de aplicar la migración.

## Criterios De Aceptación

- Una enfermera o un médico puede usar la misma cuenta y el mismo rol en El
  Alto y Cochabamba durante una rotación.
- Administración y Recepción no pueden mantener dos sucursales activas.
- Un superadministrador usa una sola cuenta para cambiar entre sedes y las
  consultas operativas conservan el `branchCode` autenticado de esa selección.
- Desactivar Cochabamba vuelve esa sede no seleccionable sin modificar la
  membresía activa de El Alto.

## Archivos Principales

- `prisma/schema.prisma`
- `prisma/migrations/20260909120000_scope_operational_roles_by_branch/migration.sql`
- `src/features/branches/context.ts`
- `src/features/branches/policy.ts`
- `src/features/internal-auth/permissions.ts`
- `src/features/internal-auth/user-management-actions.ts`
- `src/modules/database/queries/branches.ts`
- `src/modules/database/queries/internal-users.ts`
- `src/modules/audit/service.ts`
- `src/app/(internal)/sigeco/(app)/usuarios/[userId]/page.tsx`

## Validación

- `pnpm lint`: aprobado.
- `pnpm typecheck`: aprobado. Incluyó generación Prisma/Payload/Next,
  TypeScript y detector de tenencia.
- El detector aprobó los 100 modelos: 20 maestros globales, 78 operaciones por
  sucursal, un evento de plataforma y una lectura transversal controlada.
- La deuda temporal de código bajó de 42 a 41 al hacer obligatorio el
  `branchCode` en la selección de personal de Caja.
- Se escribieron pruebas para los criterios anteriores. No se ejecutaron
  pruebas, build, migración real ni QA de navegador, conforme a la política de
  validación por tarea; se reservan para la Tarea 17.
- El entorno mostró una advertencia porque usa Node `v24.19.0` y el proyecto
  declara Node 22; no afectó las verificaciones.

## Pendientes

- La Tarea 4 debe reconciliar cualquier identidad histórica sin membresía antes
  de aplicar esta migración en una base existente.
- Las Tareas 5–14 deben completar la propiedad local de los dominios; los roles
  por sucursal no sustituyen el filtrado de datos, constraints ni RLS.
- La Tarea 9 implementará para Enfermería la consulta histórica transversal
  limitada a antecedentes de enfermería y órdenes necesarias; no habilitará
  diagnósticos ni escritura remota.
- La Tarea 17 ejecutará integración, build, migraciones reales y QA acumulado.

**Commit sugerido:** `feat(sigeco): scope operational roles by branch`
