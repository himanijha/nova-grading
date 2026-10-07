-- CreateTable
CREATE TABLE "DeliberationVerdict" (
    "id" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "verdict" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliberationVerdict_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeliberationVerdict_applicantId_key" ON "DeliberationVerdict"("applicantId");

-- CreateIndex
CREATE INDEX "DeliberationVerdict_position_idx" ON "DeliberationVerdict"("position");

-- AddForeignKey
ALTER TABLE "DeliberationVerdict" ADD CONSTRAINT "DeliberationVerdict_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Applicant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliberationVerdict" ADD CONSTRAINT "DeliberationVerdict_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "Grader"("id") ON DELETE SET NULL ON UPDATE CASCADE;
