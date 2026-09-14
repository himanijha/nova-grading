-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Grader" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "mustReset" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Grader_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "graderId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Applicant" (
    "id" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "uclaEmail" TEXT NOT NULL,
    "contactEmail" TEXT,
    "fullName" TEXT NOT NULL,
    "pronouns" TEXT,
    "gradYear" TEXT,
    "majors" TEXT,
    "minors" TEXT,
    "resumeUrl" TEXT,
    "roleRaw" TEXT,
    "roleCategory" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "qLookingForward" TEXT,
    "qInitiative" TEXT,
    "qCommunity" TEXT,
    "links" TEXT,
    "anythingElse" TEXT,
    "raw" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Applicant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Grade" (
    "id" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "graderId" TEXT NOT NULL,
    "technical" INTEGER NOT NULL,
    "thoughtfulness" INTEGER NOT NULL,
    "initiative" INTEGER NOT NULL,
    "communityFit" INTEGER NOT NULL,
    "technicalNote" TEXT,
    "thoughtfulnessNote" TEXT,
    "initiativeNote" TEXT,
    "communityFitNote" TEXT,
    "overallNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Grade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Grader_email_key" ON "Grader"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "Applicant_dedupeKey_key" ON "Applicant"("dedupeKey");

-- CreateIndex
CREATE INDEX "Applicant_roleCategory_idx" ON "Applicant"("roleCategory");

-- CreateIndex
CREATE INDEX "Grade_applicantId_idx" ON "Grade"("applicantId");

-- CreateIndex
CREATE UNIQUE INDEX "Grade_applicantId_graderId_key" ON "Grade"("applicantId", "graderId");

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_graderId_fkey" FOREIGN KEY ("graderId") REFERENCES "Grader"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Applicant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_graderId_fkey" FOREIGN KEY ("graderId") REFERENCES "Grader"("id") ON DELETE CASCADE ON UPDATE CASCADE;

