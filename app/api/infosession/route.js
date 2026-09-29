import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { bad, gate } from "@/lib/event";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * { rows: [{ name, email }] } — the sign-in sheet. Admins only, like the
 * application import. Someone already on the list keeps their note and auto
 * accept; only their name is refreshed.
 */
export async function POST(req) {
  const { error } = await gate({ admin: true });
  if (error) return error;

  const { rows } = await req.json().catch(() => ({}));
  if (!Array.isArray(rows)) return bad("Missing rows.");

  const skipped = [];
  // One row per email; a later row for the same person wins.
  const byEmail = new Map();
  rows.forEach((r, i) => {
    const name = String(r?.name ?? "").trim();
    const email = String(r?.email ?? "").trim().toLowerCase();
    if (!name || !EMAIL.test(email)) {
      skipped.push({ line: i + 2, reason: !name ? "missing name" : "missing or invalid email" });
      return;
    }
    byEmail.set(email, name);
  });

  const existing = await prisma.infoSessionAttendee.findMany({
    where: { email: { in: [...byEmail.keys()] } },
    select: { email: true, name: true },
  });
  const had = new Map(existing.map((p) => [p.email, p.name]));

  let created = 0;
  let updated = 0;
  let unchanged = 0;
  for (const [email, name] of byEmail) {
    if (!had.has(email)) {
      await prisma.infoSessionAttendee.create({ data: { email, name } });
      created++;
    } else if (had.get(email) !== name) {
      await prisma.infoSessionAttendee.update({ where: { email }, data: { name } });
      updated++;
    } else {
      unchanged++;
    }
  }

  return NextResponse.json({ ok: true, created, updated, unchanged, skipped });
}

/**
 * { id, note, autoAccept } — any grader, the same as an auto accept on the
 * grading page. An auto accept has to say why.
 */
export async function PATCH(req) {
  const { grader, error } = await gate();
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  if (!body.id) return bad("Missing attendee.");
  const note = typeof body.note === "string" ? body.note.trim() || null : null;
  const autoAccept = body.autoAccept === true;
  if (autoAccept && !note) return bad("Add a note explaining this auto accept.");

  const { count } = await prisma.infoSessionAttendee.updateMany({
    where: { id: body.id },
    data: { note, autoAccept, updatedById: grader.id },
  });
  if (count === 0) return bad("That person is not on the list.", 404);
  return NextResponse.json({ ok: true });
}

/** { id } — take someone off the list. Admins only. */
export async function DELETE(req) {
  const { error } = await gate({ admin: true });
  if (error) return error;

  const { id } = await req.json().catch(() => ({}));
  if (!id) return bad("Missing attendee.");
  await prisma.infoSessionAttendee.deleteMany({ where: { id } });
  return NextResponse.json({ ok: true });
}
