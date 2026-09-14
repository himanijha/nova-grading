import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentGrader } from "@/lib/auth";

const CRITERIA = ["technical", "thoughtfulness", "initiative", "communityFit"];

// An auto decision is an override, not a read of the rubric: accept scores the
// maximum everywhere, reject the minimum. The scores are set here rather than
// trusted from the client so a decision and its scores can never disagree.
const AUTO_SCORE = { ACCEPT: 5, REJECT: 1 };

export async function POST(req) {
  const grader = await getCurrentGrader();
  if (!grader) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json();
  const { applicantId } = body;
  if (!applicantId) {
    return NextResponse.json({ error: "Missing applicant." }, { status: 400 });
  }

  const autoDecision =
    body.autoDecision === "ACCEPT" || body.autoDecision === "REJECT"
      ? body.autoDecision
      : null;
  if (body.autoDecision != null && !autoDecision) {
    return NextResponse.json(
      { error: "autoDecision must be ACCEPT, REJECT, or null." },
      { status: 400 }
    );
  }

  const notes = {};
  for (const key of [...CRITERIA.map((c) => `${c}Note`), "overallNote"]) {
    notes[key] = typeof body[key] === "string" ? body[key].trim() || null : null;
  }

  // The whole point of the override is that someone can say why, so the note
  // is required here — the rest of the team reads it from Rankings.
  if (autoDecision && !notes.overallNote) {
    return NextResponse.json(
      {
        error: `Add a note explaining this auto ${
          autoDecision === "ACCEPT" ? "accept" : "reject"
        }.`,
      },
      { status: 400 }
    );
  }

  const scores = {};
  for (const key of CRITERIA) {
    if (autoDecision) {
      scores[key] = AUTO_SCORE[autoDecision];
      continue;
    }
    const n = Number(body[key]);
    if (!Number.isInteger(n) || n < 1 || n > 5) {
      return NextResponse.json(
        { error: `${key} must be a whole number from 1 to 5.` },
        { status: 400 }
      );
    }
    scores[key] = n;
  }

  const applicant = await prisma.applicant.findUnique({ where: { id: applicantId } });
  if (!applicant) {
    return NextResponse.json({ error: "Applicant not found." }, { status: 404 });
  }

  const grade = await prisma.grade.upsert({
    where: { applicantId_graderId: { applicantId, graderId: grader.id } },
    create: { applicantId, graderId: grader.id, ...scores, ...notes, autoDecision },
    update: { ...scores, ...notes, autoDecision },
  });

  return NextResponse.json({ ok: true, gradeId: grade.id });
}
