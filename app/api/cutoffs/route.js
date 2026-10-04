import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { bad, gate } from "@/lib/event";

const MAX_SCORE = 20;

/**
 * Save Rankings cutoffs: { cutoffs: { [gradYear]: score } }. Any grader can
 * move them, like the ranking order; everyone sees the result.
 */
export async function POST(req) {
  const { error } = await gate();
  if (error) return error;

  const { cutoffs } = await req.json().catch(() => ({}));
  const entries = Object.entries(cutoffs && typeof cutoffs === "object" ? cutoffs : {});
  if (entries.length === 0) return bad("Nothing to save.");
  if (entries.some(([y, c]) => !y || y.length > 100 || !Number.isFinite(c) || c < 0 || c > MAX_SCORE)) {
    return bad(`Each cutoff needs a year and a score from 0 to ${MAX_SCORE}.`);
  }

  await prisma.$transaction(
    entries.map(([gradYear, cutoff]) =>
      prisma.rankingCutoff.upsert({ where: { gradYear }, create: { gradYear, cutoff }, update: { cutoff } })
    )
  );
  return NextResponse.json({ ok: true, saved: entries.length });
}
