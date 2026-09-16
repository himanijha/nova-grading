import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentGrader, verifyPassword, hashPassword } from "@/lib/auth";

/**
 * Change your own password while signed in. The current password is required
 * even though the session already proves who you are: a session cookie is a
 * long-lived thing, and an unattended laptop should not be enough to lock the
 * owner out of their own account.
 */
export async function POST(req) {
  const grader = await getCurrentGrader();
  if (!grader) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const currentPassword = String(body.currentPassword || "");
  const password = String(body.password || "");

  if (!currentPassword) {
    return NextResponse.json({ error: "Enter your current password." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "New password must be at least 8 characters." },
      { status: 400 }
    );
  }

  // getCurrentGrader deliberately does not select the hash, so read it here.
  const row = await prisma.grader.findUnique({
    where: { id: grader.id },
    select: { passwordHash: true },
  });
  if (!row || !(await verifyPassword(currentPassword, row.passwordHash))) {
    return NextResponse.json({ error: "That is not your current password." }, { status: 403 });
  }
  if (await verifyPassword(password, row.passwordHash)) {
    return NextResponse.json(
      { error: "The new password is the same as the old one." },
      { status: 400 }
    );
  }

  const passwordHash = await hashPassword(password);
  await prisma.$transaction([
    prisma.grader.update({
      where: { id: grader.id },
      data: { passwordHash, mustReset: false },
    }),
    // Someone who just proved they know the password does not need the reset
    // links they asked for earlier, and a live link is a spare key.
    prisma.passwordResetToken.updateMany({
      where: { graderId: grader.id, usedAt: null },
      data: { usedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
