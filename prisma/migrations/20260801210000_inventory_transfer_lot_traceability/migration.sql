-- Cada porción de un traslado conserva el lote físico de origen y el nuevo
-- registro del mismo lote en la sucursal destino. La fecha de vencimiento y el
-- costo se copian del lote de origen; nunca se inventan al recibir el traslado.
CREATE TABLE "InventoryTransferLotAllocation" (
    "id" TEXT NOT NULL,
    "transferId" TEXT NOT NULL,
    "sourceLotId" TEXT NOT NULL,
    "destinationLotId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryTransferLotAllocation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "InventoryTransferLotAllocation_quantity_check" CHECK ("quantity" > 0)
);

CREATE UNIQUE INDEX "InventoryTransferLotAllocation_destinationLotId_key"
  ON "InventoryTransferLotAllocation"("destinationLotId");
CREATE UNIQUE INDEX "InventoryTransferLotAllocation_transferId_sourceLotId_key"
  ON "InventoryTransferLotAllocation"("transferId", "sourceLotId");
CREATE INDEX "InventoryTransferLotAllocation_sourceLotId_createdAt_idx"
  ON "InventoryTransferLotAllocation"("sourceLotId", "createdAt");
CREATE INDEX "InventoryTransferLotAllocation_transferId_idx"
  ON "InventoryTransferLotAllocation"("transferId");

ALTER TABLE "InventoryTransferLotAllocation"
  ADD CONSTRAINT "InventoryTransferLotAllocation_transferId_fkey"
  FOREIGN KEY ("transferId") REFERENCES "InventoryTransfer"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryTransferLotAllocation"
  ADD CONSTRAINT "InventoryTransferLotAllocation_sourceLotId_fkey"
  FOREIGN KEY ("sourceLotId") REFERENCES "InventoryLot"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryTransferLotAllocation"
  ADD CONSTRAINT "InventoryTransferLotAllocation_destinationLotId_fkey"
  FOREIGN KEY ("destinationLotId") REFERENCES "InventoryLot"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TRIGGER "InventoryTransferLotAllocation_append_only"
BEFORE UPDATE OR DELETE ON "InventoryTransferLotAllocation"
FOR EACH ROW EXECUTE FUNCTION "prevent_purchase_evidence_mutation"();
