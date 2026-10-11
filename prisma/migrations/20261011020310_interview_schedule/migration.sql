-- CreateTable
CREATE TABLE "InterviewSheet" (
    "id" TEXT NOT NULL DEFAULT 'main',
    "url" TEXT NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterviewSheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewSlot" (
    "id" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "startRaw" TEXT NOT NULL,
    "endRaw" TEXT NOT NULL,
    "room" TEXT NOT NULL,
    "status" TEXT,
    "candidateRaw" TEXT,
    "candidateId" TEXT,
    "interviewer1Raw" TEXT,
    "interviewer1Id" TEXT,
    "interviewer2Raw" TEXT,
    "interviewer2Id" TEXT,
    "checkRaw" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewNote" (
    "id" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "graderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewerAlias" (
    "name" TEXT NOT NULL,
    "graderId" TEXT NOT NULL,

    CONSTRAINT "InterviewerAlias_pkey" PRIMARY KEY ("name")
);

-- CreateIndex
CREATE INDEX "InterviewSlot_candidateId_idx" ON "InterviewSlot"("candidateId");

-- CreateIndex
CREATE INDEX "InterviewSlot_interviewer1Id_idx" ON "InterviewSlot"("interviewer1Id");

-- CreateIndex
CREATE INDEX "InterviewSlot_interviewer2Id_idx" ON "InterviewSlot"("interviewer2Id");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewSlot_day_startRaw_room_key" ON "InterviewSlot"("day", "startRaw", "room");

-- CreateIndex
CREATE INDEX "InterviewNote_slotId_idx" ON "InterviewNote"("slotId");

-- CreateIndex
CREATE INDEX "InterviewNote_graderId_idx" ON "InterviewNote"("graderId");

-- AddForeignKey
ALTER TABLE "InterviewSlot" ADD CONSTRAINT "InterviewSlot_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Applicant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewSlot" ADD CONSTRAINT "InterviewSlot_interviewer1Id_fkey" FOREIGN KEY ("interviewer1Id") REFERENCES "Grader"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewSlot" ADD CONSTRAINT "InterviewSlot_interviewer2Id_fkey" FOREIGN KEY ("interviewer2Id") REFERENCES "Grader"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewNote" ADD CONSTRAINT "InterviewNote_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "InterviewSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewNote" ADD CONSTRAINT "InterviewNote_graderId_fkey" FOREIGN KEY ("graderId") REFERENCES "Grader"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewerAlias" ADD CONSTRAINT "InterviewerAlias_graderId_fkey" FOREIGN KEY ("graderId") REFERENCES "Grader"("id") ON DELETE CASCADE ON UPDATE CASCADE;
