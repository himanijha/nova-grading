import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { bad, gate } from "@/lib/event";
import { VERDICTS } from "@/lib/interviewScripts";

const VERDICT_VALUES = new Set(VERDICTS.map((v) => v.value));

/**
 * Save your own scorecard for a slot: { slotId, rubric?, verdict?,
 * generalNotes? }. Always keyed by the signed-in grader — there is no way to
 * write anyone else's, which is the whole point: each interviewer's rubric
 * and verdict are their own independent read on the candidate, not a shared
 * document like the notes. Only that slot's two interviewers, or an admin,
 * may write one (an admin writes their own, same as anyone). A verdict needs
 * general notes to explain it.
 */
export async function POST(req) {
  const { error, grader } = await gate();
  if (error) return error;

  const { slotId, rubric, verdict, generalNotes } = await req.json().catch(() => ({}));
  if (!slotId) return bad("Missing interview slot.");
  if (verdict !== undefined && verdict !== null && !VERDICT_VALUES.has(verdict)) {
    return bad("Unknown verdict.");
  }

  const slot = await prisma.interviewSlot.findUnique({
    where: { id: slotId },
    select: { interviewer1Id: true, interviewer2Id: true },
  });
  if (!slot) return bad("That interview slot no longer exists.", 404);
  const isInterviewer = slot.interviewer1Id === grader.id || slot.interviewer2Id === grader.id;
  if (!isInterviewer && !grader.isAdmin) return bad("Only that interview's interviewers can score it.", 403);

  if (verdict) {
    const existing = await prisma.interviewScorecard.findUnique({
      where: { slotId_graderId: { slotId, graderId: grader.id } },
      select: { generalNotes: true },
    });
    const explained = generalNotes !== undefined ? generalNotes : existing?.generalNotes;
    if (!explained || !explained.trim()) {
      return bad("Add general notes explaining the verdict first.");
    }
  }

  const data = {
    ...(rubric !== undefined && { rubricJson: JSON.stringify(rubric || {}) }),
    ...(verdict !== undefined && { verdict: verdict || null }),
    ...(generalNotes !== undefined && { generalNotes: generalNotes || null }),
  };

  await prisma.interviewScorecard.upsert({
    where: { slotId_graderId: { slotId, graderId: grader.id } },
    create: { slotId, graderId: grader.id, ...data },
    update: data,
  });
  return NextResponse.json({ ok: true });
}
