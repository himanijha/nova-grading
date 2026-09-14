import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentGrader } from "@/lib/auth";
import { isRating } from "@/lib/ratings";

export async function POST(req) {
  const grader = await getCurrentGrader();
  if (!grader) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { applicantId, value, note } = await req.json().catch(() => ({}));
  if (!applicantId) return NextResponse.json({ error: "Missing applicant." }, { status: 400 });

  const cleanNote = typeof note === "string" ? note.trim() || null : null;

  // A null value clears your rating rather than recording an opinion.
  if (value === null) {
    await prisma.rating.deleteMany({ where: { applicantId, graderId: grader.id } });
    return NextResponse.json({ ok: true, cleared: true });
  }

  if (!isRating(value)) {
    return NextResponse.json({ error: "Unknown rating." }, { status: 400 });
  }

  const applicant = await prisma.applicant.findUnique({ where: { id: applicantId } });
  if (!applicant) return NextResponse.json({ error: "Applicant not found." }, { status: 404 });

  const rating = await prisma.rating.upsert({
    where: { applicantId_graderId: { applicantId, graderId: grader.id } },
    create: { applicantId, graderId: grader.id, value, note: cleanNote },
    update: { value, note: cleanNote },
  });

  return NextResponse.json({ ok: true, ratingId: rating.id });
}
