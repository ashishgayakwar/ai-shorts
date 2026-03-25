-- CreateTable
CREATE TABLE "ResumeScreenerRequest" (
    "id" TEXT NOT NULL,
    "visitorHash" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "fingerprintHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResumeScreenerRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResumeScreenerRequest_visitorHash_createdAt_idx" ON "ResumeScreenerRequest"("visitorHash", "createdAt");

-- CreateIndex
CREATE INDEX "ResumeScreenerRequest_createdAt_idx" ON "ResumeScreenerRequest"("createdAt");
