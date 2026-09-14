import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "./db";

const COOKIE = "nova_session";

// The dev fallback below is public — it is in this repo's history, and the
// placeholder in .env.example is too. Either one would let anyone forge a
// session cookie for any grader, so refuse to start in production without a
// real secret rather than quietly shipping a forgeable one.
const DEV_SECRET = "dev-only-insecure-secret-change-me";
const PLACEHOLDER = "change-me-to-a-long-random-string-please-0123456789";

// Resolved per call rather than at module load: `next build` runs with
// NODE_ENV=production, and failing there would break the build on any machine
// without a production secret. Failing on the request is the useful moment.
function secret() {
  const s = process.env.SESSION_SECRET;
  if (process.env.NODE_ENV === "production") {
    if (!s || s === DEV_SECRET || s === PLACEHOLDER) {
      throw new Error(
        "SESSION_SECRET is missing or still the example value. Generate one with:\n" +
          '  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
      );
    }
    if (s.length < 32) {
      throw new Error("SESSION_SECRET must be at least 32 characters.");
    }
  }
  return new TextEncoder().encode(s || DEV_SECRET);
}

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
    .sign(secret());

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

  // Outside the try: a bad or missing SESSION_SECRET is a misconfiguration,
  // and silently reporting everyone as signed out would hide it.
  const key = secret();
  try {
    const { payload } = await jwtVerify(token, key);
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
