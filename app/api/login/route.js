import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword, createSession } from "@/lib/auth";

export async function POST(req) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const grader = await prisma.grader.findUnique({
    where: { email: String(email).toLowerCase().trim() },
  });

  // Same message either way so the form can't be used to enumerate accounts.
  if (!grader || !(await verifyPassword(password, grader.passwordHash))) {
    return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
  }

  await createSession(grader.id);
  return NextResponse.json({ ok: true });
}
