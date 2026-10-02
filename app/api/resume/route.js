import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentGrader } from "@/lib/auth";
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_LABEL, MAX_RESUME_BYTES, MAX_RESUME_LABEL } from "@/lib/upload";
import { RESUME_TYPES } from "@/lib/resumes";

export const runtime = "nodejs";

// One resume per request: the browser unzips the Drive export and sends the
// files one at a time, since the whole zip is far over the platform body limit.
// A resume that is itself over the limit comes in pieces: each carries the same
// uploadId with its part number and the total, and the last one saves it.
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

  let data = Buffer.from(await file.arrayBuffer());

  const parts = Number(form.get("parts") || 1);
  if (parts > 1) {
    const uploadId = form.get("uploadId");
    const index = Number(form.get("part"));
    if (typeof uploadId !== "string" || !/^[\w-]{8,64}$/.test(uploadId)) {
      return NextResponse.json({ error: "Missing upload id." }, { status: 400 });
    }
    if (!Number.isInteger(parts) || parts * MAX_UPLOAD_BYTES > MAX_RESUME_BYTES + MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: `Resumes are limited to ${MAX_RESUME_LABEL}.` }, { status: 413 });
    }
    if (!Number.isInteger(index) || index < 0 || index >= parts) {
      return NextResponse.json({ error: "Bad part number." }, { status: 400 });
    }

    if (index === 0) {
      // Pieces of uploads that never finished are not worth keeping past a day.
      await prisma.resumeUploadPart.deleteMany({
        where: { createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      });
    }
    await prisma.resumeUploadPart.upsert({
      where: { uploadId_index: { uploadId, index } },
      create: { uploadId, index, applicantId, data },
      update: { applicantId, data },
    });
    if (index < parts - 1) return NextResponse.json({ ok: true, part: index });

    const stored = await prisma.resumeUploadPart.findMany({
      where: { uploadId, applicantId },
      orderBy: { index: "asc" },
    });
    await prisma.resumeUploadPart.deleteMany({ where: { uploadId } });
    if (stored.length !== parts || stored.some((p, i) => p.index !== i)) {
      return NextResponse.json({ error: "Some pieces of the upload went missing. Try again." }, { status: 400 });
    }
    data = Buffer.concat(stored.map((p) => Buffer.from(p.data)));
    if (data.length > MAX_RESUME_BYTES) {
      return NextResponse.json(
        { error: `File is ${(data.length / 1024 / 1024).toFixed(1)}MB; the limit is ${MAX_RESUME_LABEL}.` },
        { status: 413 }
      );
    }
  }

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
