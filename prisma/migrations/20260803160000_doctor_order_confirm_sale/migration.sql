-- Tarea 3 (dashboard del médico): Administración confirma el pedido, valida el
-- descuento y crea la venta. Enlaza pedido ↔ venta y audita la decisión de
-- descuento. Migración aditiva: no borra historia clínica ni financiera.

-- AlterTable: decisión de descuento y enlace con la venta
ALTER TABLE "DoctorOrder" ADD COLUMN "discountApproved" BOOLEAN;
ALTER TABLE "DoctorOrder" ADD COLUMN "discountDecidedById" TEXT;
ALTER TABLE "DoctorOrder" ADD COLUMN "discountDecidedAt" TIMESTAMP(3);
ALTER TABLE "DoctorOrder" ADD COLUMN "confirmedAt" TIMESTAMP(3);

-- AlterTable: enlace de la venta con el pedido del médico
ALTER TABLE "Sale" ADD COLUMN "doctorOrderId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Sale_doctorOrderId_key" ON "Sale"("doctorOrderId");

-- AddForeignKey
ALTER TABLE "DoctorOrder" ADD CONSTRAINT "DoctorOrder_discountDecidedById_fkey" FOREIGN KEY ("discountDecidedById") REFERENCES "InternalUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_doctorOrderId_fkey" FOREIGN KEY ("doctorOrderId") REFERENCES "DoctorOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
