-- CreateTable
CREATE TABLE "ApplicantResume" (
    "id" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "uploadedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicantResume_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApplicantResume_applicantId_key" ON "ApplicantResume"("applicantId");

-- AddForeignKey
ALTER TABLE "ApplicantResume" ADD CONSTRAINT "ApplicantResume_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Applicant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicantResume" ADD CONSTRAINT "ApplicantResume_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "Grader"("id") ON DELETE SET NULL ON UPDATE CASCADE;

