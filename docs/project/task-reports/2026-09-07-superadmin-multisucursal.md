# Super Administradores Multi-Sucursal

Fecha: 2026-09-07.

## Problema

El rol `super_admin` podía consultar el consolidado de todas las sedes, pero el
selector operativo todavía exigía una asignación manual. Además, el mismo
correo de prueba existía en las bases locales normal y piloto con sucursales
predeterminadas diferentes, lo que hacía parecer que la cuenta había cambiado
de sede.

## Resultado

- Una cuenta `super_admin` considera asignadas automáticamente todas las sedes
  con estado `active` o `preparation`.
- El selector continúa mostrando solamente sedes activas; una sede en
  preparación no acepta operaciones.
- Crear o promover una cuenta a `super_admin` persiste todas las asignaciones
  configurables. Los seeds y el script de cambio de rol aplican la misma regla.
- La edición manual de sucursales no puede retirar una sede configurable a un
  super administrador.
- El personal de Caja incluye al super administrador aun si una asignación
  histórica todavía no fue materializada.
- La migración `20260907223000_super_admin_all_branches` completa las cuentas
  existentes.

## Corrección Local

- En la base normal se activó Cochabamba.
- Todos los superadministradores quedaron asignados a El Alto y Cochabamba.
- `test@test.si` conserva El Alto como sucursal predeterminada.
- La consulta real del selector devolvió `el-alto` y `cochabamba`, ambas
  seleccionables, y cero superadministradores con asignaciones incompletas.
- La base piloto también recibió las asignaciones, sin abrir El Alto ni mezclar
  sus datos con la base normal.

## Límite Conservado

El entorno piloto usa otra base de datos. Un selector cambia de sucursal dentro
de una base, pero nunca combina información entre la base normal y la piloto.

## Validación

- `pnpm lint`: aprobado.
- `pnpm typecheck`: aprobado.
- Consulta real del selector para `test@test.si`: `el-alto` y `cochabamba`.
- Superadministradores con alguna de esas asignaciones ausente: cero.
