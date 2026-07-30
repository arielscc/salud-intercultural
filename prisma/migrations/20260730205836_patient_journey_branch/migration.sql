-- AlterTable
ALTER TABLE "Visit" ADD COLUMN     "branchCode" TEXT NOT NULL DEFAULT 'el-alto';

-- CreateIndex
CREATE INDEX "Visit_branchCode_checkedInAt_idx" ON "Visit"("branchCode", "checkedInAt");
