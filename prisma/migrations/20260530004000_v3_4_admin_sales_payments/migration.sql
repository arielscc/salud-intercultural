-- V3.4 administration, sales, payments and cash movements.

ALTER TYPE "InternalPermission" ADD VALUE IF NOT EXISTS 'sales_read';
ALTER TYPE "InternalPermission" ADD VALUE IF NOT EXISTS 'sales_write';
ALTER TYPE "InternalPermission" ADD VALUE IF NOT EXISTS 'payments_write';

CREATE TYPE "SaleStatus" AS ENUM ('pending', 'partial', 'paid', 'cancelled');
CREATE TYPE "SaleItemType" AS ENUM ('treatment', 'medication', 'resonance', 'serum', 'service', 'study', 'product', 'other');
CREATE TYPE "CashMovementType" AS ENUM ('income', 'expense', 'adjustment');

CREATE TABLE "Sale" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "visitId" TEXT,
  "workItemId" TEXT,
  "createdById" TEXT,
  "status" "SaleStatus" NOT NULL DEFAULT 'pending',
  "subtotalCents" INTEGER NOT NULL DEFAULT 0,
  "discountCents" INTEGER NOT NULL DEFAULT 0,
  "totalCents" INTEGER NOT NULL DEFAULT 0,
  "paidCents" INTEGER NOT NULL DEFAULT 0,
  "balanceCents" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SaleItem" (
  "id" TEXT NOT NULL,
  "saleId" TEXT NOT NULL,
  "type" "SaleItemType" NOT NULL DEFAULT 'other',
  "description" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "unitPriceCents" INTEGER NOT NULL,
  "totalCents" INTEGER NOT NULL,
  "delivered" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SaleItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentMethod" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Payment" (
  "id" TEXT NOT NULL,
  "saleId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "visitId" TEXT,
  "methodId" TEXT NOT NULL,
  "receivedById" TEXT,
  "amountCents" INTEGER NOT NULL,
  "reference" TEXT,
  "notes" TEXT,
  "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DeliveredProduct" (
  "id" TEXT NOT NULL,
  "saleId" TEXT NOT NULL,
  "saleItemId" TEXT,
  "patientId" TEXT NOT NULL,
  "visitId" TEXT,
  "description" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "deliveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DeliveredProduct_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CashMovement" (
  "id" TEXT NOT NULL,
  "saleId" TEXT,
  "paymentId" TEXT,
  "patientId" TEXT,
  "visitId" TEXT,
  "userId" TEXT,
  "type" "CashMovementType" NOT NULL DEFAULT 'income',
  "amountCents" INTEGER NOT NULL,
  "description" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CashMovement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentMethod_code_key" ON "PaymentMethod"("code");
CREATE INDEX "Sale_patientId_idx" ON "Sale"("patientId");
CREATE INDEX "Sale_visitId_idx" ON "Sale"("visitId");
CREATE INDEX "Sale_workItemId_idx" ON "Sale"("workItemId");
CREATE INDEX "Sale_createdById_idx" ON "Sale"("createdById");
CREATE INDEX "Sale_status_createdAt_idx" ON "Sale"("status", "createdAt");
CREATE INDEX "Sale_createdAt_idx" ON "Sale"("createdAt");
CREATE INDEX "SaleItem_saleId_idx" ON "SaleItem"("saleId");
CREATE INDEX "SaleItem_type_idx" ON "SaleItem"("type");
CREATE INDEX "Payment_saleId_idx" ON "Payment"("saleId");
CREATE INDEX "Payment_patientId_idx" ON "Payment"("patientId");
CREATE INDEX "Payment_visitId_idx" ON "Payment"("visitId");
CREATE INDEX "Payment_methodId_idx" ON "Payment"("methodId");
CREATE INDEX "Payment_receivedById_idx" ON "Payment"("receivedById");
CREATE INDEX "Payment_paidAt_idx" ON "Payment"("paidAt");
CREATE INDEX "DeliveredProduct_saleId_idx" ON "DeliveredProduct"("saleId");
CREATE INDEX "DeliveredProduct_saleItemId_idx" ON "DeliveredProduct"("saleItemId");
CREATE INDEX "DeliveredProduct_patientId_idx" ON "DeliveredProduct"("patientId");
CREATE INDEX "DeliveredProduct_visitId_idx" ON "DeliveredProduct"("visitId");
CREATE INDEX "DeliveredProduct_deliveredAt_idx" ON "DeliveredProduct"("deliveredAt");
CREATE INDEX "CashMovement_saleId_idx" ON "CashMovement"("saleId");
CREATE INDEX "CashMovement_paymentId_idx" ON "CashMovement"("paymentId");
CREATE INDEX "CashMovement_patientId_idx" ON "CashMovement"("patientId");
CREATE INDEX "CashMovement_visitId_idx" ON "CashMovement"("visitId");
CREATE INDEX "CashMovement_userId_idx" ON "CashMovement"("userId");
CREATE INDEX "CashMovement_type_occurredAt_idx" ON "CashMovement"("type", "occurredAt");

ALTER TABLE "Sale" ADD CONSTRAINT "Sale_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_workItemId_fkey" FOREIGN KEY ("workItemId") REFERENCES "VisitWorkItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "InternalUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_methodId_fkey" FOREIGN KEY ("methodId") REFERENCES "PaymentMethod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "InternalUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DeliveredProduct" ADD CONSTRAINT "DeliveredProduct_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeliveredProduct" ADD CONSTRAINT "DeliveredProduct_saleItemId_fkey" FOREIGN KEY ("saleItemId") REFERENCES "SaleItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DeliveredProduct" ADD CONSTRAINT "DeliveredProduct_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DeliveredProduct" ADD CONSTRAINT "DeliveredProduct_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "InternalUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "PaymentMethod" ("id", "code", "name", "active", "createdAt") VALUES
  ('pay_cash', 'cash', 'Efectivo', true, CURRENT_TIMESTAMP),
  ('pay_qr', 'qr', 'QR', true, CURRENT_TIMESTAMP),
  ('pay_card', 'card', 'Tarjeta', true, CURRENT_TIMESTAMP),
  ('pay_transfer', 'transfer', 'Transferencia', true, CURRENT_TIMESTAMP),
  ('pay_other', 'other', 'Otro', true, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;
