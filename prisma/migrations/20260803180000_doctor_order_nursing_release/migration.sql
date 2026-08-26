-- Tarea 4 (dashboard del médico): suero y servicio con pago previo antes de
-- Enfermería. Marca las ofertas que se ejecutan en Enfermería y registra la
-- derivación posterior al pago. Migración aditiva.

-- AlterTable: ofertas ejecutadas en Enfermería
ALTER TABLE "ServiceCatalogItem" ADD COLUMN "requiresNursing" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ServiceCatalogItemVersion" ADD COLUMN "requiresNursing" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: snapshot por línea del pedido
ALTER TABLE "DoctorOrderLine" ADD COLUMN "requiresNursing" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: derivación a Enfermería después del pago
ALTER TABLE "DoctorOrder" ADD COLUMN "nursingReleasedAt" TIMESTAMP(3);
ALTER TABLE "DoctorOrder" ADD COLUMN "nursingWorkItemId" TEXT;
