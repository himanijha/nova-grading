import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { bad, gate } from "@/lib/event";

/**
 * Admins only. Drags the whole ranking into a new order:
 *   { order: [applicantId…] } — top first, same length as the current table.
 * There's no verdict to set here — the bucket comes from the scorecards —
 * so this is the only action.
 */
export async function POST(req) {
  const { error } = await gate({ admin: true });
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  if (!Array.isArray(body.order)) return bad("Missing order.");

  const result = await prisma
    .$transaction(async (tx) => {
      const current = await tx.interviewDeliberationVerdict.findMany({
        select: { applicantId: true, position: true },
      });
      const ids = current.map((c) => c.applicantId);
      const want = new Set(body.order);
      if (want.size !== ids.length || ids.some((id) => !want.has(id))) {
        throw new Error("The ranking changed while you were moving someone. Refresh and try again.");
      }

      const at = new Map(current.map((c) => [c.applicantId, c.position]));
      const writes = body.order
        .map((applicantId, position) => ({ applicantId, position }))
        .filter((w) => at.get(w.applicantId) !== w.position);
      for (const w of writes) {
        await tx.interviewDeliberationVerdict.update({
          where: { applicantId: w.applicantId },
          data: { position: w.position },
        });
      }

      return body.order;
    })
    .catch((e) => ({ failed: e.message }));

  if (result.failed) return bad(result.failed);
  return NextResponse.json({ ok: true, order: result });
}
