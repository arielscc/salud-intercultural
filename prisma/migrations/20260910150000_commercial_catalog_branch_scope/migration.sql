-- Tarea 10: identidad comercial global y configuración explícita por sucursal.
-- El backfill usa únicamente sucursales demostradas por operaciones existentes.
BEGIN;

ALTER TABLE "Supplier" ADD COLUMN "country" TEXT;
ALTER TABLE "InventoryItem" ADD COLUMN "presentation" TEXT;
ALTER TABLE "InventoryItem" ADD COLUMN "manufacturer" TEXT;
ALTER TABLE "InventoryItem" ADD COLUMN "barcode" TEXT;
ALTER TABLE "InventoryItemCatalogVersion" ADD COLUMN "presentation" TEXT;
ALTER TABLE "InventoryItemCatalogVersion" ADD COLUMN "manufacturer" TEXT;
ALTER TABLE "InventoryItemCatalogVersion" ADD COLUMN "barcode" TEXT;
ALTER TABLE "SupplierVersion" ADD COLUMN "country" TEXT;

CREATE UNIQUE INDEX "InventoryItem_barcode_key" ON "InventoryItem"("barcode");
CREATE INDEX "Supplier_country_idx" ON "Supplier"("country");

CREATE TABLE "SupplierBranchProfile" (
  "supplierId" TEXT NOT NULL,
  "branchCode" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT false,
  "accountExecutiveName" TEXT,
  "accountExecutivePhone" TEXT,
  "commercialTerms" TEXT,
  "paymentTermDays" INTEGER,
  "references" TEXT,
  "notes" TEXT,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupplierBranchProfile_pkey" PRIMARY KEY ("supplierId", "branchCode")
);

CREATE TABLE "BranchInventoryItem" (
  "itemId" TEXT NOT NULL,
  "branchCode" TEXT NOT NULL,
  "sku" TEXT,
  "available" BOOLEAN NOT NULL DEFAULT false,
  "salePriceCents" INTEGER NOT NULL DEFAULT 0,
  "referenceCostCents" INTEGER NOT NULL DEFAULT 0,
  "maxDiscountCents" INTEGER NOT NULL DEFAULT 0,
  "minimumStock" INTEGER NOT NULL DEFAULT 0,
  "locationCode" TEXT,
  "preferredSupplierId" TEXT,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BranchInventoryItem_pkey" PRIMARY KEY ("itemId", "branchCode")
);

CREATE TABLE "PaymentMethodBranch" (
  "methodId" TEXT NOT NULL,
  "branchCode" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT false,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentMethodBranch_pkey" PRIMARY KEY ("methodId", "branchCode")
);

CREATE TABLE "ServiceCatalogItemBranch" (
  "catalogItemId" TEXT NOT NULL,
  "branchCode" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT false,
  "basePriceCents" INTEGER NOT NULL DEFAULT 0,
  "ownMaxDiscountCents" INTEGER NOT NULL DEFAULT 0,
  "sessionCount" INTEGER,
  "packagePriceCents" INTEGER,
  "sessionPriceCents" INTEGER,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ServiceCatalogItemBranch_pkey" PRIMARY KEY ("catalogItemId", "branchCode")
);

CREATE INDEX "SupplierBranchProfile_branchCode_active_idx"
  ON "SupplierBranchProfile"("branchCode", "active");
CREATE UNIQUE INDEX "BranchInventoryItem_branchCode_sku_key"
  ON "BranchInventoryItem"("branchCode", "sku");
CREATE INDEX "BranchInventoryItem_branchCode_available_idx"
  ON "BranchInventoryItem"("branchCode", "available");
CREATE INDEX "BranchInventoryItem_branchCode_minimumStock_idx"
  ON "BranchInventoryItem"("branchCode", "minimumStock");
CREATE INDEX "BranchInventoryItem_preferredSupplierId_branchCode_idx"
  ON "BranchInventoryItem"("preferredSupplierId", "branchCode");
CREATE INDEX "PaymentMethodBranch_branchCode_active_idx"
  ON "PaymentMethodBranch"("branchCode", "active");
CREATE INDEX "ServiceCatalogItemBranch_branchCode_active_idx"
  ON "ServiceCatalogItemBranch"("branchCode", "active");

ALTER TABLE "SupplierBranchProfile"
  ADD CONSTRAINT "SupplierBranchProfile_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "SupplierBranchProfile_branchCode_fkey" FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BranchInventoryItem"
  ADD CONSTRAINT "BranchInventoryItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "BranchInventoryItem_branchCode_fkey" FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentMethodBranch"
  ADD CONSTRAINT "PaymentMethodBranch_methodId_fkey" FOREIGN KEY ("methodId") REFERENCES "PaymentMethod"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "PaymentMethodBranch_branchCode_fkey" FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceCatalogItemBranch"
  ADD CONSTRAINT "ServiceCatalogItemBranch_catalogItemId_fkey" FOREIGN KEY ("catalogItemId") REFERENCES "ServiceCatalogItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ServiceCatalogItemBranch_branchCode_fkey" FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Proveedores: una compra o un lote demuestra que la sede trabajó con ellos.
INSERT INTO "SupplierBranchProfile" (
  "supplierId", "branchCode", "active", "notes", "createdAt", "updatedAt"
)
SELECT evidence."supplierId", evidence."branchCode", supplier."active", supplier."notes",
       supplier."createdAt", supplier."updatedAt"
FROM (
  SELECT "supplierId", "branchCode" FROM "Purchase"
  UNION
  SELECT "supplierId", "branchCode" FROM "InventoryLot"
) evidence
JOIN "Supplier" supplier ON supplier."id" = evidence."supplierId"
ON CONFLICT ("supplierId", "branchCode") DO NOTHING;

-- Productos: stock, movimientos o usos clínico/comerciales prueban la sede.
INSERT INTO "BranchInventoryItem" (
  "itemId", "branchCode", "sku", "available", "salePriceCents",
  "referenceCostCents", "maxDiscountCents", "minimumStock", "createdAt", "updatedAt"
)
SELECT evidence."itemId", evidence."branchCode", item."sku", item."active",
       item."salePriceCents", item."referenceCostCents", item."maxDiscountCents",
       item."minimumStock", item."createdAt", item."updatedAt"
FROM (
  SELECT "itemId", "branchCode" FROM "BranchInventoryBalance"
  UNION SELECT "itemId", "branchCode" FROM "InventoryMovement"
  UNION SELECT line."itemId", purchase."branchCode" FROM "PurchaseLine" line JOIN "Purchase" purchase ON purchase."id" = line."purchaseId"
  UNION SELECT line."inventoryItemId", sale."branchCode" FROM "SaleItem" line JOIN "Sale" sale ON sale."id" = line."saleId" WHERE line."inventoryItemId" IS NOT NULL
  UNION SELECT "inventoryItemId", "branchCode" FROM "NursingApplication" WHERE "inventoryItemId" IS NOT NULL
  UNION SELECT "inventoryItemId", "branchCode" FROM "PrescriptionItem" WHERE "inventoryItemId" IS NOT NULL
  UNION SELECT "inventoryItemId", "branchCode" FROM "DoctorOrderLine" WHERE "inventoryItemId" IS NOT NULL
  UNION SELECT "itemId", "branchCode" FROM "InventoryLot"
) evidence
JOIN "InventoryItem" item ON item."id" = evidence."itemId"
ON CONFLICT ("itemId", "branchCode") DO NOTHING;

-- La preferencia solo se copia cuando el proveedor está demostrado en la misma sede.
UPDATE "BranchInventoryItem" branch_item
SET "preferredSupplierId" = preferred."supplierId"
FROM (
  SELECT link."itemId", profile."branchCode", MIN(link."supplierId") AS "supplierId"
  FROM "InventoryItemSupplier" link
  JOIN "SupplierBranchProfile" profile ON profile."supplierId" = link."supplierId"
  WHERE link."preferred" = true AND link."active" = true
  GROUP BY link."itemId", profile."branchCode"
) preferred
WHERE branch_item."itemId" = preferred."itemId"
  AND branch_item."branchCode" = preferred."branchCode";

ALTER TABLE "BranchInventoryItem"
  ADD CONSTRAINT "BranchInventoryItem_preferredSupplierId_branchCode_fkey"
  FOREIGN KEY ("preferredSupplierId", "branchCode")
  REFERENCES "SupplierBranchProfile"("supplierId", "branchCode")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Medios de pago: cada pago histórico prueba su habilitación local.
INSERT INTO "PaymentMethodBranch" ("methodId", "branchCode", "active", "updatedAt")
SELECT DISTINCT payment."methodId", payment."branchCode", method."active", CURRENT_TIMESTAMP
FROM "Payment" payment
JOIN "PaymentMethod" method ON method."id" = payment."methodId"
ON CONFLICT ("methodId", "branchCode") DO NOTHING;

-- La migración que creó las sedes documenta que la única operación heredada
-- era El Alto y que Cochabamba quedó solo en preparación. Esto habilita los
-- medios canónicos en El Alto sin convertirlo en un fallback para código nuevo.
INSERT INTO "PaymentMethodBranch" ("methodId", "branchCode", "active", "updatedAt")
SELECT method."id", branch."code", (method."active" AND method."code" IN ('cash', 'qr')), CURRENT_TIMESTAMP
FROM "PaymentMethod" method
JOIN "ClinicBranch" branch ON branch."code" = 'el-alto' AND branch."status"::text = 'active'
ON CONFLICT ("methodId", "branchCode") DO NOTHING;

-- Ofertas: órdenes o paquetes de sesiones demuestran uso local.
INSERT INTO "ServiceCatalogItemBranch" (
  "catalogItemId", "branchCode", "active", "basePriceCents",
  "ownMaxDiscountCents", "sessionCount", "packagePriceCents",
  "sessionPriceCents", "createdAt", "updatedAt"
)
SELECT evidence."catalogItemId", evidence."branchCode", item."active",
       item."basePriceCents", item."ownMaxDiscountCents", item."sessionCount",
       item."packagePriceCents", item."sessionPriceCents", item."createdAt", item."updatedAt"
FROM (
  SELECT "catalogItemId", "branchCode" FROM "DoctorOrderLine" WHERE "catalogItemId" IS NOT NULL
  UNION
  SELECT "catalogItemId", "branchCode" FROM "ServiceSessionPackage" WHERE "catalogItemId" IS NOT NULL
) evidence
JOIN "ServiceCatalogItem" item ON item."id" = evidence."catalogItemId"
ON CONFLICT ("catalogItemId", "branchCode") DO NOTHING;

-- La composición es canónica: usar una oferta en una sede demuestra que sus
-- productos componentes pertenecen allí, aunque todavía no tengan saldo.
INSERT INTO "BranchInventoryItem" (
  "itemId", "branchCode", "sku", "available", "salePriceCents",
  "referenceCostCents", "maxDiscountCents", "minimumStock", "createdAt", "updatedAt"
)
SELECT component."inventoryItemId", service."branchCode", item."sku", item."active",
       item."salePriceCents", item."referenceCostCents", item."maxDiscountCents",
       item."minimumStock", item."createdAt", item."updatedAt"
FROM "ServiceCatalogItemBranch" service
JOIN "ServiceCatalogComponent" component ON component."catalogItemId" = service."catalogItemId"
JOIN "InventoryItem" item ON item."id" = component."inventoryItemId"
ON CONFLICT ("itemId", "branchCode") DO NOTHING;

COMMIT;
