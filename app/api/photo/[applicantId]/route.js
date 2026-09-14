import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentGrader } from "@/lib/auth";

export const runtime = "nodejs";

/** Serves a mugshot. Signed-in only — these are photographs of real people. */
export async function GET(_req, { params }) {
  const grader = await getCurrentGrader();
  if (!grader) return new NextResponse("Not signed in.", { status: 401 });

  const { applicantId } = await params;
  const photo = await prisma.applicantPhoto.findUnique({
    where: { applicantId },
    select: { data: true, mimeType: true, updatedAt: true },
  });
  if (!photo) return new NextResponse("No photo.", { status: 404 });

  return new NextResponse(Buffer.from(photo.data), {
    headers: {
      "Content-Type": photo.mimeType,
      // Private: it must not sit in a shared cache, but re-fetching it on every
      // keystroke of a search would be silly. The URL carries ?v= on change.
      "Cache-Control": "private, max-age=300",
      "Last-Modified": photo.updatedAt.toUTCString(),
    },
  });
}
