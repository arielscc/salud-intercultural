/*
  Warnings:

  - A unique constraint covering the columns `[idempotencyKey]` on the table `CashMovement` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "CashChannel" AS ENUM ('cash', 'qr', 'card', 'transfer', 'other');

-- CreateEnum
CREATE TYPE "CashSessionStatus" AS ENUM ('open', 'pending_approval', 'closed');

-- CreateEnum
CREATE TYPE "CashShift" AS ENUM ('morning', 'afternoon', 'full_day', 'other');

-- CreateEnum
CREATE TYPE "CashExpenseKind" AS ENUM ('staff_support', 'urgent_purchase', 'other');

-- CreateEnum
CREATE TYPE "CashExpenseCategory" AS ENUM ('lunch', 'transport', 'staff_other', 'injectables', 'clinical_material', 'cleaning', 'office', 'other');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CashMovementType" ADD VALUE 'refund';
ALTER TYPE "CashMovementType" ADD VALUE 'reversal';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "InternalPermission" ADD VALUE 'cash_sessions_read';
ALTER TYPE "InternalPermission" ADD VALUE 'cash_sessions_open';
ALTER TYPE "InternalPermission" ADD VALUE 'cash_movements_create';
ALTER TYPE "InternalPermission" ADD VALUE 'cash_movements_reverse';
ALTER TYPE "InternalPermission" ADD VALUE 'cash_sessions_close';
ALTER TYPE "InternalPermission" ADD VALUE 'cash_sessions_approve';

-- AlterTable
ALTER TABLE "CashMovement" ADD COLUMN     "authorizedById" TEXT,
ADD COLUMN     "cashSessionId" TEXT,
ADD COLUMN     "channel" "CashChannel" NOT NULL DEFAULT 'cash',
ADD COLUMN     "idempotencyKey" TEXT,
ADD COLUMN     "note" TEXT,
ADD COLUMN     "originalMovementId" TEXT,
ADD COLUMN     "reason" TEXT;

-- CreateTable
CREATE TABLE "CashSession" (
    "id" TEXT NOT NULL,
    "branchCode" TEXT NOT NULL,
    "registerName" TEXT NOT NULL,
    "businessDate" DATE NOT NULL,
    "shift" "CashShift" NOT NULL DEFAULT 'full_day',
    "responsibleId" TEXT NOT NULL,
    "openedById" TEXT NOT NULL,
    "closeRequestedById" TEXT,
    "approvedById" TEXT,
    "closedById" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "status" "CashSessionStatus" NOT NULL DEFAULT 'open',
    "openingCashCents" INTEGER NOT NULL,
    "expectedCashCents" INTEGER,
    "countedCashCents" INTEGER,
    "differenceCents" INTEGER,
    "closeObservation" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closeRequestedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashSessionReconciliation" (
    "id" TEXT NOT NULL,
    "cashSessionId" TEXT NOT NULL,
    "channel" "CashChannel" NOT NULL,
    "expectedCents" INTEGER NOT NULL,
    "reportedCents" INTEGER NOT NULL,
    "differenceCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashSessionReconciliation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashExpense" (
    "id" TEXT NOT NULL,
    "cashSessionId" TEXT NOT NULL,
    "movementId" TEXT NOT NULL,
    "registeredById" TEXT NOT NULL,
    "deliveredById" TEXT NOT NULL,
    "authorizedById" TEXT NOT NULL,
    "requestedById" TEXT,
    "receivedById" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "kind" "CashExpenseKind" NOT NULL,
    "category" "CashExpenseCategory" NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "note" TEXT,
    "itemDescription" TEXT,
    "quantity" INTEGER,
    "unitPriceCents" INTEGER,
    "supplierName" TEXT,
    "urgencyReason" TEXT,
    "requiresInventoryEntry" BOOLEAN NOT NULL DEFAULT false,
    "receiptStorageKey" TEXT,
    "receiptStorageDriver" "ClinicalAttachmentStorageDriver",
    "receiptOriginalName" TEXT,
    "receiptMimeType" TEXT,
    "receiptSizeBytes" INTEGER,
    "receiptUploadedAt" TIMESTAMP(3),
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashExpenseBeneficiary" (
    "id" TEXT NOT NULL,
    "cashExpenseId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashExpenseBeneficiary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CashSession_idempotencyKey_key" ON "CashSession"("idempotencyKey");

-- CreateIndex
CREATE INDEX "CashSession_status_openedAt_idx" ON "CashSession"("status", "openedAt");

-- CreateIndex
CREATE INDEX "CashSession_branchCode_registerName_businessDate_idx" ON "CashSession"("branchCode", "registerName", "businessDate");

-- CreateIndex
CREATE INDEX "CashSession_responsibleId_idx" ON "CashSession"("responsibleId");

-- Solo puede existir una sesión operable por caja física. El estado
-- pending_approval también bloquea nuevos movimientos hasta que Dirección cierre.
CREATE UNIQUE INDEX "CashSession_one_operable_register_key"
ON "CashSession" ("branchCode", "registerName")
WHERE "status" IN ('open', 'pending_approval');

-- CreateIndex
CREATE INDEX "CashSessionReconciliation_channel_createdAt_idx" ON "CashSessionReconciliation"("channel", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CashSessionReconciliation_cashSessionId_channel_key" ON "CashSessionReconciliation"("cashSessionId", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "CashExpense_movementId_key" ON "CashExpense"("movementId");

-- CreateIndex
CREATE UNIQUE INDEX "CashExpense_idempotencyKey_key" ON "CashExpense"("idempotencyKey");

-- CreateIndex
CREATE INDEX "CashExpense_cashSessionId_occurredAt_idx" ON "CashExpense"("cashSessionId", "occurredAt");

-- CreateIndex
CREATE INDEX "CashExpense_kind_category_occurredAt_idx" ON "CashExpense"("kind", "category", "occurredAt");

-- CreateIndex
CREATE INDEX "CashExpense_registeredById_idx" ON "CashExpense"("registeredById");

-- CreateIndex
CREATE INDEX "CashExpense_authorizedById_idx" ON "CashExpense"("authorizedById");

-- CreateIndex
CREATE INDEX "CashExpenseBeneficiary_cashExpenseId_idx" ON "CashExpenseBeneficiary"("cashExpenseId");

-- CreateIndex
CREATE INDEX "CashExpenseBeneficiary_employeeId_createdAt_idx" ON "CashExpenseBeneficiary"("employeeId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CashMovement_idempotencyKey_key" ON "CashMovement"("idempotencyKey");

-- CreateIndex
CREATE INDEX "CashMovement_cashSessionId_occurredAt_idx" ON "CashMovement"("cashSessionId", "occurredAt");

-- CreateIndex
CREATE INDEX "CashMovement_authorizedById_idx" ON "CashMovement"("authorizedById");

-- CreateIndex
CREATE INDEX "CashMovement_originalMovementId_idx" ON "CashMovement"("originalMovementId");

-- AddForeignKey
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_cashSessionId_fkey" FOREIGN KEY ("cashSessionId") REFERENCES "CashSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_authorizedById_fkey" FOREIGN KEY ("authorizedById") REFERENCES "InternalUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_originalMovementId_fkey" FOREIGN KEY ("originalMovementId") REFERENCES "CashMovement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashSession" ADD CONSTRAINT "CashSession_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "InternalUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashSession" ADD CONSTRAINT "CashSession_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "InternalUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashSession" ADD CONSTRAINT "CashSession_closeRequestedById_fkey" FOREIGN KEY ("closeRequestedById") REFERENCES "InternalUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashSession" ADD CONSTRAINT "CashSession_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "InternalUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashSession" ADD CONSTRAINT "CashSession_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "InternalUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashSessionReconciliation" ADD CONSTRAINT "CashSessionReconciliation_cashSessionId_fkey" FOREIGN KEY ("cashSessionId") REFERENCES "CashSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashExpense" ADD CONSTRAINT "CashExpense_cashSessionId_fkey" FOREIGN KEY ("cashSessionId") REFERENCES "CashSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashExpense" ADD CONSTRAINT "CashExpense_movementId_fkey" FOREIGN KEY ("movementId") REFERENCES "CashMovement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashExpense" ADD CONSTRAINT "CashExpense_registeredById_fkey" FOREIGN KEY ("registeredById") REFERENCES "InternalUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashExpense" ADD CONSTRAINT "CashExpense_deliveredById_fkey" FOREIGN KEY ("deliveredById") REFERENCES "InternalUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashExpense" ADD CONSTRAINT "CashExpense_authorizedById_fkey" FOREIGN KEY ("authorizedById") REFERENCES "InternalUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashExpense" ADD CONSTRAINT "CashExpense_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "InternalUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashExpense" ADD CONSTRAINT "CashExpense_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "InternalUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashExpenseBeneficiary" ADD CONSTRAINT "CashExpenseBeneficiary_cashExpenseId_fkey" FOREIGN KEY ("cashExpenseId") REFERENCES "CashExpense"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashExpenseBeneficiary" ADD CONSTRAINT "CashExpenseBeneficiary_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "InternalUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Invariantes monetarias: los importes se almacenan siempre como enteros
-- positivos y el tipo de movimiento determina si suman o restan.
ALTER TABLE "CashMovement"
  ADD CONSTRAINT "CashMovement_amount_positive" CHECK ("amountCents" > 0);

ALTER TABLE "CashSession"
  ADD CONSTRAINT "CashSession_opening_non_negative" CHECK ("openingCashCents" >= 0),
  ADD CONSTRAINT "CashSession_counted_non_negative" CHECK ("countedCashCents" IS NULL OR "countedCashCents" >= 0);

ALTER TABLE "CashSessionReconciliation"
  ADD CONSTRAINT "CashSessionReconciliation_reported_non_negative" CHECK ("reportedCents" >= 0),
  ADD CONSTRAINT "CashSessionReconciliation_difference_exact" CHECK ("differenceCents" = "reportedCents" - "expectedCents");

ALTER TABLE "CashExpense"
  ADD CONSTRAINT "CashExpense_total_positive" CHECK ("totalCents" > 0),
  ADD CONSTRAINT "CashExpense_quantity_positive" CHECK ("quantity" IS NULL OR "quantity" > 0),
  ADD CONSTRAINT "CashExpense_unit_price_positive" CHECK ("unitPriceCents" IS NULL OR "unitPriceCents" > 0);

ALTER TABLE "CashExpenseBeneficiary"
  ADD CONSTRAINT "CashExpenseBeneficiary_amount_positive" CHECK ("amountCents" > 0);

-- Una operación nueva solo puede incorporarse mientras la sesión está abierta.
-- El bloqueo de fila usado por la aplicación evita carreras contra el cierre;
-- este trigger agrega una segunda barrera para inserciones directas.
CREATE OR REPLACE FUNCTION "ensure_cash_session_open"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."cashSessionId" IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM "CashSession"
    WHERE "id" = NEW."cashSessionId"
      AND "status" = 'open'
  ) THEN
    RAISE EXCEPTION 'cash session is not open'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "CashMovement_requires_open_session"
BEFORE INSERT ON "CashMovement"
FOR EACH ROW EXECUTE FUNCTION "ensure_cash_session_open"();

CREATE TRIGGER "CashExpense_requires_open_session"
BEFORE INSERT ON "CashExpense"
FOR EACH ROW EXECUTE FUNCTION "ensure_cash_session_open"();

-- Caja conserva su evidencia. Las correcciones y devoluciones se registran con
-- movimientos compensatorios; ninguna fila monetaria puede borrarse.
CREATE OR REPLACE FUNCTION "prevent_cash_history_delete"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'cash history is append-only; DELETE is not allowed'
    USING ERRCODE = 'integrity_constraint_violation';
END;
$$;

CREATE TRIGGER "CashMovement_prevent_delete"
BEFORE DELETE ON "CashMovement"
FOR EACH ROW EXECUTE FUNCTION "prevent_cash_history_delete"();

CREATE TRIGGER "CashExpense_prevent_delete"
BEFORE DELETE ON "CashExpense"
FOR EACH ROW EXECUTE FUNCTION "prevent_cash_history_delete"();

CREATE TRIGGER "CashExpenseBeneficiary_prevent_delete"
BEFORE DELETE ON "CashExpenseBeneficiary"
FOR EACH ROW EXECUTE FUNCTION "prevent_cash_history_delete"();

CREATE TRIGGER "CashSessionReconciliation_prevent_delete"
BEFORE DELETE ON "CashSessionReconciliation"
FOR EACH ROW EXECUTE FUNCTION "prevent_cash_history_delete"();
