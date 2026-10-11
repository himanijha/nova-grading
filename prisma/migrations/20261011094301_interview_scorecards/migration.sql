/*
  Warnings:

  - You are about to drop the column `generalNotes` on the `InterviewReport` table. All the data in the column will be lost.
  - You are about to drop the column `rubricJson` on the `InterviewReport` table. All the data in the column will be lost.
  - You are about to drop the column `verdict` on the `InterviewReport` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "InterviewReport" DROP COLUMN "generalNotes",
DROP COLUMN "rubricJson",
DROP COLUMN "verdict";

-- CreateTable
CREATE TABLE "InterviewScorecard" (
    "id" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "graderId" TEXT NOT NULL,
    "rubricJson" TEXT NOT NULL DEFAULT '{}',
    "verdict" TEXT,
    "generalNotes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewScorecard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InterviewScorecard_slotId_graderId_key" ON "InterviewScorecard"("slotId", "graderId");

-- AddForeignKey
ALTER TABLE "InterviewScorecard" ADD CONSTRAINT "InterviewScorecard_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "InterviewSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewScorecard" ADD CONSTRAINT "InterviewScorecard_graderId_fkey" FOREIGN KEY ("graderId") REFERENCES "Grader"("id") ON DELETE CASCADE ON UPDATE CASCADE;
