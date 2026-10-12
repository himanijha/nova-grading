import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { bad, gate } from "@/lib/event";

/**
 * Save the interview guide's shared parts: { slotId, track?, notes? }. Both
 * interviewers write to the same row — they're writing up the same
 * conversation — so `notes` is sent as the whole question-id → text map
 * rather than merged server-side. Any signed-in grader may write; the two
 * assigned interviewers are the ones who matter at the end, but there's no
 * one else around who'd write nonsense here. The rubric and verdict are each
 * person's own and go through /api/interview-scorecards instead.
 */
export async function POST(req) {
  const { error, grader } = await gate();
  if (error) return error;

  const { slotId, track, notes } = await req.json().catch(() => ({}));
  if (!slotId) return bad("Missing interview slot.");

  const slot = await prisma.interviewSlot.findUnique({ where: { id: slotId }, select: { id: true } });
  if (!slot) return bad("That interview slot no longer exists.", 404);

  const data = {
    ...(track !== undefined && { track: track || null }),
    ...(notes !== undefined && { notesJson: JSON.stringify(notes || {}) }),
    updatedById: grader.id,
  };

  await prisma.interviewReport.upsert({
    where: { slotId },
    create: { slotId, ...data },
    update: data,
  });
  return NextResponse.json({ ok: true });
}
