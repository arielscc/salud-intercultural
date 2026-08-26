# Tarea 1 (Dashboard del médico) — Catálogo De Servicios Y Tratamientos

Fecha: 2026-08-03. Entorno modificado: código en `develop`. Incluye migración
Prisma aditiva (no aplicada aún a ninguna base). Iniciativa:
[Dashboard del médico](../sigeco-medico-dashboard/tasks.md).

Aplica el modo de ejecución vigente: se implementó y se corrieron **lint y
typecheck**; QA de navegador (gstack), pruebas y build quedan pendientes para el
cierre acumulado.

## Objetivo

Administrar desde SIGECO las ofertas vendibles que el médico podrá elegir
(Tarea 2), sin hardcodear opciones y separadas de Productos (insumos con stock).

## Resultado

- **Catálogo nuevo, separado de Productos:** modelo `ServiceCatalogItem` con dos
  tipos (`service` = servicio propio como sueroterapia/ozonoterapia; `treatment`
  = conjunto de productos). Campos: código único, nombre, categoría, descripción,
  precio base, estado activo/inactivo y `revision` (versión), igual que el
  catálogo de productos.
- **CRUD administrable en `/sigeco/catalogo`:** lista con filtros (búsqueda,
  categoría, tipo, estado) + alta + edición + activar/desactivar. Nada
  hardcodeado; todo se crea y edita desde la UI. Al armar el pedido (Tarea 2)
  seguirá existiendo la opción de texto libre.
- **Descuento máximo por producto:** se agregó `maxDiscountCents` a
  `InventoryItem`. Un **Tratamiento** toma como tope la **suma** de
  `maxDiscountCents × cantidad` de sus productos componentes; un **Servicio** sin
  productos usa su umbral propio `ownMaxDiscountCents`. Ambos umbrales solo los
  editan **Dirección y Super administrador** (permiso `discount_threshold_manage`)
  desde la ficha del producto (Inventario) o del servicio (Catálogo).
- **Componentes de tratamiento:** modelo `ServiceCatalogComponent` enlaza un
  tratamiento con productos del catálogo de Productos y su cantidad. La ficha
  del tratamiento muestra el desglose de umbrales y el tope calculado.
- **Precios por paquete/sesión:** el servicio marca `supportsSessions` y guarda
  `sessionCount`, `packagePriceCents` (mayor descuento) y `sessionPriceCents`
  (descuento similar o menor). El consumo de sesiones se implementa en la Tarea 5.
- **Historial append-only:** `ServiceCatalogItemVersion` versiona cada cambio
  (incluye snapshot de componentes) con autor y motivo; activar/desactivar no
  borra ventas ni historia, y el precio/umbral históricos de una venta no cambian
  al editar el catálogo.
- **Permisos:** `service_catalog_read` (médico, recepción, administración,
  dirección, super admin), `service_catalog_write` (administración, super admin) y
  `discount_threshold_manage` (dirección, super admin). Validados en servidor en
  páginas y actions; todas las escrituras generan auditoría append-only.
- **Navegación:** nuevo ítem "Catálogo" en el menú de SIGECO (permiso
  `service_catalog_read`).

## Archivos

Esquema y datos:

- `prisma/schema.prisma`: enum `ServiceCatalogKind`; campo `maxDiscountCents` en
  `InventoryItem` e `InventoryItemCatalogVersion`; modelos `ServiceCatalogItem`,
  `ServiceCatalogComponent`, `ServiceCatalogItemVersion`; relación inversa en
  `InternalUser`; 3 permisos nuevos en `InternalPermission`.
- `prisma/migrations/20260803120000_service_treatment_catalog/migration.sql`:
  migración aditiva (enum, columnas, tablas, índices y claves foráneas).
- `src/modules/database/queries/service-catalog.ts`: queries y helper
  `computeServiceCatalogMaxDiscountCents`.
- `src/modules/database/queries/inventory.ts`: `updateInventoryItemMaxDiscountRecord`
  y `maxDiscountCents` en el snapshot de versión.

Permisos y features:

- `src/features/internal-auth/permissions.ts` (+ `permissions.test.ts`).
- `src/features/service-catalog/schemas/service-catalog.schema.ts`.
- `src/features/service-catalog/service-catalog-actions.ts`.
- `src/features/service-catalog/labels.ts`.
- `src/features/service-catalog/components/ServiceCatalogForm.tsx`.
- `src/features/service-catalog/components/ServiceCatalogError.tsx`.

Pantallas:

- `src/app/(internal)/sigeco/(app)/catalogo/page.tsx` (lista).
- `src/app/(internal)/sigeco/(app)/catalogo/nuevo/page.tsx` (alta).
- `src/app/(internal)/sigeco/(app)/catalogo/[itemId]/page.tsx` (ficha, estado,
  umbral del servicio, historial).
- `src/app/(internal)/sigeco/(app)/catalogo/[itemId]/editar/page.tsx` (edición).
- `src/app/(internal)/sigeco/(app)/inventario/[itemId]/page.tsx`: umbral de
  descuento por producto (Dirección/Super admin).
- `src/components/internal/nav-items.ts`: ítem "Catálogo".

## Decisiones técnicas

- **Umbral por producto en `InventoryItem`** (no en el catálogo de servicios):
  la regla de Dirección es "cada producto lleva su umbral" y el tope del
  tratamiento es la suma. Un servicio sin productos usa su umbral propio.
- **Separación de permisos:** editar la oferta (`service_catalog_write`,
  Administración) es distinto de editar el umbral de descuento
  (`discount_threshold_manage`, Dirección/Super admin). Por eso el umbral no está
  en el formulario de alta/edición sino en una tarjeta aparte de la ficha.
- **Migración aditiva:** enum ampliado con `ADD VALUE IF NOT EXISTS`, columnas con
  `DEFAULT 0`; no se borra ni se altera historia.

## Validación

- `pnpm lint`: aprobado.
- `pnpm typecheck`: aprobado (incluye `prisma generate`).

## Pendientes (cierre acumulado)

- Aplicar la migración (`prisma migrate deploy`) en local/staging.
- QA de navegador (gstack): alta/edición de servicio y tratamiento, tope de
  descuento, activar/desactivar, historial; responsive 390/768/1024/1280/1440.
- Prueba de permisos permitidos y denegados por rol (lectura, escritura, umbral).
- `pnpm test`, `pnpm run build` en el cierre acumulado.
- Semilla de ejemplos de catálogo para pruebas.

## Commit Sugerido

`feat(sigeco): add services and treatments catalog`
