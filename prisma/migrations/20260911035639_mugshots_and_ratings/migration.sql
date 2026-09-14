-- CreateTable
CREATE TABLE "ApplicantPhoto" (
    "id" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "mimeType" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "uploadedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicantPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rating" (
    "id" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "graderId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApplicantPhoto_applicantId_key" ON "ApplicantPhoto"("applicantId");

-- CreateIndex
CREATE INDEX "Rating_applicantId_idx" ON "Rating"("applicantId");

-- CreateIndex
CREATE UNIQUE INDEX "Rating_applicantId_graderId_key" ON "Rating"("applicantId", "graderId");

-- AddForeignKey
ALTER TABLE "ApplicantPhoto" ADD CONSTRAINT "ApplicantPhoto_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Applicant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicantPhoto" ADD CONSTRAINT "ApplicantPhoto_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "Grader"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Applicant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_graderId_fkey" FOREIGN KEY ("graderId") REFERENCES "Grader"("id") ON DELETE CASCADE ON UPDATE CASCADE;
