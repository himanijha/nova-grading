import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { SCREENING, bad, clearPlacements, gate } from "@/lib/event";

/**
 * Save screening outcomes: { updates: [{ applicantId, status }] }.
 * Anyone who stops being PASSED leaves their cohort and groups — they are no
 * longer coming to the group work event.
 */
export async function POST(req) {
  const { error } = await gate({ admin: true });
  if (error) return error;

  const { updates } = await req.json().catch(() => ({}));
  if (!Array.isArray(updates) || updates.length === 0) return bad("Nothing to save.");
  if (updates.some((u) => !u?.applicantId || !SCREENING.includes(u.status))) {
    return bad("Each update needs an applicant and a status.");
  }

  const byStatus = {};
  for (const u of updates) (byStatus[u.status] ||= []).push(u.applicantId);
  const leaving = updates.filter((u) => u.status !== "PASSED").map((u) => u.applicantId);

  await prisma.$transaction(async (tx) => {
    for (const [status, ids] of Object.entries(byStatus)) {
      await tx.applicant.updateMany({ where: { id: { in: ids } }, data: { screeningStatus: status } });
    }
    await clearPlacements(tx, leaving);
    await tx.cohortMember.deleteMany({ where: { applicantId: { in: leaving } } });
  });

  return NextResponse.json({ ok: true, saved: updates.length });
}
