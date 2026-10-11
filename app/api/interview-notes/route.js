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

/** Write a note on an interview slot: { slotId, body }. Only that slot's two
 * interviewers, or an admin, may write one — everyone else can read the
 * schedule but has no interview of their own to note. */
export async function POST(req) {
  const { error, grader } = await gate();
  if (error) return error;

  const { slotId, body } = await req.json().catch(() => ({}));
  if (!slotId) return bad("Missing interview slot.");
  const text = cleanBody(body);
  if (text.error) return bad(text.error);

  const slot = await prisma.interviewSlot.findUnique({
    where: { id: slotId },
    select: { interviewer1Id: true, interviewer2Id: true },
  });
  if (!slot) return bad("That interview slot no longer exists.", 404);
  const isInterviewer = slot.interviewer1Id === grader.id || slot.interviewer2Id === grader.id;
  if (!isInterviewer && !grader.isAdmin) return bad("Only that interview's interviewers can add a note.", 403);

  const note = await prisma.interviewNote.create({
    data: { slotId, graderId: grader.id, body: text.body },
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

  const { count } = await prisma.interviewNote.updateMany({
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
  const { count } = await prisma.interviewNote.deleteMany({ where: { id: noteId, graderId: grader.id } });
  if (count === 0) return bad("You can only delete your own notes.", 403);
  return NextResponse.json({ ok: true });
}
