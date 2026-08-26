-- Tarea 1 (dashboard del médico): catálogo administrable de servicios y
-- tratamientos, separado de Productos, con umbral de descuento por producto.
-- Migración aditiva: no borra historia clínica ni financiera.

-- CreateEnum
CREATE TYPE "ServiceCatalogKind" AS ENUM ('service', 'treatment');

-- AlterEnum (permisos nuevos)
ALTER TYPE "InternalPermission" ADD VALUE IF NOT EXISTS 'service_catalog_read';
ALTER TYPE "InternalPermission" ADD VALUE IF NOT EXISTS 'service_catalog_write';
ALTER TYPE "InternalPermission" ADD VALUE IF NOT EXISTS 'discount_threshold_manage';

-- AlterTable: umbral de descuento por producto
ALTER TABLE "InventoryItem" ADD COLUMN "maxDiscountCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "InventoryItemCatalogVersion" ADD COLUMN "maxDiscountCents" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ServiceCatalogItem" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'Sin categoría',
    "kind" "ServiceCatalogKind" NOT NULL DEFAULT 'service',
    "basePriceCents" INTEGER NOT NULL DEFAULT 0,
    "ownMaxDiscountCents" INTEGER NOT NULL DEFAULT 0,
    "supportsSessions" BOOLEAN NOT NULL DEFAULT false,
    "sessionCount" INTEGER,
    "packagePriceCents" INTEGER,
    "sessionPriceCents" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceCatalogItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceCatalogComponent" (
    "id" TEXT NOT NULL,
    "catalogItemId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceCatalogComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceCatalogItemVersion" (
    "id" TEXT NOT NULL,
    "catalogItemId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "kind" "ServiceCatalogKind" NOT NULL,
    "basePriceCents" INTEGER NOT NULL,
    "ownMaxDiscountCents" INTEGER NOT NULL,
    "supportsSessions" BOOLEAN NOT NULL,
    "sessionCount" INTEGER,
    "packagePriceCents" INTEGER,
    "sessionPriceCents" INTEGER,
    "active" BOOLEAN NOT NULL,
    "componentSnapshot" JSONB,
    "changedById" TEXT,
    "changeReason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceCatalogItemVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCatalogItem_code_key" ON "ServiceCatalogItem"("code");
CREATE INDEX "ServiceCatalogItem_name_idx" ON "ServiceCatalogItem"("name");
CREATE INDEX "ServiceCatalogItem_category_idx" ON "ServiceCatalogItem"("category");
CREATE INDEX "ServiceCatalogItem_kind_idx" ON "ServiceCatalogItem"("kind");
CREATE INDEX "ServiceCatalogItem_active_idx" ON "ServiceCatalogItem"("active");

-- CreateIndex
CREATE INDEX "ServiceCatalogComponent_catalogItemId_idx" ON "ServiceCatalogComponent"("catalogItemId");
CREATE INDEX "ServiceCatalogComponent_inventoryItemId_idx" ON "ServiceCatalogComponent"("inventoryItemId");
CREATE UNIQUE INDEX "ServiceCatalogComponent_catalogItemId_inventoryItemId_key" ON "ServiceCatalogComponent"("catalogItemId", "inventoryItemId");

-- CreateIndex
CREATE INDEX "ServiceCatalogItemVersion_catalogItemId_createdAt_idx" ON "ServiceCatalogItemVersion"("catalogItemId", "createdAt");
CREATE INDEX "ServiceCatalogItemVersion_changedById_idx" ON "ServiceCatalogItemVersion"("changedById");
CREATE UNIQUE INDEX "ServiceCatalogItemVersion_catalogItemId_version_key" ON "ServiceCatalogItemVersion"("catalogItemId", "version");

-- AddForeignKey
ALTER TABLE "ServiceCatalogComponent" ADD CONSTRAINT "ServiceCatalogComponent_catalogItemId_fkey" FOREIGN KEY ("catalogItemId") REFERENCES "ServiceCatalogItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServiceCatalogComponent" ADD CONSTRAINT "ServiceCatalogComponent_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCatalogItemVersion" ADD CONSTRAINT "ServiceCatalogItemVersion_catalogItemId_fkey" FOREIGN KEY ("catalogItemId") REFERENCES "ServiceCatalogItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceCatalogItemVersion" ADD CONSTRAINT "ServiceCatalogItemVersion_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "InternalUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
