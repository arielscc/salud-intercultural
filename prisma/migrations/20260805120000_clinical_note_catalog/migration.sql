-- CreateEnum
CREATE TYPE "ClinicalNoteCatalogField" AS ENUM ('finding', 'observation');

-- CreateTable
CREATE TABLE "ClinicalNoteCatalogItem" (
    "id" TEXT NOT NULL,
    "field" "ClinicalNoteCatalogField" NOT NULL,
    "text" TEXT NOT NULL,
    "normalized" TEXT NOT NULL,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicalNoteCatalogItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClinicalNoteCatalogItem_field_normalized_key" ON "ClinicalNoteCatalogItem"("field", "normalized");

-- CreateIndex
CREATE INDEX "ClinicalNoteCatalogItem_field_usageCount_idx" ON "ClinicalNoteCatalogItem"("field", "usageCount");
