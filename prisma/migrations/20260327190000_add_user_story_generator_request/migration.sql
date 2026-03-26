CREATE TABLE IF NOT EXISTS "UserStoryGeneratorRequest" (
    "id" TEXT NOT NULL,
    "visitorHash" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "fingerprintHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserStoryGeneratorRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "UserStoryGeneratorRequest_visitorHash_createdAt_idx"
ON "UserStoryGeneratorRequest"("visitorHash", "createdAt");

CREATE INDEX IF NOT EXISTS "UserStoryGeneratorRequest_createdAt_idx"
ON "UserStoryGeneratorRequest"("createdAt");
