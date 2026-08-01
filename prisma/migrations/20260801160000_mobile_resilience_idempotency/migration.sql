-- Las claves son opcionales para conservar registros históricos. Toda nueva
-- operación crítica creada por la interfaz las envía como UUID.
ALTER TABLE "Visit" ADD COLUMN "idempotencyKey" TEXT;
ALTER TABLE "Sale" ADD COLUMN "idempotencyKey" TEXT;
ALTER TABLE "Payment" ADD COLUMN "idempotencyKey" TEXT;
ALTER TABLE "InventoryMovement" ADD COLUMN "idempotencyKey" TEXT;

CREATE UNIQUE INDEX "Visit_idempotencyKey_key"
ON "Visit"("idempotencyKey");

CREATE UNIQUE INDEX "Sale_idempotencyKey_key"
ON "Sale"("idempotencyKey");

CREATE UNIQUE INDEX "Payment_idempotencyKey_key"
ON "Payment"("idempotencyKey");

CREATE UNIQUE INDEX "InventoryMovement_idempotencyKey_key"
ON "InventoryMovement"("idempotencyKey");
