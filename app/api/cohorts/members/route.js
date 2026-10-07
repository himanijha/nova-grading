import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { bad, clearPlacements, gate, seatLatecomer } from "@/lib/event";

/**
 * Put someone in a session by hand: { cohortId, applicantId, move? }. For the
 * people the sheet got wrong — any grader on the door can do it, since that is
 * where it comes up. Only an application can be added, never a bare name.
 *
 * Nobody else's groups change. Someone already in another session is only
 * moved when `move` is set, so the caller has to have asked.
 */
export async function POST(req) {
  const { error } = await gate();
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const [cohort, applicant] = await Promise.all([
    prisma.cohort.findUnique({ where: { id: String(body.cohortId ?? "") }, select: { id: true, name: true } }),
    prisma.applicant.findUnique({
      where: { id: String(body.applicantId ?? "") },
      select: {
        id: true,
        fullName: true,
        screeningStatus: true,
        cohort: { select: { cohortId: true, cohort: { select: { name: true } } } },
      },
    }),
  ]);
  if (!cohort) return bad("That session no longer exists.", 404);
  if (!applicant) return bad("That applicant no longer exists.", 404);
  if (applicant.screeningStatus === "REJECTED") {
    return bad(
      `${applicant.fullName} was marked not passed in Rankings, so they can't be added. An admin has to pass them there first.`,
      409
    );
  }

  const from = applicant.cohort;
  if (from?.cohortId === cohort.id) return NextResponse.json({ ok: true, already: true });
  if (from && !body.move) {
    return bad(`${applicant.fullName} is already in ${from.cohort.name}.`, 409);
  }

  await prisma.$transaction(async (tx) => {
    // Their groups belong to the session they are leaving.
    await clearPlacements(tx, [applicant.id]);
    await tx.cohortMember.upsert({
      where: { applicantId: applicant.id },
      create: { applicantId: applicant.id, cohortId: cohort.id, byHand: true },
      update: { cohortId: cohort.id, byHand: true, checkedInAt: null },
    });
    await tx.applicant.update({ where: { id: applicant.id }, data: { screeningStatus: "PASSED" } });
    await seatLatecomer(tx, cohort.id, applicant.id);
  });
  return NextResponse.json({ ok: true, moved: !!from });
}

/**
 * Take back a by-hand placement: { applicantId }. Admins only. They leave the
 * session and its groups; if the sheet has them, the next read puts them
 * wherever it says.
 */
export async function DELETE(req) {
  const { error } = await gate({ admin: true });
  if (error) return error;

  const { applicantId } = await req.json().catch(() => ({}));
  if (!applicantId) return bad("Missing applicant.");

  await prisma.$transaction(async (tx) => {
    const member = await tx.cohortMember.findUnique({ where: { applicantId }, select: { byHand: true } });
    if (!member?.byHand) return;
    await clearPlacements(tx, [applicantId]);
    await tx.cohortMember.delete({ where: { applicantId } });
  });
  return NextResponse.json({ ok: true });
}
