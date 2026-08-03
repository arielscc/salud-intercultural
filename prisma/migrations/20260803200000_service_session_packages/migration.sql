-- Tarea 5 (dashboard del médico): sesiones de servicio (sueroterapia,
-- ozonoterapia) a lo largo de varias visitas. Paquetes con precio en fotografía
-- y consumo por sesión. Migración aditiva.

-- CreateEnum
CREATE TYPE "ServiceSessionPricingMode" AS ENUM ('package', 'per_session');
CREATE TYPE "ServiceSessionPackageStatus" AS ENUM ('active', 'completed', 'cancelled');

-- AlterTable: modo de precio por línea del pedido
ALTER TABLE "DoctorOrderLine" ADD COLUMN "pricingMode" "ServiceSessionPricingMode";

-- CreateTable
CREATE TABLE "ServiceSessionPackage" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "catalogItemId" TEXT,
    "serviceName" TEXT NOT NULL,
    "originVisitId" TEXT,
    "doctorOrderId" TEXT,
    "saleId" TEXT,
    "pricingMode" "ServiceSessionPricingMode" NOT NULL DEFAULT 'package',
    "totalSessions" INTEGER NOT NULL,
    "sessionsUsed" INTEGER NOT NULL DEFAULT 0,
    "packagePriceCents" INTEGER,
    "sessionPriceCents" INTEGER,
    "totalPaidCents" INTEGER NOT NULL DEFAULT 0,
    "status" "ServiceSessionPackageStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceSessionPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceSessionUse" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "visitId" TEXT,
    "sessionNumber" INTEGER NOT NULL,
    "appliedById" TEXT,
    "notes" TEXT,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceSessionUse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServiceSessionPackage_patientId_status_idx" ON "ServiceSessionPackage"("patientId", "status");
CREATE INDEX "ServiceSessionPackage_catalogItemId_idx" ON "ServiceSessionPackage"("catalogItemId");
CREATE INDEX "ServiceSessionPackage_doctorOrderId_idx" ON "ServiceSessionPackage"("doctorOrderId");
CREATE INDEX "ServiceSessionUse_packageId_idx" ON "ServiceSessionUse"("packageId");
CREATE INDEX "ServiceSessionUse_visitId_idx" ON "ServiceSessionUse"("visitId");

-- AddForeignKey
ALTER TABLE "ServiceSessionPackage" ADD CONSTRAINT "ServiceSessionPackage_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceSessionPackage" ADD CONSTRAINT "ServiceSessionPackage_catalogItemId_fkey" FOREIGN KEY ("catalogItemId") REFERENCES "ServiceCatalogItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ServiceSessionPackage" ADD CONSTRAINT "ServiceSessionPackage_originVisitId_fkey" FOREIGN KEY ("originVisitId") REFERENCES "Visit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ServiceSessionPackage" ADD CONSTRAINT "ServiceSessionPackage_doctorOrderId_fkey" FOREIGN KEY ("doctorOrderId") REFERENCES "DoctorOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ServiceSessionPackage" ADD CONSTRAINT "ServiceSessionPackage_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceSessionUse" ADD CONSTRAINT "ServiceSessionUse_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "ServiceSessionPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServiceSessionUse" ADD CONSTRAINT "ServiceSessionUse_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ServiceSessionUse" ADD CONSTRAINT "ServiceSessionUse_appliedById_fkey" FOREIGN KEY ("appliedById") REFERENCES "InternalUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
