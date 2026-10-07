import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { bad, gate } from "@/lib/event";
import { isVerdict, placeVerdict } from "@/lib/deliberation";

/** Writes the ranking: positions 0, 1, 2… in the order given. */
async function renumber(tx, orderedIds) {
  const current = await tx.deliberationVerdict.findMany({
    select: { applicantId: true, position: true },
  });
  const at = new Map(current.map((c) => [c.applicantId, c.position]));
  const writes = orderedIds
    .map((applicantId, position) => ({ applicantId, position }))
    .filter((w) => at.get(w.applicantId) !== w.position);
  for (const w of writes) {
    await tx.deliberationVerdict.update({
      where: { applicantId: w.applicantId },
      data: { position: w.position },
    });
  }
}

/**
 * Admins only. Two actions on the shared ranking:
 *   { applicantId, verdict }  — set a verdict (or null to clear it). The
 *     person lands where that verdict puts them.
 *   { order: [applicantId…] } — a drag: the whole ranking, top first.
 * Both return the ranking as it now stands: [{ applicantId, verdict }], top first.
 */
export async function POST(req) {
  const { error, grader } = await gate({ admin: true });
  if (error) return error;

  const body = await req.json().catch(() => ({}));

  const ranking = await prisma.$transaction(async (tx) => {
    const rows = await tx.deliberationVerdict.findMany({
      orderBy: { position: "asc" },
      select: { applicantId: true, verdict: true },
    });
    const ids = rows.map((r) => r.applicantId);
    const verdicts = Object.fromEntries(rows.map((r) => [r.applicantId, r.verdict]));

    if (Array.isArray(body.order)) {
      const want = new Set(body.order);
      if (want.size !== ids.length || ids.some((id) => !want.has(id))) {
        throw new Error("The ranking changed while you were moving someone. Refresh and try again.");
      }
      await renumber(tx, body.order);
      return body.order.map((applicantId) => ({ applicantId, verdict: verdicts[applicantId] }));
    }

    const { applicantId, verdict } = body;
    if (!applicantId) throw new Error("Missing applicant.");

    if (verdict === null) {
      await tx.deliberationVerdict.deleteMany({ where: { applicantId } });
      const rest = ids.filter((id) => id !== applicantId);
      await renumber(tx, rest);
      return rest.map((id) => ({ applicantId: id, verdict: verdicts[id] }));
    }

    if (!isVerdict(verdict)) throw new Error("Unknown verdict.");
    const applicant = await tx.applicant.findUnique({ where: { id: applicantId }, select: { id: true } });
    if (!applicant) throw new Error("Applicant not found.");

    const next = placeVerdict(ids, verdicts, applicantId, verdict);
    await tx.deliberationVerdict.upsert({
      where: { applicantId },
      create: { applicantId, verdict, position: 0, updatedById: grader.id },
      update: { verdict, updatedById: grader.id },
    });
    await renumber(tx, next);
    return next.map((id) => ({ applicantId: id, verdict: id === applicantId ? verdict : verdicts[id] }));
  }).catch((e) => ({ failed: e.message }));

  if (ranking.failed) return bad(ranking.failed);
  return NextResponse.json({ ok: true, ranking });
}
