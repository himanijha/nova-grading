import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentGrader, hashPassword, newResetToken } from "@/lib/auth";

async function requireAdmin() {
  const grader = await getCurrentGrader();
  if (!grader) return { error: NextResponse.json({ error: "Not signed in." }, { status: 401 }) };
  if (!grader.isAdmin)
    return { error: NextResponse.json({ error: "Admins only." }, { status: 403 }) };
  return { grader };
}

export async function POST(req) {
  const { error, grader } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const action = body.action;

  if (action === "create") {
    const email = String(body.email || "").toLowerCase().trim();
    const name = String(body.name || "").trim();
    const password = String(body.password || "");

    if (!email || !name) {
      return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Temporary password must be at least 8 characters." },
        { status: 400 }
      );
    }
    if (await prisma.grader.findUnique({ where: { email } })) {
      return NextResponse.json({ error: "That email already has an account." }, { status: 409 });
    }

    await prisma.grader.create({
      data: {
        email,
        name,
        passwordHash: await hashPassword(password),
        isAdmin: !!body.isAdmin,
        mustReset: true,
      },
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "reset-link") {
    const target = await prisma.grader.findUnique({ where: { id: String(body.graderId) } });
    if (!target) return NextResponse.json({ error: "Grader not found." }, { status: 404 });

    const { raw, tokenHash } = newResetToken();
    await prisma.passwordResetToken.create({
      data: {
        graderId: target.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    const origin = new URL(req.url).origin;
    return NextResponse.json({ ok: true, resetUrl: `${origin}/reset?token=${raw}` });
  }

  if (action === "delete") {
    const id = String(body.graderId);
    if (id === grader.id) {
      return NextResponse.json({ error: "You can't remove your own account." }, { status: 400 });
    }
    await prisma.grader.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
