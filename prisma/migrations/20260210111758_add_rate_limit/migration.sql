-- CreateTable
CREATE TABLE "RateLimit" (
    "userId" TEXT NOT NULL,
    "window10Start" TIMESTAMP(3) NOT NULL,
    "window10Count" INTEGER NOT NULL,
    "dayStart" TIMESTAMP(3) NOT NULL,
    "dayCount" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "RateLimit" ADD CONSTRAINT "RateLimit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
