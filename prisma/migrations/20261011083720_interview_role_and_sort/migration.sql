-- AlterTable
ALTER TABLE "InterviewSlot" ADD COLUMN     "roleRaw" TEXT,
ADD COLUMN     "sortKey" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "InterviewSlot_sortKey_idx" ON "InterviewSlot"("sortKey");
