-- AlterTable
ALTER TABLE "DeliberationVerdict" ADD COLUMN "passedToInterview" BOOLEAN NOT NULL DEFAULT false;

-- Strong accepts and yeses pass on their own, including any given before this column existed.
UPDATE "DeliberationVerdict" SET "passedToInterview" = true WHERE "verdict" IN ('STRONG_ACCEPT', 'YES');
