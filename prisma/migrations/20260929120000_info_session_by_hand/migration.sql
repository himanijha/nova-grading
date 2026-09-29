-- AlterTable
ALTER TABLE "InfoSessionAttendee" ALTER COLUMN "email" DROP NOT NULL,
ADD COLUMN     "onSheet" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "addedById" TEXT;

-- Everyone already on the list came from a sign-in sheet.
UPDATE "InfoSessionAttendee" SET "onSheet" = true;

-- AddForeignKey
ALTER TABLE "InfoSessionAttendee" ADD CONSTRAINT "InfoSessionAttendee_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "Grader"("id") ON DELETE SET NULL ON UPDATE CASCADE;
