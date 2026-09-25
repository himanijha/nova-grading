import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { bad, gate } from "@/lib/event";

/** { applicantId, arrived } — any grader on the door can do this. */
export async function POST(req) {
  const { error } = await gate();
  if (error) return error;

  const { applicantId, arrived } = await req.json().catch(() => ({}));
  if (!applicantId) return bad("Missing applicant.");

  const { count } = await prisma.cohortMember.updateMany({
    where: { applicantId },
    data: { checkedInAt: arrived ? new Date() : null },
  });
  if (count === 0) return bad("That person is not in a cohort.", 404);
  return NextResponse.json({ ok: true });
}
