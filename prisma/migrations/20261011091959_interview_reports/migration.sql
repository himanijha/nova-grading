-- CreateTable
CREATE TABLE "InterviewReport" (
    "id" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "track" TEXT,
    "notesJson" TEXT NOT NULL DEFAULT '{}',
    "verdict" TEXT,
    "generalNotes" TEXT,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InterviewReport_slotId_key" ON "InterviewReport"("slotId");

-- AddForeignKey
ALTER TABLE "InterviewReport" ADD CONSTRAINT "InterviewReport_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "InterviewSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewReport" ADD CONSTRAINT "InterviewReport_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "Grader"("id") ON DELETE SET NULL ON UPDATE CASCADE;
