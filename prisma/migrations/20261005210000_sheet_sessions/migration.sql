-- AlterTable
ALTER TABLE "Cohort" ADD COLUMN     "location" TEXT,
ADD COLUMN     "sheetCol" INTEGER;

-- CreateTable
CREATE TABLE "Signup" (
    "id" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Signup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NameMatch" (
    "name" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,

    CONSTRAINT "NameMatch_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "EventSheet" (
    "id" TEXT NOT NULL DEFAULT 'main',
    "url" TEXT NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventSheet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Signup_cohortId_idx" ON "Signup"("cohortId");

-- CreateIndex
CREATE UNIQUE INDEX "Cohort_sheetCol_key" ON "Cohort"("sheetCol");

-- AddForeignKey
ALTER TABLE "Signup" ADD CONSTRAINT "Signup_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NameMatch" ADD CONSTRAINT "NameMatch_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Applicant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

