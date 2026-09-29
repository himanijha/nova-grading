import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { bad, gate } from "@/lib/event";
import { EMAIL, findDuplicate } from "@/lib/infosession-match";

/**
 * { name, email? } — someone a grader saw at an info session, added before
 * (or without) the sign-in sheet. Any grader. Someone already on the list is
 * refused with their id, so the page can open them instead.
 */
export async function POST(req) {
  const { grader, error } = await gate();
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase() || null;
  if (!name) return bad("Add their name.");
  if (email && !EMAIL.test(email)) return bad("That email doesn't look right.");

  const existing = await prisma.infoSessionAttendee.findMany({
    select: { id: true, name: true, email: true },
  });
  const dupe = findDuplicate({ name, email }, existing);
  if (dupe) {
    return NextResponse.json(
      { error: `${dupe.name} is already on the list.`, id: dupe.id },
      { status: 409 }
    );
  }

  const person = await prisma.infoSessionAttendee.create({
    data: { name, email, onSheet: false, addedById: grader.id },
  });
  return NextResponse.json({ ok: true, id: person.id });
}
