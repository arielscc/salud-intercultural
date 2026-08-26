-- Producto inyectable/insumo aplicado en una aplicación de enfermería (descuenta stock).
ALTER TABLE "NursingApplication" ADD COLUMN "inventoryItemId" TEXT;
ALTER TABLE "NursingApplication" ADD COLUMN "quantityUnits" INTEGER;

ALTER TABLE "NursingApplication"
  ADD CONSTRAINT "NursingApplication_inventoryItemId_fkey"
  FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "NursingApplication_inventoryItemId_idx" ON "NursingApplication"("inventoryItemId");
