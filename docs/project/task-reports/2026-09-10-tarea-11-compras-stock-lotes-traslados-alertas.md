# Tarea 11 — Compras, stock, lotes, traslados y alertas

Fecha: 2026-09-10  
Estado: implementada; migración y reconciliación preparadas, no ejecutadas.

## Resultado

Toda compra y su evidencia operativa quedan sujetas a la sucursal activa:

- `Purchase`, sus líneas, pagos, recepciones, líneas recibidas, documentos,
  lotes, ajustes y movimientos incorporan relaciones compuestas con la sede.
- Las acciones vuelven a obtener la sucursal desde el contexto autenticado y
  rechazan IDs, usuarios, productos, proveedores, sesiones de Caja, compras o
  recepciones pertenecientes a otra sede.
- Las consultas de compras, lotes, traslados y FEFO requieren siempre un
  `branchCode`; se retiraron las lecturas opcionales y el fallback a El Alto.
- Los reintentos idempotentes también comparan la sucursal antes de devolver un
  resultado previo.

`InventoryItem.currentStock` fue eliminado. El único saldo materializado es
`BranchInventoryBalance`, vinculado a la configuración local del producto y
reconciliado con la suma append-only de `InventoryMovement` de la misma sede.
Las alertas de stock ahora incluyen sucursal, se abren o resuelven usando el
saldo y mínimo locales, y los resúmenes ya no cuentan alertas de otras sedes.

## Traslados y lotes

Un traslado se confirma como una operación atómica con dos comprobantes:

- salida negativa en la sede de origen;
- entrada positiva por la misma cantidad en la sede de destino;
- saldos posteriores verificados antes de crear el comprobante corporativo;
- asignaciones de lote con sucursal de origen y destino y claves compuestas.

El producto debe estar disponible en ambas sedes, ambas sucursales deben estar
activas y quien registra debe ser superadministrador o estar asignado a las dos.
Los lotes físicos del destino conservan proveedor global, partida, vencimiento,
costo y ubicación, pero no apuntan a la compra local del origen. La trazabilidad
entre ambos lotes vive en la asignación inmutable del traslado.

La pantalla muestra a cada sede su movimiento local. Dirección y
superadministración, mediante el permiso de auditoría, pueden contrastar la
salida y la entrada completas.

## Migraciones y reconciliación

- `20260911120000_inventory_ledger_branch_scope` materializa las nuevas claves
  de sucursal desde padres inequívocos, crea saldos locales faltantes y deja
  pendientes las alertas históricas ambiguas.
- `20260911130000_harden_inventory_ledger_branch_scope` bloquea filas sin sede,
  cruces y saldos inconsistentes; retira la columna global y agrega constraints
  diferidos para el libro y los dos movimientos de cada traslado.
- `pnpm branch:reconcile:inventory` es dry-run por defecto. Puede emitir una
  plantilla por IDs técnicos; el modo `--apply` exige confirmación expresa,
  atribuye todas las alertas pendientes y reconstruye solo el saldo
  materializado desde el libro. Nunca reescribe movimientos.

No se ejecutó ninguna migración, reconciliación ni escritura sobre datos reales.
Los registros indeterminados, traslados inconsistentes o libros negativos
bloquean el endurecimiento y requieren revisión humana.

## Cobertura de aceptación preparada

- El saldo y las alertas de El Alto cambian sin modificar Cochabamba.
- Las pruebas de compras consultan el saldo local y exigen sucursal en
  confirmaciones, pagos y ajustes de lote.
- Un pago de compra rechaza una sesión de Caja de otra sucursal.
- Los traslados contrastan saldos locales y conservan ambos movimientos sin
  depender de un total global.
- El detector ya no admite la deuda temporal de los modelos ni las lecturas de
  inventario asignadas a esta tarea.

Por política del proyecto no se ejecutaron suites de integración; se ejecutarán
en la validación acumulada de la Tarea 17.

## Validación

- `pnpm typecheck` ✅
- `pnpm lint` ✅
- Detector: 112 modelos clasificados; 23 global-master, 86 branch-operation,
  2 controlled-cross-branch-read y 1 platform-event. Deuda temporal restante:
  17 modelos y 7 hallazgos de código, todos asignados a tareas posteriores.
