-- CreateTable
CREATE TABLE "InterviewDeliberationVerdict" (
    "id" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewDeliberationVerdict_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InterviewDeliberationVerdict_applicantId_key" ON "InterviewDeliberationVerdict"("applicantId");

-- CreateIndex
CREATE INDEX "InterviewDeliberationVerdict_position_idx" ON "InterviewDeliberationVerdict"("position");

-- AddForeignKey
ALTER TABLE "InterviewDeliberationVerdict" ADD CONSTRAINT "InterviewDeliberationVerdict_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Applicant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
