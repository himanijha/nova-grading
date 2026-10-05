import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { bad, gate } from "@/lib/event";

/**
 * Save where people were dragged to in Rankings:
 * { updates: [{ applicantId, rankScore }] }, a null rankScore putting someone
 * back at their average. Any grader can reorder; everyone sees the result.
 */
export async function POST(req) {
  const { error } = await gate();
  if (error) return error;

  const { updates } = await req.json().catch(() => ({}));
  if (!Array.isArray(updates) || updates.length === 0) return bad("Nothing to save.");
  if (
    updates.some(
      (u) =>
        !u?.applicantId ||
        typeof u.applicantId !== "string" ||
        !(u.rankScore === null || Number.isFinite(u.rankScore))
    )
  ) {
    return bad("Each update needs an applicant and a score.");
  }

  await prisma.$transaction(
    updates.map((u) =>
      prisma.applicant.updateMany({ where: { id: u.applicantId }, data: { rankScore: u.rankScore } })
    )
  );

  return NextResponse.json({ ok: true, saved: updates.length });
}
