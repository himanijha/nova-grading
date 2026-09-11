import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "./db";

const COOKIE = "nova_session";
const secret = new TextEncoder().encode(
  process.env.SESSION_SECRET || "dev-only-insecure-secret-change-me"
);

export async function hashPassword(pw) {
  return bcrypt.hash(pw, 10);
}

export async function verifyPassword(pw, hash) {
  return bcrypt.compare(pw, hash);
}

export async function createSession(graderId) {
  const token = await new SignJWT({ sub: graderId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

/** Returns the signed-in grader, or null. */
export async function getCurrentGrader() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    const grader = await prisma.grader.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true, isAdmin: true, mustReset: true },
    });
    return grader;
  } catch {
    return null;
  }
}

export async function requireGrader() {
  const grader = await getCurrentGrader();
  if (!grader) throw new Error("UNAUTHORIZED");
  return grader;
}

// --- password reset -------------------------------------------------------

export function newResetToken() {
  const raw = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(raw).digest("hex");
  return { raw, tokenHash };
}

export function hashResetToken(raw) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}
