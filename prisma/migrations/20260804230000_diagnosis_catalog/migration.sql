-- CreateTable
CREATE TABLE "DiagnosisCatalogItem" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "normalized" TEXT NOT NULL,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiagnosisCatalogItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DiagnosisCatalogItem_normalized_key" ON "DiagnosisCatalogItem"("normalized");

-- CreateIndex
CREATE INDEX "DiagnosisCatalogItem_usageCount_idx" ON "DiagnosisCatalogItem"("usageCount");
