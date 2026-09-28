import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentGrader } from "@/lib/auth";

export const runtime = "nodejs";

/** Serves a resume inline so the grading page can embed it. Signed-in only. */
export async function GET(_req, { params }) {
  const grader = await getCurrentGrader();
  if (!grader) return new NextResponse("Not signed in.", { status: 401 });

  const { applicantId } = await params;
  const resume = await prisma.applicantResume.findUnique({
    where: { applicantId },
    select: { data: true, mimeType: true, fileName: true, updatedAt: true },
  });
  if (!resume) return new NextResponse("No resume.", { status: 404 });

  const safeName = resume.fileName.replace(/[^\w.\- ]+/g, "_");
  return new NextResponse(Buffer.from(resume.data), {
    headers: {
      "Content-Type": resume.mimeType,
      "Content-Disposition": `inline; filename="${safeName}"`,
      "X-Content-Type-Options": "nosniff",
      // Private, like the mugshots. The URL carries ?v= on change.
      "Cache-Control": "private, max-age=300",
      "Last-Modified": resume.updatedAt.toUTCString(),
    },
  });
}
