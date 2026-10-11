import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { bad, gate } from "@/lib/event";
import { VERDICTS } from "@/lib/interviewScripts";

const VERDICT_VALUES = new Set(VERDICTS.map((v) => v.value));

/**
 * Save part of an interview's guide: { slotId, track?, notes?, rubric?,
 * verdict?, generalNotes? }. `notes` and `rubric` are each sent as the whole
 * map (question id → text, category id → 1-5) rather than merged
 * server-side, since the client already holds the current state. Only that
 * slot's two interviewers, or an admin, may write — same as interview notes.
 * A verdict needs general notes to explain it, checked against whichever of
 * this save or the existing row has them.
 */
export async function POST(req) {
  const { error, grader } = await gate();
  if (error) return error;

  const { slotId, track, notes, rubric, verdict, generalNotes } = await req.json().catch(() => ({}));
  if (!slotId) return bad("Missing interview slot.");
  if (verdict !== undefined && verdict !== null && !VERDICT_VALUES.has(verdict)) {
    return bad("Unknown verdict.");
  }

  const slot = await prisma.interviewSlot.findUnique({
    where: { id: slotId },
    select: { interviewer1Id: true, interviewer2Id: true, report: { select: { generalNotes: true } } },
  });
  if (!slot) return bad("That interview slot no longer exists.", 404);
  const isInterviewer = slot.interviewer1Id === grader.id || slot.interviewer2Id === grader.id;
  if (!isInterviewer && !grader.isAdmin) return bad("Only that interview's interviewers can edit this.", 403);

  if (verdict) {
    const explained = generalNotes !== undefined ? generalNotes : slot.report?.generalNotes;
    if (!explained || !explained.trim()) {
      return bad("Add general notes explaining the verdict first.");
    }
  }

  const data = {
    ...(track !== undefined && { track: track || null }),
    ...(notes !== undefined && { notesJson: JSON.stringify(notes || {}) }),
    ...(rubric !== undefined && { rubricJson: JSON.stringify(rubric || {}) }),
    ...(verdict !== undefined && { verdict: verdict || null }),
    ...(generalNotes !== undefined && { generalNotes: generalNotes || null }),
    updatedById: grader.id,
  };

  await prisma.interviewReport.upsert({
    where: { slotId },
    create: { slotId, ...data },
    update: data,
  });
  return NextResponse.json({ ok: true });
}
