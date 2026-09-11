# Tarea 10 — Maestros comerciales y configuración por sucursal

Fecha: 2026-09-10  
Estado: implementada; migración y reconciliación preparadas, no ejecutadas.

## Resultado

Se separó la identidad corporativa de los datos que pueden variar por sede:

- `Supplier` conserva nombre legal, país, contacto general y versiones globales.
- `SupplierBranchProfile` conserva activación, ejecutivo, condiciones, plazos,
  referencias y notas de cada sucursal.
- `InventoryItem` conserva identidad canónica, presentación, fabricante y
  código de barras.
- `BranchInventoryItem` conserva SKU, disponibilidad, precios, descuentos,
  mínimo, ubicación y proveedor preferido de cada sede.
- `PaymentMethod` y `ServiceCatalogItem` conservan definiciones globales;
  `PaymentMethodBranch` y `ServiceCatalogItemBranch` controlan activación y
  configuración efectiva local.

Las lecturas y escrituras principales de Inventario, Compras, Catálogo,
Enfermería, Estudios, Órdenes médicas y cobros ahora reciben la sede activa y
solo consideran configuraciones habilitadas allí. Una compra rechaza proveedores
o productos que no estén activos en su sucursal. Los selectores de cobro también
se construyen desde los métodos habilitados localmente.

La composición de un tratamiento es parte de su definición global. Por eso,
al asignarlo o editar sus componentes, el servidor comprueba que cada producto
componente esté habilitado en todas las sucursales donde ya está configurado el
tratamiento. Una edición local ya no puede dejar inválida silenciosamente otra
sede.

El alta de un producto desde la pantalla de compra admite presentación,
fabricante, código de barras y ubicación. Los productos/proveedores/servicios
existentes pueden asignarse explícitamente a otra sucursal; la identidad global
se conserva y la configuración nueva queda local.

## Migraciones y reconciliación

- `20260910150000_commercial_catalog_branch_scope` crea las tablas locales,
  agrega campos canónicos y atribuye solo por evidencia operacional existente.
  El único seed histórico explícito de medios de pago es El Alto, documentado
  por la migración de sedes; Cochabamba no se habilita por defecto.
- `20260910160000_harden_commercial_catalog_branch_scope` bloquea maestros sin
  ownership, cruces de proveedor preferido y componentes de servicio faltantes.
  También congela los campos globales operativos heredados para impedir que una
  operación futura vuelva a usarlos.
- `pnpm branch:reconcile:commercial` es dry-run por defecto. `--template`
  genera decisiones por IDs técnicos; `--apply` exige todas las decisiones y
  `--confirm=APPLY_COMMERCIAL_CATALOG_RECONCILIATION`.

No se ejecutó ninguna migración, reconciliación ni escritura sobre datos reales.
Si el reconciliador encuentra un maestro sin evidencia, el endurecimiento se
detiene hasta que Dirección indique explícitamente sus sucursales.

## Compatibilidad y límites

Los campos globales históricos de precio/estado y `InventoryItem.currentStock`
se conservan temporalmente para compatibilidad con Tarea 11; el código operativo
ya usa las tablas locales. El historial de identidad continúa siendo global y
el historial de configuración local se conserva mediante revisión y auditoría.
La interfaz identifica expresamente el historial maestro y no presenta sus
campos heredados de precio como si fueran precios vigentes de la sucursal.

## Cobertura de aceptación preparada

- Un escenario multisucursal verifica que el contacto del proveedor y el
  fabricante se compartan, pero condiciones comerciales, SKU, precio, costo y
  stock mínimo permanezcan separados entre El Alto y Cochabamba.
- Compras verifica el rechazo independiente de un proveedor y de un producto
  que no estén habilitados en la sucursal de la compra.
- Las pruebas heredadas de compras y traslados crean ahora las configuraciones
  locales explícitas que exige el nuevo contrato.

Por política del proyecto no se ejecutaron suites de integración en esta tarea;
su ejecución queda para la validación de integración de la Tarea 17.

## Validación

- `pnpm typecheck` ✅
- `pnpm lint` ✅
- Detector: 112 modelos clasificados; 23 global-master, 86 branch-operation,
  2 controlled-cross-branch-read y 1 platform-event.
