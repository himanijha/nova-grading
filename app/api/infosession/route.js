import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { bad, gate } from "@/lib/event";
import { EMAIL, planImport } from "@/lib/infosession-match";

/**
 * { rows: [{ name, email }] } — the sign-in sheet. Admins only, like the
 * application import. Someone already on the list — by email, or added by
 * hand under the same name — keeps their note and auto accept.
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
    select: { id: true, email: true, name: true, onSheet: true },
  });
  const plan = planImport(
    [...byEmail].map(([email, name]) => ({ email, name })),
    existing
  );

  const counts = { created: 0, updated: 0, merged: 0, unchanged: 0 };
  await prisma.$transaction(async (tx) => {
    for (const p of plan) {
      if (p.kind === "create") {
        await tx.infoSessionAttendee.create({
          data: { email: p.email, name: p.name, onSheet: true },
        });
        counts.created++;
      } else if (p.kind === "unchanged") {
        counts.unchanged++;
      } else {
        await tx.infoSessionAttendee.update({
          where: { id: p.id },
          data: { email: p.email, name: p.name, onSheet: true },
        });
        counts[p.kind === "merge" ? "merged" : "updated"]++;
      }
    }
    // A whole sheet of new people is a few hundred writes; the default five
    // seconds is cut close on a hosted database.
  }, { timeout: 30000 });

  return NextResponse.json({ ok: true, ...counts, skipped });
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
