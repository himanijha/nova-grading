import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { bad, gate } from "@/lib/event";
import { syncSheet } from "@/lib/sheet";
import { normalizeName } from "@/lib/signups";

export async function POST(req) {
  const { error } = await gate({ admin: true });
  if (error) return error;

  const body = await req.json().catch(() => ({}));

  // { url? } — read the sheet again; with a url, read that sheet from now on.
  if (body.action === "sync") {
    const url = String(body.url ?? "").trim() || (await prisma.eventSheet.findUnique({ where: { id: "main" } }))?.url;
    if (!url) return bad("Paste the sign-up sheet's link first.");
    const r = await syncSheet(url);
    if (r.error) return bad(r.error);
    return NextResponse.json({ ok: true, ...r });
  }

  // { signupId, applicantId } — say whose application a sheet name belongs to.
  // Remembered by name, so the next read of the sheet doesn't ask again.
  if (body.action === "match") {
    const [signup, applicant] = await Promise.all([
      prisma.signup.findUnique({ where: { id: String(body.signupId ?? "") } }),
      prisma.applicant.findUnique({
        where: { id: String(body.applicantId ?? "") },
        select: { id: true, fullName: true, cohort: { select: { cohort: { select: { name: true } } } } },
      }),
    ]);
    if (!signup) return bad("That name has already been dealt with. Reload the page.", 404);
    if (!applicant) return bad("That applicant no longer exists.", 404);
    if (applicant.cohort) {
      return bad(`${applicant.fullName} is already in ${applicant.cohort.cohort.name}. One application can't be two people.`);
    }

    const name = normalizeName(signup.name);
    await prisma.$transaction([
      prisma.nameMatch.upsert({
        where: { name },
        create: { name, applicantId: applicant.id },
        update: { applicantId: applicant.id },
      }),
      prisma.cohortMember.create({ data: { applicantId: applicant.id, cohortId: signup.cohortId } }),
      prisma.applicant.update({ where: { id: applicant.id }, data: { screeningStatus: "PASSED" } }),
      prisma.signup.delete({ where: { id: signup.id } }),
    ]);
    return NextResponse.json({ ok: true });
  }

  // Only for a session that isn't on the sheet (an old or demo one). Members,
  // groups, rounds and placements go with it; notes survive, just without the
  // round they were written in.
  if (body.action === "delete") {
    const cohort = await prisma.cohort.findUnique({
      where: { id: String(body.cohortId ?? "") },
      select: { sheetCol: true },
    });
    if (cohort && cohort.sheetCol != null) return bad("That session comes from the sheet. Remove its column there instead.");
    await prisma.cohort.delete({ where: { id: body.cohortId } }).catch(() => null);
    return NextResponse.json({ ok: true });
  }

  return bad("Unknown action.");
}
