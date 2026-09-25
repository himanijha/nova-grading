import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { bad, clearPlacements, gate } from "@/lib/event";

function parseFields(body) {
  const name = String(body.name ?? "").trim();
  const startsAt = body.startsAt ? new Date(body.startsAt) : null;
  const capacity =
    body.capacity === "" || body.capacity == null ? null : Math.floor(Number(body.capacity));
  if (startsAt && Number.isNaN(startsAt.getTime())) return { error: "That start time is not a date." };
  if (capacity !== null && !(capacity > 0)) return { error: "Capacity must be a positive number." };
  return { name, startsAt, capacity };
}

export async function POST(req) {
  const { error } = await gate({ admin: true });
  if (error) return error;

  const body = await req.json().catch(() => ({}));

  if (body.action === "create" || body.action === "update") {
    const f = parseFields(body);
    if (f.error) return bad(f.error);
    if (!f.name) return bad("Give the cohort a name, like “Sat 10am”.");
    const data = { name: f.name, startsAt: f.startsAt, capacity: f.capacity };
    if (body.action === "create") {
      const c = await prisma.cohort.create({ data });
      return NextResponse.json({ ok: true, id: c.id });
    }
    await prisma.cohort.update({ where: { id: body.cohortId }, data });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "delete") {
    // Members, groups, rounds and placements go with it; notes survive, just
    // without the round they were written in.
    await prisma.cohort.delete({ where: { id: body.cohortId } }).catch(() => null);
    return NextResponse.json({ ok: true });
  }

  // { assignments: [{ applicantId, cohortId | null }] } — null takes someone
  // out of every cohort.
  if (body.action === "assign") {
    const list = Array.isArray(body.assignments) ? body.assignments : [];
    if (list.length === 0) return bad("Nothing to assign.");

    const ids = list.map((a) => a.applicantId);
    const passed = await prisma.applicant.findMany({
      where: { id: { in: ids }, screeningStatus: "PASSED" },
      select: { id: true },
    });
    const ok = new Set(passed.map((p) => p.id));
    const refused = ids.filter((id) => !ok.has(id));
    if (refused.length) {
      return bad(`${refused.length} of these have not passed screening, so they can't join a cohort.`);
    }

    const current = await prisma.cohortMember.findMany({
      where: { applicantId: { in: ids } },
      select: { applicantId: true, cohortId: true },
    });
    const was = new Map(current.map((m) => [m.applicantId, m.cohortId]));
    const changed = list.filter((a) => (was.get(a.applicantId) || null) !== (a.cohortId || null));

    await prisma.$transaction(async (tx) => {
      // A new cohort means a different room: the old groups no longer apply.
      await clearPlacements(tx, changed.map((a) => a.applicantId));
      await tx.cohortMember.deleteMany({
        where: { applicantId: { in: changed.map((a) => a.applicantId) } },
      });
      const joining = changed.filter((a) => a.cohortId);
      if (joining.length) {
        await tx.cohortMember.createMany({
          data: joining.map((a) => ({ applicantId: a.applicantId, cohortId: a.cohortId })),
        });
      }
    });

    return NextResponse.json({ ok: true, changed: changed.length });
  }

  return bad("Unknown action.");
}
