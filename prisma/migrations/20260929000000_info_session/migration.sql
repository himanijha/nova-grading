-- CreateTable
CREATE TABLE "InfoSessionAttendee" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "note" TEXT,
    "autoAccept" BOOLEAN NOT NULL DEFAULT false,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InfoSessionAttendee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InfoSessionAttendee_email_key" ON "InfoSessionAttendee"("email");

-- AddForeignKey
ALTER TABLE "InfoSessionAttendee" ADD CONSTRAINT "InfoSessionAttendee_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "Grader"("id") ON DELETE SET NULL ON UPDATE CASCADE;
