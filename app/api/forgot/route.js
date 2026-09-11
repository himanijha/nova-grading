import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { newResetToken } from "@/lib/auth";

const TTL_MINUTES = 60;

export async function POST(req) {
  const { email } = await req.json();
  const grader = await prisma.grader.findUnique({
    where: { email: String(email || "").toLowerCase().trim() },
  });

  // Always answer the same shape; only include the link when the account exists.
  if (!grader) return NextResponse.json({ ok: true });

  const { raw, tokenHash } = newResetToken();
  await prisma.passwordResetToken.create({
    data: {
      graderId: grader.id,
      tokenHash,
      expiresAt: new Date(Date.now() + TTL_MINUTES * 60 * 1000),
    },
  });

  const origin = new URL(req.url).origin;
  const resetUrl = `${origin}/reset?token=${raw}`;

  // No mail service is wired up, so the link is shown to the requester and
  // also listed on the admin page for an officer to relay if needed.
  return NextResponse.json({ ok: true, resetUrl });
}
