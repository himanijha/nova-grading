import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentGrader } from "@/lib/auth";
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_LABEL } from "@/lib/upload";
import { RESUME_TYPES } from "@/lib/resumes";

export const runtime = "nodejs";

// One resume per request: the browser unzips the Drive export and sends the
// files one at a time, since the whole zip is far over the platform body limit.
export async function POST(req) {
  const grader = await getCurrentGrader();
  if (!grader) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!grader.isAdmin)
    return NextResponse.json({ error: "Only admins can upload resumes." }, { status: 403 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Expected a file upload." }, { status: 400 });

  const applicantId = form.get("applicantId");
  const file = form.get("file");

  if (typeof applicantId !== "string" || !applicantId) {
    return NextResponse.json({ error: "Missing applicant." }, { status: 400 });
  }
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No file received." }, { status: 400 });
  }
  if (!Object.values(RESUME_TYPES).includes(file.type)) {
    return NextResponse.json(
      { error: `${file.type || "That file"} is not a resume format we can store.` },
      { status: 400 }
    );
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `File is ${(file.size / 1024 / 1024).toFixed(1)}MB; the limit is ${MAX_UPLOAD_LABEL}.` },
      { status: 413 }
    );
  }

  const applicant = await prisma.applicant.findUnique({ where: { id: applicantId } });
  if (!applicant) return NextResponse.json({ error: "Applicant not found." }, { status: 404 });

  const data = Buffer.from(await file.arrayBuffer());
  const fields = {
    data,
    mimeType: file.type,
    fileName: (file.name || "resume").slice(0, 255),
    byteSize: data.length,
    uploadedById: grader.id,
  };

  // One resume per applicant: a second upload replaces the first.
  await prisma.applicantResume.upsert({
    where: { applicantId },
    create: { applicantId, ...fields },
    update: fields,
  });

  return NextResponse.json({ ok: true, byteSize: data.length });
}
