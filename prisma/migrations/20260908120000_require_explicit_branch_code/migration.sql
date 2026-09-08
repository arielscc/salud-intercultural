-- La sucursal debe provenir siempre del contexto operativo activo. Al quitar
-- estos defaults, una escritura incompleta falla en vez de caer silenciosamente
-- en El Alto.
ALTER TABLE "Visit" ALTER COLUMN "branchCode" DROP DEFAULT;
ALTER TABLE "Sale" ALTER COLUMN "branchCode" DROP DEFAULT;
ALTER TABLE "Payment" ALTER COLUMN "branchCode" DROP DEFAULT;
ALTER TABLE "CashMovement" ALTER COLUMN "branchCode" DROP DEFAULT;
ALTER TABLE "PurchasePayment" ALTER COLUMN "branchCode" DROP DEFAULT;
ALTER TABLE "InventoryMovement" ALTER COLUMN "branchCode" DROP DEFAULT;
ALTER TABLE "InventoryAdjustment" ALTER COLUMN "branchCode" DROP DEFAULT;
