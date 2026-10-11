import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { bad, gate } from "@/lib/event";
import { firstNameKey, syncInterviewSchedule } from "@/lib/interviews";

// Several graders may have the Interviews tab open at once; a sync this
// recent is close enough, so a burst of polls doesn't each hit Google.
const RESYNC_AFTER_MS = 8000;

async function resyncIfDue() {
  const sheet = await prisma.interviewSheet.findUnique({ where: { id: "main" } });
  if (!sheet) return { sheet: null, error: null };
  if (Date.now() - sheet.syncedAt.getTime() < RESYNC_AFTER_MS) return { sheet, error: null };
  const r = await syncInterviewSchedule(sheet.url);
  const fresh = await prisma.interviewSheet.findUnique({ where: { id: "main" } });
  return { sheet: fresh, error: r.error || null };
}

async function view(graderId) {
  const slots = await prisma.interviewSlot.findMany({
    // Open rooms don't need a row until someone's booked into them.
    where: { NOT: { status: { equals: "Open", mode: "insensitive" } } },
    orderBy: { sortKey: "asc" },
    include: {
      candidate: { select: { fullName: true } },
      interviewer1: { select: { name: true } },
      interviewer2: { select: { name: true } },
      notes: {
        orderBy: { createdAt: "asc" },
        include: { grader: { select: { name: true } } },
      },
    },
  });

  return {
    slots: slots.map((s) => ({
      id: s.id,
      day: s.day,
      startRaw: s.startRaw,
      endRaw: s.endRaw,
      room: s.room,
      roleRaw: s.roleRaw,
      checkRaw: s.checkRaw,
      candidateId: s.candidateId,
      candidateRaw: s.candidateRaw,
      candidateName: s.candidate?.fullName || null,
      interviewer1Id: s.interviewer1Id,
      interviewer1Raw: s.interviewer1Raw,
      interviewer1Name: s.interviewer1?.name || null,
      interviewer2Id: s.interviewer2Id,
      interviewer2Raw: s.interviewer2Raw,
      interviewer2Name: s.interviewer2?.name || null,
      mine: s.interviewer1Id === graderId || s.interviewer2Id === graderId,
      notes: s.notes.map((n) => ({
        id: n.id,
        body: n.body,
        graderId: n.graderId,
        graderName: n.grader.name,
        at: n.createdAt,
        mine: n.graderId === graderId,
      })),
    })),
  };
}

export async function GET() {
  const { error, grader } = await gate();
  if (error) return error;

  try {
    const { sheet, error: syncError } = await resyncIfDue();
    const data = await view(grader.id);
    return NextResponse.json({
      ok: true,
      sheetUrl: sheet?.url || null,
      syncedAt: sheet?.syncedAt || null,
      syncError,
      ...data,
    });
  } catch (e) {
    console.error("GET /api/interviews failed:", e);
    return bad(`Couldn't load the schedule: ${e.message}`, 500);
  }
}

export async function POST(req) {
  const { error, grader } = await gate();
  if (error) return error;

  const body = await req.json().catch(() => ({}));

  try {
    // { url } — admin only: point the schedule at this sheet and read it now.
    if (body.action === "setUrl") {
      if (!grader.isAdmin) return bad("Admins only.", 403);
      const url = String(body.url ?? "").trim();
      if (!url) return bad("Paste the schedule sheet's link first.");
      const r = await syncInterviewSchedule(url);
      if (r.error) return bad(r.error);
      return NextResponse.json({ ok: true, ...(await view(grader.id)) });
    }

    // { raw, graderId } — admin only: say which grader an interviewer's first
    // name means, for when two graders share it.
    if (body.action === "matchInterviewer") {
      if (!grader.isAdmin) return bad("Admins only.", 403);
      const raw = String(body.raw ?? "").trim();
      const graderId = String(body.graderId ?? "");
      if (!raw || !graderId) return bad("Missing name or grader.");
      const target = await prisma.grader.findUnique({ where: { id: graderId }, select: { id: true } });
      if (!target) return bad("That grader no longer exists.", 404);
      const name = firstNameKey(raw);
      await prisma.interviewerAlias.upsert({
        where: { name },
        create: { name, graderId },
        update: { graderId },
      });
      const sheet = await prisma.interviewSheet.findUnique({ where: { id: "main" } });
      if (sheet) await syncInterviewSchedule(sheet.url);
      return NextResponse.json({ ok: true, ...(await view(grader.id)) });
    }
  } catch (e) {
    console.error("POST /api/interviews failed:", e);
    return bad(`Something went wrong: ${e.message}`, 500);
  }

  return bad("Unknown action.");
}
