-- Tarea 2 (dashboard del médico): el médico arma un pedido con líneas en la
-- consulta y lo envía a Administración, sin crear venta ni cobro (Tarea 3).
-- Migración aditiva: no borra historia clínica ni financiera.

-- CreateEnum
CREATE TYPE "DoctorOrderStatus" AS ENUM ('draft', 'submitted', 'confirmed', 'cancelled');
CREATE TYPE "DoctorOrderLineSource" AS ENUM ('service', 'treatment', 'product', 'free_text');

-- CreateTable
CREATE TABLE "DoctorOrder" (
    "id" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT,
    "status" "DoctorOrderStatus" NOT NULL DEFAULT 'draft',
    "indications" TEXT,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoctorOrderLine" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "source" "DoctorOrderLineSource" NOT NULL,
    "itemType" "SaleItemType" NOT NULL,
    "catalogItemId" TEXT,
    "inventoryItemId" TEXT,
    "description" TEXT NOT NULL,
    "unitPriceCents" INTEGER NOT NULL DEFAULT 0,
    "discountCents" INTEGER NOT NULL DEFAULT 0,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "sessionCount" INTEGER,
    "maxDiscountCents" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DoctorOrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DoctorOrder_visitId_key" ON "DoctorOrder"("visitId");
CREATE INDEX "DoctorOrder_patientId_idx" ON "DoctorOrder"("patientId");
CREATE INDEX "DoctorOrder_status_idx" ON "DoctorOrder"("status");

-- CreateIndex
CREATE INDEX "DoctorOrderLine_orderId_idx" ON "DoctorOrderLine"("orderId");
CREATE INDEX "DoctorOrderLine_catalogItemId_idx" ON "DoctorOrderLine"("catalogItemId");
CREATE INDEX "DoctorOrderLine_inventoryItemId_idx" ON "DoctorOrderLine"("inventoryItemId");

-- AddForeignKey
ALTER TABLE "DoctorOrder" ADD CONSTRAINT "DoctorOrder_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DoctorOrder" ADD CONSTRAINT "DoctorOrder_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DoctorOrder" ADD CONSTRAINT "DoctorOrder_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "InternalUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorOrderLine" ADD CONSTRAINT "DoctorOrderLine_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "DoctorOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DoctorOrderLine" ADD CONSTRAINT "DoctorOrderLine_catalogItemId_fkey" FOREIGN KEY ("catalogItemId") REFERENCES "ServiceCatalogItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DoctorOrderLine" ADD CONSTRAINT "DoctorOrderLine_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
