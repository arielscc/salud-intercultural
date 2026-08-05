-- CreateTable
CREATE TABLE "IndicationCatalogItem" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "normalized" TEXT NOT NULL,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IndicationCatalogItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IndicationCatalogItem_normalized_key" ON "IndicationCatalogItem"("normalized");

-- CreateIndex
CREATE INDEX "IndicationCatalogItem_usageCount_idx" ON "IndicationCatalogItem"("usageCount");
