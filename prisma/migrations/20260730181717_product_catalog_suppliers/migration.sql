-- Task 19: catalogo de productos y proveedores.
-- Los datos anteriores se conservan y se convierten al nuevo modelo.

CREATE TYPE "InventoryItemUsage" AS ENUM ('sale', 'internal_use', 'both');

ALTER TYPE "InternalPermission" ADD VALUE 'inventory_cost_read';
ALTER TYPE "InternalPermission" ADD VALUE 'suppliers_read';
ALTER TYPE "InternalPermission" ADD VALUE 'suppliers_write';

ALTER TABLE "InventoryItem"
ADD COLUMN "category" TEXT NOT NULL DEFAULT 'Sin categoría',
ADD COLUMN "referenceCostCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "salePriceCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "usage" "InventoryItemUsage" NOT NULL DEFAULT 'both';

ALTER TABLE "Supplier"
ADD COLUMN "address" TEXT,
ADD COLUMN "contactName" TEXT,
ADD COLUMN "email" TEXT,
ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "whatsapp" TEXT;

CREATE TABLE "InventoryItemSupplier" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "preferred" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "InventoryItemSupplier_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InventoryItemCatalogVersion" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "sku" TEXT,
    "internalCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "usage" "InventoryItemUsage" NOT NULL,
    "salePriceCents" INTEGER NOT NULL,
    "referenceCostCents" INTEGER NOT NULL,
    "minimumStock" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL,
    "supplierSnapshot" JSONB,
    "changedById" TEXT,
    "changeReason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InventoryItemCatalogVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupplierVersion" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL,
    "changedById" TEXT,
    "changeReason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SupplierVersion_pkey" PRIMARY KEY ("id")
);

-- Convierte el proveedor simple anterior en una asociacion activa y preferida.
INSERT INTO "InventoryItemSupplier" (
  "id", "itemId", "supplierId", "preferred", "active", "createdAt", "updatedAt"
)
SELECT
  'legacy-link-' || md5(item."id" || ':' || item."supplierId"),
  item."id",
  item."supplierId",
  true,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "InventoryItem" item
WHERE item."supplierId" IS NOT NULL;

ALTER TABLE "InventoryItem" DROP CONSTRAINT "InventoryItem_supplierId_fkey";
DROP INDEX "InventoryItem_supplierId_idx";
ALTER TABLE "InventoryItem" DROP COLUMN "supplierId";
ALTER TABLE "Supplier" ALTER COLUMN "updatedAt" DROP DEFAULT;

CREATE INDEX "InventoryItemSupplier_itemId_active_idx"
ON "InventoryItemSupplier"("itemId", "active");
CREATE INDEX "InventoryItemSupplier_supplierId_active_idx"
ON "InventoryItemSupplier"("supplierId", "active");
CREATE UNIQUE INDEX "InventoryItemSupplier_itemId_supplierId_key"
ON "InventoryItemSupplier"("itemId", "supplierId");
CREATE UNIQUE INDEX "InventoryItemSupplier_one_preferred_active_per_item"
ON "InventoryItemSupplier"("itemId")
WHERE "preferred" = true AND "active" = true;

CREATE INDEX "InventoryItemCatalogVersion_itemId_createdAt_idx"
ON "InventoryItemCatalogVersion"("itemId", "createdAt");
CREATE INDEX "InventoryItemCatalogVersion_changedById_idx"
ON "InventoryItemCatalogVersion"("changedById");
CREATE UNIQUE INDEX "InventoryItemCatalogVersion_itemId_version_key"
ON "InventoryItemCatalogVersion"("itemId", "version");

CREATE INDEX "SupplierVersion_supplierId_createdAt_idx"
ON "SupplierVersion"("supplierId", "createdAt");
CREATE INDEX "SupplierVersion_changedById_idx"
ON "SupplierVersion"("changedById");
CREATE UNIQUE INDEX "SupplierVersion_supplierId_version_key"
ON "SupplierVersion"("supplierId", "version");

CREATE INDEX "InventoryItem_category_idx" ON "InventoryItem"("category");
CREATE INDEX "InventoryItem_usage_idx" ON "InventoryItem"("usage");
CREATE UNIQUE INDEX "InventoryItem_internalCode_case_insensitive_key"
ON "InventoryItem"(LOWER(BTRIM("internalCode")));
CREATE UNIQUE INDEX "InventoryItem_sku_case_insensitive_key"
ON "InventoryItem"(LOWER(BTRIM("sku")))
WHERE "sku" IS NOT NULL;
CREATE UNIQUE INDEX "Supplier_name_case_insensitive_key"
ON "Supplier"(LOWER(BTRIM("name")));

ALTER TABLE "InventoryItem"
ADD CONSTRAINT "InventoryItem_salePriceCents_check" CHECK ("salePriceCents" >= 0),
ADD CONSTRAINT "InventoryItem_referenceCostCents_check" CHECK ("referenceCostCents" >= 0),
ADD CONSTRAINT "InventoryItem_minimumStock_check" CHECK ("minimumStock" >= 0),
ADD CONSTRAINT "InventoryItem_revision_check" CHECK ("revision" > 0);
ALTER TABLE "Supplier"
ADD CONSTRAINT "Supplier_revision_check" CHECK ("revision" > 0);

ALTER TABLE "InventoryItemSupplier"
ADD CONSTRAINT "InventoryItemSupplier_itemId_fkey"
FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryItemSupplier"
ADD CONSTRAINT "InventoryItemSupplier_supplierId_fkey"
FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryItemCatalogVersion"
ADD CONSTRAINT "InventoryItemCatalogVersion_itemId_fkey"
FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryItemCatalogVersion"
ADD CONSTRAINT "InventoryItemCatalogVersion_changedById_fkey"
FOREIGN KEY ("changedById") REFERENCES "InternalUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupplierVersion"
ADD CONSTRAINT "SupplierVersion_supplierId_fkey"
FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupplierVersion"
ADD CONSTRAINT "SupplierVersion_changedById_fkey"
FOREIGN KEY ("changedById") REFERENCES "InternalUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Crea el primer punto del historial sin inventar un autor.
INSERT INTO "SupplierVersion" (
  "id", "supplierId", "version", "name", "contactName", "phone", "whatsapp",
  "email", "address", "notes", "active", "changedById", "changeReason", "createdAt"
)
SELECT
  'legacy-supplier-version-' || md5(supplier."id"),
  supplier."id",
  1,
  supplier."name",
  supplier."contactName",
  supplier."phone",
  supplier."whatsapp",
  supplier."email",
  supplier."address",
  supplier."notes",
  supplier."active",
  NULL,
  'Migración del proveedor existente',
  supplier."createdAt"
FROM "Supplier" supplier;

INSERT INTO "InventoryItemCatalogVersion" (
  "id", "itemId", "version", "sku", "internalCode", "name", "description",
  "category", "unit", "usage", "salePriceCents", "referenceCostCents",
  "minimumStock", "active", "supplierSnapshot", "changedById",
  "changeReason", "createdAt"
)
SELECT
  'legacy-item-version-' || md5(item."id"),
  item."id",
  1,
  item."sku",
  item."internalCode",
  item."name",
  item."description",
  item."category",
  item."unit",
  item."usage",
  item."salePriceCents",
  item."referenceCostCents",
  item."minimumStock",
  item."active",
  COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'supplierId', link."supplierId",
          'name', supplier."name",
          'preferred', link."preferred"
        )
        ORDER BY link."preferred" DESC, supplier."name"
      )
      FROM "InventoryItemSupplier" link
      JOIN "Supplier" supplier ON supplier."id" = link."supplierId"
      WHERE link."itemId" = item."id" AND link."active" = true
    ),
    '[]'::jsonb
  ),
  NULL,
  'Migración del producto existente',
  item."createdAt"
FROM "InventoryItem" item;

-- Los codigos se reservan para siempre y el historial solo admite anexos.
CREATE OR REPLACE FUNCTION "prevent_inventory_catalog_mutation"()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'El historial del catálogo es append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "InventoryItemCatalogVersion_append_only"
BEFORE UPDATE OR DELETE ON "InventoryItemCatalogVersion"
FOR EACH ROW EXECUTE FUNCTION "prevent_inventory_catalog_mutation"();

CREATE TRIGGER "SupplierVersion_append_only"
BEFORE UPDATE OR DELETE ON "SupplierVersion"
FOR EACH ROW EXECUTE FUNCTION "prevent_inventory_catalog_mutation"();

CREATE OR REPLACE FUNCTION "protect_inventory_master_records"()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Los registros maestros se desactivan; no se eliminan';
  END IF;

  IF TG_TABLE_NAME = 'InventoryItem'
     AND NEW."internalCode" IS DISTINCT FROM OLD."internalCode" THEN
    RAISE EXCEPTION 'El código interno de un producto es inmutable';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "InventoryItem_protect_master"
BEFORE UPDATE OR DELETE ON "InventoryItem"
FOR EACH ROW EXECUTE FUNCTION "protect_inventory_master_records"();

CREATE TRIGGER "Supplier_protect_master"
BEFORE DELETE ON "Supplier"
FOR EACH ROW EXECUTE FUNCTION "protect_inventory_master_records"();

CREATE TRIGGER "InventoryItemSupplier_protect_master"
BEFORE DELETE ON "InventoryItemSupplier"
FOR EACH ROW EXECUTE FUNCTION "protect_inventory_master_records"();
