-- CreateTable
CREATE TABLE "ResumeUploadPart" (
    "uploadId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "applicantId" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResumeUploadPart_pkey" PRIMARY KEY ("uploadId","index")
);
