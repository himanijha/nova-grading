import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashResetToken, hashPassword, createSession } from "@/lib/auth";

export async function POST(req) {
  const { token, password } = await req.json();

  if (!token || typeof password !== "string" || password.length < 8) {
    return NextResponse.json(
      { error: "A valid token and an 8+ character password are required." },
      { status: 400 }
    );
  }

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(token) },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return NextResponse.json(
      { error: "This reset link is invalid or has expired." },
      { status: 400 }
    );
  }

  await prisma.$transaction([
    prisma.grader.update({
      where: { id: record.graderId },
      data: { passwordHash: await hashPassword(password), mustReset: false },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    // Burn any other outstanding tokens for this grader.
    prisma.passwordResetToken.updateMany({
      where: { graderId: record.graderId, usedAt: null },
      data: { usedAt: new Date() },
    }),
  ]);

  await createSession(record.graderId);
  return NextResponse.json({ ok: true });
}
