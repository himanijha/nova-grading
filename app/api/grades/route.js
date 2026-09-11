import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentGrader } from "@/lib/auth";

const CRITERIA = ["technical", "thoughtfulness", "initiative", "communityFit"];

export async function POST(req) {
  const grader = await getCurrentGrader();
  if (!grader) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json();
  const { applicantId } = body;
  if (!applicantId) {
    return NextResponse.json({ error: "Missing applicant." }, { status: 400 });
  }

  const scores = {};
  for (const key of CRITERIA) {
    const n = Number(body[key]);
    if (!Number.isInteger(n) || n < 1 || n > 5) {
      return NextResponse.json(
        { error: `${key} must be a whole number from 1 to 5.` },
        { status: 400 }
      );
    }
    scores[key] = n;
  }

  const notes = {};
  for (const key of [...CRITERIA.map((c) => `${c}Note`), "overallNote"]) {
    notes[key] = typeof body[key] === "string" ? body[key].trim() || null : null;
  }

  const applicant = await prisma.applicant.findUnique({ where: { id: applicantId } });
  if (!applicant) {
    return NextResponse.json({ error: "Applicant not found." }, { status: 404 });
  }

  const grade = await prisma.grade.upsert({
    where: { applicantId_graderId: { applicantId, graderId: grader.id } },
    create: { applicantId, graderId: grader.id, ...scores, ...notes },
    update: { ...scores, ...notes },
  });

  return NextResponse.json({ ok: true, gradeId: grade.id });
}
