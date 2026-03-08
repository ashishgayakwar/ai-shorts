-- CreateTable
CREATE TABLE "MaangLead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "source" TEXT DEFAULT 'maang_interview_series',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaangLead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MaangLead_email_createdAt_idx" ON "MaangLead"("email", "createdAt");

-- CreateIndex
CREATE INDEX "MaangLead_createdAt_idx" ON "MaangLead"("createdAt");
