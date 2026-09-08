# Sucursal Explícita En Escrituras Operativas

Fecha: 2026-09-08.

## Problema

Siete columnas operativas tenían `@default("el-alto")`. Si una escritura no
enviaba `branchCode`, Prisma o PostgreSQL podían guardar el registro en El Alto
sin advertir el error. Ventas y movimientos de inventario también conservaban
un fallback equivalente en el código de aplicación.

## Cambios Implementados

- `Visit`, `Sale`, `Payment`, `CashMovement`, `PurchasePayment`,
  `InventoryMovement` e `InventoryAdjustment` exigen `branchCode`.
- La migración elimina los siete defaults en PostgreSQL sin cambiar los datos
  existentes.
- Crear ventas simples, ventas con varias líneas y ventas desde pedidos médicos
  requiere la sucursal activa y comprueba que coincida con la visita.
- Los movimientos y ajustes de inventario requieren sucursal. Una aplicación
  de Enfermería que descuenta un producto obtiene la sede de su visita y falla
  si no tiene visita.
- Los estudios pagados copian explícitamente la sede de la visita; los pagos de
  compras urgentes copian la sede de la compra.
- Los scripts de staging, datos demo y simulacro de backup, además de sus
  fixtures tipados, declaran expresamente su sucursal.

## Migración

`20260908120000_require_explicit_branch_code` ejecuta únicamente `DROP DEFAULT`
sobre columnas que ya son obligatorias. No rellena, reasigna ni elimina filas.
Queda preparada para el flujo de despliegue y no fue aplicada a staging ni
producción en esta tarea.

## Validación

- `pnpm lint`: aprobado.
- `pnpm typecheck`: aprobado.
- La regeneración del cliente Prisma confirmó que las creaciones incompletas ya
  son errores de tipos.
- Por la política vigente, no se ejecutaron pruebas, build ni QA de navegador;
  quedan para el cierre acumulado.

## Alcance Pendiente

Este cambio cierra las escrituras que podían caer silenciosamente en El Alto.
Todavía existen funciones de lectura con valores opcionales o defaults de sede;
deben tratarse en la siguiente etapa del aislamiento estricto.

**Commit sugerido:** `fix(sigeco): exigir sucursal en escrituras operativas`
