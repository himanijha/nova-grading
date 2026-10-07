import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { bad, gate } from "@/lib/event";
import { isVerdict, passAfter, placeVerdict } from "@/lib/deliberation";

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
 * Admins only. Three actions on the shared ranking:
 *   { applicantId, verdict }  — set a verdict (or null to clear it). The
 *     person lands where that verdict puts them, and passes to the coffee
 *     chats if the verdict is a strong accept or yes.
 *   { applicantId, passed }   — pass a maybe to the coffee chats by hand, or
 *     take it back. Only maybes can be passed this way.
 *   { order: [applicantId…] } — a drag: the whole ranking, top first.
 * Each returns the ranking as it now stands: [{ applicantId, verdict, passed }].
 */
export async function POST(req) {
  const { error, grader } = await gate({ admin: true });
  if (error) return error;

  const body = await req.json().catch(() => ({}));

  const result = await prisma
    .$transaction(async (tx) => {
      const rows = await tx.deliberationVerdict.findMany({
        orderBy: { position: "asc" },
        select: { applicantId: true, verdict: true, passedToInterview: true },
      });
      const ids = rows.map((r) => r.applicantId);
      const byId = Object.fromEntries(rows.map((r) => [r.applicantId, r]));

      if (Array.isArray(body.order)) {
        const want = new Set(body.order);
        if (want.size !== ids.length || ids.some((id) => !want.has(id))) {
          throw new Error("The ranking changed while you were moving someone. Refresh and try again.");
        }
        await renumber(tx, body.order);
      } else if (typeof body.passed === "boolean") {
        const row = byId[body.applicantId];
        if (!row) throw new Error("Give them a verdict first.");
        if (row.verdict !== "MAYBE") {
          throw new Error("Only maybes are passed by hand. Strong accepts and yeses pass on their own.");
        }
        await tx.deliberationVerdict.update({
          where: { applicantId: body.applicantId },
          data: { passedToInterview: body.passed, updatedById: grader.id },
        });
      } else {
        const { applicantId, verdict } = body;
        if (!applicantId) throw new Error("Missing applicant.");

        if (verdict === null) {
          await tx.deliberationVerdict.deleteMany({ where: { applicantId } });
          await renumber(
            tx,
            ids.filter((id) => id !== applicantId)
          );
        } else {
          if (!isVerdict(verdict)) throw new Error("Unknown verdict.");
          const applicant = await tx.applicant.findUnique({
            where: { id: applicantId },
            select: { id: true },
          });
          if (!applicant) throw new Error("Applicant not found.");

          const prev = byId[applicantId];
          const passed = passAfter(verdict, !!prev?.passedToInterview, prev?.verdict ?? null);
          const verdicts = Object.fromEntries(rows.map((r) => [r.applicantId, r.verdict]));
          const next = placeVerdict(ids, verdicts, applicantId, verdict);

          await tx.deliberationVerdict.upsert({
            where: { applicantId },
            create: { applicantId, verdict, position: 0, passedToInterview: passed, updatedById: grader.id },
            update: { verdict, passedToInterview: passed, updatedById: grader.id },
          });
          await renumber(tx, next);
        }
      }

      const after = await tx.deliberationVerdict.findMany({
        orderBy: { position: "asc" },
        select: { applicantId: true, verdict: true, passedToInterview: true },
      });
      return after.map((r) => ({
        applicantId: r.applicantId,
        verdict: r.verdict,
        passed: r.passedToInterview,
      }));
    })
    .catch((e) => ({ failed: e.message }));

  if (result.failed) return bad(result.failed);
  return NextResponse.json({ ok: true, ranking: result });
}
