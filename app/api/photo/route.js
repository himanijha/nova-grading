import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentGrader } from "@/lib/auth";
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_LABEL } from "@/lib/upload";

export const runtime = "nodejs";

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic"];

export async function POST(req) {
  const grader = await getCurrentGrader();
  if (!grader) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Expected a file upload." }, { status: 400 });

  const applicantId = form.get("applicantId");
  const file = form.get("file");

  if (typeof applicantId !== "string" || !applicantId) {
    return NextResponse.json({ error: "Pick an applicant first." }, { status: 400 });
  }
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No image received." }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json(
      { error: `${file.type || "That file"} is not an image we can store.` },
      { status: 400 }
    );
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      {
        error: `Image is ${(file.size / 1024 / 1024).toFixed(1)}MB; the limit is ${MAX_UPLOAD_LABEL}.`,
      },
      { status: 413 }
    );
  }

  const applicant = await prisma.applicant.findUnique({ where: { id: applicantId } });
  if (!applicant) return NextResponse.json({ error: "Applicant not found." }, { status: 404 });

  const data = Buffer.from(await file.arrayBuffer());
  const fields = {
    data,
    mimeType: file.type,
    byteSize: data.length,
    uploadedById: grader.id,
  };

  // One photo per applicant: a second upload replaces the first.
  await prisma.applicantPhoto.upsert({
    where: { applicantId },
    create: { applicantId, ...fields },
    update: fields,
  });

  return NextResponse.json({ ok: true, byteSize: data.length });
}

export async function DELETE(req) {
  const grader = await getCurrentGrader();
  if (!grader) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { applicantId } = await req.json().catch(() => ({}));
  if (!applicantId) return NextResponse.json({ error: "Missing applicant." }, { status: 400 });

  await prisma.applicantPhoto.deleteMany({ where: { applicantId } });
  return NextResponse.json({ ok: true });
}
