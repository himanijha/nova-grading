import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { bad, gate } from "@/lib/event";

const MAX_NOTE = 4000;

function cleanBody(body) {
  const s = typeof body === "string" ? body.trim() : "";
  if (!s) return { error: "Write something first." };
  if (s.length > MAX_NOTE) return { error: `Keep notes under ${MAX_NOTE} characters.` };
  return { body: s };
}

/**
 * Write a note: { applicantId, body, roundId? }. The author is whoever is
 * signed in — never taken from the request — and the group is looked up from
 * where the applicant sat that round, so the note says where it was written.
 */
export async function POST(req) {
  const { error, grader } = await gate();
  if (error) return error;

  const { applicantId, body, roundId } = await req.json().catch(() => ({}));
  if (!applicantId) return bad("Missing applicant.");
  const text = cleanBody(body);
  if (text.error) return bad(text.error);

  let groupId = null;
  if (roundId) {
    const placement = await prisma.placement.findUnique({
      where: { roundId_applicantId: { roundId, applicantId } },
      select: { groupId: true },
    });
    groupId = placement?.groupId ?? null;
  }

  const note = await prisma.note.create({
    data: { applicantId, graderId: grader.id, roundId: roundId || null, groupId, body: text.body },
  });
  return NextResponse.json({ ok: true, id: note.id });
}

/** Edit your own note: { noteId, body }. */
export async function PATCH(req) {
  const { error, grader } = await gate();
  if (error) return error;

  const { noteId, body } = await req.json().catch(() => ({}));
  const text = cleanBody(body);
  if (text.error) return bad(text.error);

  const { count } = await prisma.note.updateMany({
    where: { id: noteId, graderId: grader.id },
    data: { body: text.body },
  });
  if (count === 0) return bad("You can only edit your own notes.", 403);
  return NextResponse.json({ ok: true });
}

/** Delete your own note: { noteId }. */
export async function DELETE(req) {
  const { error, grader } = await gate();
  if (error) return error;

  const { noteId } = await req.json().catch(() => ({}));
  const { count } = await prisma.note.deleteMany({ where: { id: noteId, graderId: grader.id } });
  if (count === 0) return bad("You can only delete your own notes.", 403);
  return NextResponse.json({ ok: true });
}
