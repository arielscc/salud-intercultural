# Tarea 28 — Multi-Sucursal El Alto Y Cochabamba

Fecha: 2026-08-01. Entorno modificado: desarrollo local.

## Resultado

- El Alto queda activa y Cochabamba configurada en estado de preparación.
- El paciente conserva una sola ficha y cada visita identifica su sucursal.
- Usuarios asignables a una o varias sedes, con una sede activa predeterminada.
- Selector global visible en móvil y escritorio, con confirmación al cambiar.
- Recepción, Consulta, Enfermería, Administración, Caja, compras e inventario
  filtran por la sede activa.
- Ventas, pagos, movimientos de Caja, compras y movimientos de stock guardan
  obligatoriamente su sucursal.
- Stock separado mediante saldos por producto y sede.
- Traslados con salida y entrada atómicas, enlazadas y append-only.
- Comparativo y consolidado exclusivo para Dirección y super administrador.
- Datos sintéticos de Cochabamba separados de los resultados reales.

## Migraciones Y Datos Locales

- `20260801185354_multi_branch_el_alto_cochabamba` crea sedes, asignaciones,
  saldos, traslados y completa la sucursal histórica de forma controlada.
- `20260801190000_multi_branch_transfer_append_only` protege los traslados
  contra edición y borrado.
- 38 migraciones locales al día.
- El Alto fue asignada como predeterminada a las cuentas existentes.
- La validación sintética idempotente de Cochabamba fue ejecutada localmente.

## Decisiones De Seguridad

- Cochabamba no se activó y no acepta operaciones reales.
- La cookie de sucursal es `HttpOnly`, `SameSite=Lax` y se valida contra las
  asignaciones del usuario; no se confía en un valor enviado por el navegador.
- Una venta solo usa la Caja y el stock de su propia sucursal.
- Los accesos directos a detalles operativos de otra sede se rechazan.
- El consolidado no está disponible para roles operativos.
- Staging y producción no fueron modificados.

## Validación Ejecutada

- Prisma format, validate, generate y migraciones locales: aprobados.
- TypeScript: aprobado.
- Política, permisos consolidados y esquema de traslados: 11 pruebas enfocadas
  aprobadas junto con los esquemas de Caja y compras.
- Seed sintético local de Cochabamba: aprobado.
- `git diff --check`: aprobado.

## Pendientes Antes De Producción

- Ejecutar integración completa, lint global, build y QA gstack acumulado en la
  Tarea 29, tal como fue acordado.
- Aplicar migraciones y seed de usuarios en staging.
- Probar cambio de sede, Caja, compra, venta y traslado con todos los roles.
- Confirmar conteo físico, responsables y fecha real de apertura.
- Avisar y pedir autorización antes de migrar o activar producción.

## Commit Sugerido

`feat(sigeco): support multi-branch operations`
