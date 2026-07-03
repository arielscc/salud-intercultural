-- V3.6 inventory items, append-only movements, adjustments and low-stock alerts.

ALTER TYPE "InternalPermission" ADD VALUE IF NOT EXISTS 'inventory_read';
ALTER TYPE "InternalPermission" ADD VALUE IF NOT EXISTS 'inventory_write';
ALTER TYPE "InternalPermission" ADD VALUE IF NOT EXISTS 'inventory_adjust';

CREATE TYPE "InventoryMovementType" AS ENUM (
  'entry',
  'automatic_sale_exit',
  'authorized_manual_adjustment',
  'correction'
);

CREATE TYPE "InventoryAlertStatus" AS ENUM ('open', 'resolved');

ALTER TABLE "SaleItem" ADD COLUMN "inventoryItemId" TEXT;

CREATE TABLE "Supplier" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT,
  "notes" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InventoryItem" (
  "id" TEXT NOT NULL,
  "supplierId" TEXT,
  "sku" TEXT,
  "internalCode" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "unit" TEXT NOT NULL DEFAULT 'unidad',
  "currentStock" INTEGER NOT NULL DEFAULT 0,
  "minimumStock" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InventoryMovement" (
  "id" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "saleId" TEXT,
  "saleItemId" TEXT,
  "userId" TEXT,
  "type" "InventoryMovementType" NOT NULL,
  "quantityDelta" INTEGER NOT NULL,
  "stockAfter" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InventoryAdjustment" (
  "id" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "userId" TEXT,
  "quantityDelta" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "InventoryAdjustment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InventoryAlert" (
  "id" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "status" "InventoryAlertStatus" NOT NULL DEFAULT 'open',
  "message" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),

  CONSTRAINT "InventoryAlert_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InventoryItem_sku_key" ON "InventoryItem"("sku");
CREATE UNIQUE INDEX "InventoryItem_internalCode_key" ON "InventoryItem"("internalCode");
CREATE INDEX "Supplier_name_idx" ON "Supplier"("name");
CREATE INDEX "Supplier_active_idx" ON "Supplier"("active");
CREATE INDEX "InventoryItem_supplierId_idx" ON "InventoryItem"("supplierId");
CREATE INDEX "InventoryItem_name_idx" ON "InventoryItem"("name");
CREATE INDEX "InventoryItem_active_idx" ON "InventoryItem"("active");
CREATE INDEX "InventoryItem_currentStock_idx" ON "InventoryItem"("currentStock");
CREATE INDEX "SaleItem_inventoryItemId_idx" ON "SaleItem"("inventoryItemId");
CREATE INDEX "InventoryMovement_itemId_idx" ON "InventoryMovement"("itemId");
CREATE INDEX "InventoryMovement_saleId_idx" ON "InventoryMovement"("saleId");
CREATE INDEX "InventoryMovement_saleItemId_idx" ON "InventoryMovement"("saleItemId");
CREATE INDEX "InventoryMovement_userId_idx" ON "InventoryMovement"("userId");
CREATE INDEX "InventoryMovement_type_createdAt_idx" ON "InventoryMovement"("type", "createdAt");
CREATE INDEX "InventoryAdjustment_itemId_idx" ON "InventoryAdjustment"("itemId");
CREATE INDEX "InventoryAdjustment_userId_idx" ON "InventoryAdjustment"("userId");
CREATE INDEX "InventoryAdjustment_createdAt_idx" ON "InventoryAdjustment"("createdAt");
CREATE INDEX "InventoryAlert_itemId_idx" ON "InventoryAlert"("itemId");
CREATE INDEX "InventoryAlert_status_createdAt_idx" ON "InventoryAlert"("status", "createdAt");

ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_saleItemId_fkey" FOREIGN KEY ("saleItemId") REFERENCES "SaleItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "InternalUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InventoryAdjustment" ADD CONSTRAINT "InventoryAdjustment_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryAdjustment" ADD CONSTRAINT "InventoryAdjustment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "InternalUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InventoryAlert" ADD CONSTRAINT "InventoryAlert_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
