-- AlterTable
ALTER TABLE "MaangLead"
ADD COLUMN "country" TEXT NOT NULL DEFAULT 'Unknown';

-- CreateIndex
CREATE INDEX "MaangLead_country_createdAt_idx" ON "MaangLead"("country", "createdAt");
