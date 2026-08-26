ALTER TYPE "InternalPermission" ADD VALUE IF NOT EXISTS 'users_manage';

ALTER TABLE "InternalUser"
ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "passwordChangedAt" TIMESTAMP(3);

ALTER TABLE "InternalSession"
ADD COLUMN "deviceLabel" TEXT;
