-- Enlaza cada línea de receta con el medicamento del inventario (opcional; se
-- permite receta de texto libre para lo que no está en inventario).
ALTER TABLE "PrescriptionItem" ADD COLUMN "inventoryItemId" TEXT;

ALTER TABLE "PrescriptionItem"
  ADD CONSTRAINT "PrescriptionItem_inventoryItemId_fkey"
  FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "PrescriptionItem_inventoryItemId_idx" ON "PrescriptionItem"("inventoryItemId");
