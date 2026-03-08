-- AlterTable
ALTER TABLE "MaangLead"
ADD COLUMN "ipHash" TEXT,
ADD COLUMN "userAgent" TEXT;

-- CreateIndex
CREATE INDEX "MaangLead_phone_createdAt_idx" ON "MaangLead"("phone", "createdAt");

-- CreateIndex
CREATE INDEX "MaangLead_ipHash_createdAt_idx" ON "MaangLead"("ipHash", "createdAt");
