# Reporte De Cambios — Tarea 18: Caja, Dinero Al Personal, Gastos Y Cierre

## Fecha

2026-07-30.

## Objetivo

Registrar de forma comprobable el dinero que entra y sale de la clínica,
incluidos los montos entregados al personal y las compras urgentes, y cerrar
cada Caja conciliando efectivo y medios electrónicos.

## Resultado Implementado

- Caja tiene apertura, responsable, sucursal, turno y efectivo inicial.
- Una caja física no admite dos sesiones operables.
- Cada cobro nuevo exige una Caja abierta y queda enlazado a ella.
- El dinero al personal guarda una línea y monto por empleado.
- Las compras urgentes guardan artículo, cantidad, precio, responsables,
  autorización, urgencia, proveedor, comprobante opcional y pendiente de
  inventario.
- Otros egresos exigen receptor, responsable, autorización y motivo.
- Efectivo, QR, tarjeta, transferencia y otros medios se concilian por
  separado.
- Una diferencia mayor al límite pasa a Dirección y bloquea nuevos
  movimientos.
- Devoluciones y reintegros crean movimientos compensatorios; no reemplazan ni
  borran el original.
- Reintentar un egreso con la misma clave no lo duplica.
- El cierre tiene una vista imprimible.
- La interfaz usa teclado numérico, controles táctiles y cámara en móvil.

## Decisiones Técnicas

- `CashSession` representa la jornada de una caja física.
- `CashMovement` conserva el canal, la sesión, la autorización y el movimiento
  corregido.
- `CashExpense` guarda información estructurada y
  `CashExpenseBeneficiary` conserva los montos individuales.
- `CashSessionReconciliation` fotografía lo esperado, lo reportado y la
  diferencia por canal al cerrar.
- Los movimientos usan montos positivos; su tipo define si suman o restan.
- El cierre y cada movimiento bloquean la fila de sesión para evitar carreras.
- PostgreSQL impide movimientos sobre sesiones cerradas y el borrado de la
  evidencia financiera.
- El límite local predeterminado es Bs 20 y puede configurarse en centavos.
- Los comprobantes reutilizan el almacenamiento privado de documentos
  sensibles con un prefijo separado y se verifican por SHA-256 al abrirlos.
- Marcar una compra para inventario no aumenta existencias; la recepción real
  queda para la Tarea 20.

## Base De Datos Y Ambientes

- Migraciones locales: `20260730162455_cash_sessions_expenses_close` y
  `20260730174605_cash_receipt_integrity`.
- Desarrollo local quedó al día con 26 migraciones.
- Staging y producción no fueron modificados.

## Validación Local

- Prisma format, validate, generate y migración local: aprobados.
- Validación de ambiente local y gate de configuración productiva: aprobados.
- TypeScript y lint: aprobados.
- 6 archivos y 51 pruebas enfocadas de cálculo, formularios, permisos y
  almacenamiento privado: aprobados.
- Se agregó cobertura de integración para idempotencia, cierre, bloqueo,
  corrección y aprobación; su ejecución permanece aplazada para el cierre
  acumulado acordado.
- Build, integración completa y QA gstack permanecen aplazados.

## Pendientes Del Cierre Conjunto

- Ejecutar integración acumulada, build y QA web/móvil con gstack.
- Validar Administración y Dirección en staging.
- Aprobar el límite productivo de diferencia.
- Definir qué egresos exigen comprobante y el plazo para adjuntarlo.
- Probar cámara y comprobantes en teléfonos reales.
- Solicitar autorización antes de aplicar la migración en producción.

La implementación local queda **en progreso** hasta completar el QA acumulado y
la validación por roles en staging.

## Commit Sugerido

`feat(sigeco): add expenses and daily cash close`
