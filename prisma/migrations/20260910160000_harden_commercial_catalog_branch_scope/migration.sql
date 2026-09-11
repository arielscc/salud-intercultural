-- Tarea 10: bloquea catálogos sin asignación y congela configuración global heredada.
BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "Supplier" master
    WHERE NOT EXISTS (SELECT 1 FROM "SupplierBranchProfile" local WHERE local."supplierId" = master."id")
  ) THEN RAISE EXCEPTION 'SUPPLIER_BRANCH_RECONCILIATION_REQUIRED'; END IF;

  IF EXISTS (
    SELECT 1 FROM "InventoryItem" master
    WHERE NOT EXISTS (SELECT 1 FROM "BranchInventoryItem" local WHERE local."itemId" = master."id")
  ) THEN RAISE EXCEPTION 'INVENTORY_ITEM_BRANCH_RECONCILIATION_REQUIRED'; END IF;

  IF EXISTS (
    SELECT 1 FROM "PaymentMethod" master
    WHERE NOT EXISTS (SELECT 1 FROM "PaymentMethodBranch" local WHERE local."methodId" = master."id")
  ) THEN RAISE EXCEPTION 'PAYMENT_METHOD_BRANCH_RECONCILIATION_REQUIRED'; END IF;

  IF EXISTS (
    SELECT 1 FROM "ServiceCatalogItem" master
    WHERE NOT EXISTS (SELECT 1 FROM "ServiceCatalogItemBranch" local WHERE local."catalogItemId" = master."id")
  ) THEN RAISE EXCEPTION 'SERVICE_CATALOG_BRANCH_RECONCILIATION_REQUIRED'; END IF;

  IF EXISTS (
    SELECT 1 FROM "BranchInventoryItem" item
    LEFT JOIN "SupplierBranchProfile" supplier
      ON supplier."supplierId" = item."preferredSupplierId"
     AND supplier."branchCode" = item."branchCode"
    WHERE item."preferredSupplierId" IS NOT NULL AND supplier."supplierId" IS NULL
  ) THEN RAISE EXCEPTION 'PREFERRED_SUPPLIER_BRANCH_MISMATCH'; END IF;

  IF EXISTS (
    SELECT 1
    FROM "ServiceCatalogItemBranch" service
    JOIN "ServiceCatalogComponent" component ON component."catalogItemId" = service."catalogItemId"
    LEFT JOIN "BranchInventoryItem" product
      ON product."itemId" = component."inventoryItemId"
     AND product."branchCode" = service."branchCode"
    WHERE product."itemId" IS NULL
  ) THEN RAISE EXCEPTION 'SERVICE_COMPONENT_BRANCH_RECONCILIATION_REQUIRED'; END IF;
END $$;

CREATE OR REPLACE FUNCTION reject_legacy_commercial_configuration_update()
RETURNS trigger AS $$
BEGIN
  IF TG_TABLE_NAME = 'Supplier' AND
     (NEW."notes", NEW."active") IS DISTINCT FROM (OLD."notes", OLD."active") THEN
    RAISE EXCEPTION 'SUPPLIER_CONFIGURATION_IS_BRANCH_SCOPED';
  ELSIF TG_TABLE_NAME = 'InventoryItem' AND
     (NEW."sku", NEW."salePriceCents", NEW."referenceCostCents", NEW."maxDiscountCents", NEW."minimumStock", NEW."active")
       IS DISTINCT FROM
     (OLD."sku", OLD."salePriceCents", OLD."referenceCostCents", OLD."maxDiscountCents", OLD."minimumStock", OLD."active") THEN
    RAISE EXCEPTION 'INVENTORY_CONFIGURATION_IS_BRANCH_SCOPED';
  ELSIF TG_TABLE_NAME = 'PaymentMethod' AND NEW."active" IS DISTINCT FROM OLD."active" THEN
    RAISE EXCEPTION 'PAYMENT_METHOD_CONFIGURATION_IS_BRANCH_SCOPED';
  ELSIF TG_TABLE_NAME = 'ServiceCatalogItem' AND
     (NEW."basePriceCents", NEW."ownMaxDiscountCents", NEW."sessionCount", NEW."packagePriceCents", NEW."sessionPriceCents", NEW."active")
       IS DISTINCT FROM
     (OLD."basePriceCents", OLD."ownMaxDiscountCents", OLD."sessionCount", OLD."packagePriceCents", OLD."sessionPriceCents", OLD."active") THEN
    RAISE EXCEPTION 'SERVICE_CATALOG_CONFIGURATION_IS_BRANCH_SCOPED';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Supplier_reject_legacy_configuration_update"
BEFORE UPDATE ON "Supplier" FOR EACH ROW EXECUTE FUNCTION reject_legacy_commercial_configuration_update();
CREATE TRIGGER "InventoryItem_reject_legacy_configuration_update"
BEFORE UPDATE ON "InventoryItem" FOR EACH ROW EXECUTE FUNCTION reject_legacy_commercial_configuration_update();
CREATE TRIGGER "PaymentMethod_reject_legacy_configuration_update"
BEFORE UPDATE ON "PaymentMethod" FOR EACH ROW EXECUTE FUNCTION reject_legacy_commercial_configuration_update();
CREATE TRIGGER "ServiceCatalogItem_reject_legacy_configuration_update"
BEFORE UPDATE ON "ServiceCatalogItem" FOR EACH ROW EXECUTE FUNCTION reject_legacy_commercial_configuration_update();

COMMIT;
