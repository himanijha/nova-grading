-- CreateTable
CREATE TABLE "RankingCutoff" (
    "gradYear" TEXT NOT NULL,
    "cutoff" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RankingCutoff_pkey" PRIMARY KEY ("gradYear")
);
