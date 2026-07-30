# Reporte De Cambios — Tarea 19: Catálogo De Productos Y Proveedores

## Fecha

2026-07-30.

## Objetivo

Permitir que Administración mantenga productos y proveedores desde SIGECO,
con costos visibles para Dirección, disponibilidad limitada para las áreas
clínicas e historial que no pueda borrarse.

## Resultado Implementado

- Los productos guardan categoría, unidad, uso, precio de venta, costo
  referencial, stock mínimo y estado.
- El alta y la edición tienen un recorrido guiado y responsive.
- El catálogo permite búsqueda y filtros por categoría, uso y estado.
- El código interno es único, se normaliza y no puede cambiarse ni reutilizarse.
- Productos y proveedores se desactivan sin borrar relaciones o historia.
- Los proveedores guardan contacto estructurado, dirección y notas.
- Cada producto admite varios proveedores activos y como máximo uno preferido.
- Cada cambio crea una versión con responsable, fecha y motivo.
- Administración modifica; Dirección revisa costos y proveedores; Médico y
  Enfermería solo consultan disponibilidad activa; Seguimiento/Yazmin no accede.
- Ventas solo ofrece productos activos y habilitados para venta, y vuelve a
  validarlos dentro de la transacción.

## Decisiones Técnicas

- `InventoryItem` mantiene la proyección vigente y un contador `revision`.
- `InventoryItemCatalogVersion` conserva cada fotografía del catálogo.
- `InventoryItemSupplier` reemplaza la relación de un solo proveedor.
- `SupplierVersion` conserva cada cambio de contacto o estado.
- PostgreSQL impide editar o borrar versiones, borrar maestros y cambiar el
  código interno.
- Una restricción parcial permite un solo proveedor preferido activo.
- Los códigos y nombres de proveedor son únicos sin distinguir mayúsculas.
- El costo referencial no sustituye el costo histórico: la Tarea 20 guardará
  el costo real en cada compra.
- La revisión esperada evita que dos pestañas se sobrescriban.

## Base De Datos Y Ambientes

- Migración local: `20260730181717_product_catalog_suppliers`.
- Los proveedores simples anteriores se conservaron como asociaciones
  preferidas.
- Productos y proveedores anteriores recibieron una versión inicial sin
  inventar un autor.
- Desarrollo local quedó al día con 27 migraciones.
- Staging y producción no fueron modificados.

## Validación Local

- Prisma format, validate, generate y migración local: aprobados.
- TypeScript y lint: aprobados.
- 4 archivos y 32 pruebas enfocadas de schemas, dinero, permisos, errores y
  límites de seguridad:
  aprobados.
- Se amplió la cobertura de integración para versiones, concurrencia,
  proveedores, código inmutable y conservación de movimientos; su ejecución
  permanece aplazada para el cierre acumulado acordado.
- Build, integración completa y QA gstack permanecen aplazados.

## Pendientes Del Cierre Conjunto

- Ejecutar integración acumulada, build y QA web/móvil con gstack.
- Validar los cuatro perfiles previstos en staging.
- Cargar o revisar categorías, unidades, precios, costos y proveedores reales.
- Probar el recorrido de alta y edición en teléfonos reales.
- Confirmar en la Tarea 20 que cada compra conserva su costo histórico.
- Solicitar autorización antes de aplicar la migración en producción.

La implementación local queda **en progreso** hasta completar el QA acumulado y
la validación por roles en staging.

## Commit Sugerido

`feat(sigeco): manage products and suppliers`
