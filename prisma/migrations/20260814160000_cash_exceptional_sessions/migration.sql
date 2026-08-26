ALTER TABLE "CashSession"
  ADD COLUMN "exceptional" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "exceptionalReason" TEXT;

