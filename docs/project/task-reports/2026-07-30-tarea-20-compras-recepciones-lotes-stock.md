# Tarea 20 — Compras, Recepciones, Lotes Y Stock

Fecha: 2026-07-30. Entorno modificado: desarrollo local.

## Resultado

- Se implementaron compras en borrador, confirmadas, recibidas parcialmente,
  recibidas y anuladas.
- Cada línea conserva producto, descripción, unidad, cantidad y costo
  históricos.
- Efectivo, transferencia y otros medios generan una salida de Caja una sola
  vez; crédito espera el pago real.
- Las compras urgentes reutilizan el egreso registrado en Caja.
- Las recepciones parciales crean lotes y aumentan stock exactamente una vez.
- El kardex enlaza producto, compra, recepción, lote, usuario, sucursal y
  ubicación.
- FEFO usa primero el lote vigente que vence antes y excluye lotes vencidos.
- Daños, mermas, vencimientos, devoluciones y correcciones exigen autorización
  y quedan append-only.
- Los documentos de compra y recepción son privados y verifican integridad.

## Web Y Móvil

- Se agregaron lista, alta, detalle y recepción de compras.
- Se agregó la pantalla de lotes, vencimientos, FEFO y ajustes.
- Los formularios usan búsqueda/selectores rápidos, cantidades numéricas,
  componentes globales de fecha y captura de cámara.
- Los costos, proveedores y enlaces a compras se ocultan cuando el rol no tiene
  el permiso correspondiente.

## Datos Y Seguridad

- Nuevos modelos: `Purchase`, `PurchaseLine`, `PurchasePayment`,
  `PurchaseReceipt`, `PurchaseReceiptLine`, `InventoryLot`,
  `InventoryLotAdjustment` y `PurchaseDocument`.
- Nuevos permisos: `purchases_read`, `purchases_write`,
  `purchase_receipts_write` e `inventory_lot_adjust`.
- Constraints validan moneda, totales, cantidades, costos y recepción máxima.
- Claves únicas evitan duplicar compras, pagos, recepciones y movimientos.
- Triggers impiden borrar evidencia o editar eventos históricos.
- La migración local es
  `20260730192059_purchases_receipts_batches_stock`.

## Validación Ejecutada

- `prisma generate`: aprobado.
- TypeScript: aprobado.
- Pruebas enfocadas de schemas y límites de permisos: 2 archivos, 10 pruebas,
  aprobadas.
- `git diff --check`: aprobado.
- La suite de integración fue ampliada, pero no se ejecutó por el acuerdo de
  realizar integración, build y QA gstack al cierre acumulado.

## Pendientes Antes De Producción

- Ejecutar integración completa, lint, build y QA gstack acumulado.
- Probar cámara, formularios y tablas en teléfonos reales.
- Validar los roles de Administración, Dirección, Médico y Enfermería en
  staging.
- Revisar proveedores, costos, ubicaciones, lotes y fechas reales.
- Aplicar migración, seed o configuración en staging solo durante la promoción
  autorizada.
- Avisar y pedir autorización expresa antes de tocar producción.

## Commit Sugerido

`feat(sigeco): add purchases batches and stock receipts`

