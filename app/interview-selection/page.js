import { redirect } from "next/navigation";
import { getCurrentGrader } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ratingScore, ratingTally } from "@/lib/ratings";
import { normalizeGradYear } from "@/lib/mapping";
import Nav from "../Nav";
import InterviewClient from "./InterviewClient";

export const dynamic = "force-dynamic";

export default async function InterviewSelectionPage() {
  const grader = await getCurrentGrader();
  if (!grader) redirect("/login");

  const rows = await prisma.applicant.findMany({
    select: {
      id: true,
      fullName: true,
      gradYear: true,
      majors: true,
      roleCategory: true,
      photo: { select: { updatedAt: true } },
      ratings: {
        select: { value: true, note: true, grader: { select: { name: true } } },
      },
    },
  });

  // This page deliberately ignores the rubric scores. Interview selection is a
  // separate judgement, and mixing the two would quietly reintroduce the
  // ranking the team already moved past.
  const applicants = rows.map((a) => ({
    id: a.id,
    fullName: a.fullName,
    // Canonical, so a cohort gets one cutoff rather than one per spelling.
    gradYear: normalizeGradYear(a.gradYear) || "Unknown",
    majors: a.majors,
    roleCategory: a.roleCategory,
    hasPhoto: !!a.photo,
    photoVersion: a.photo ? a.photo.updatedAt.getTime() : null,
    score: ratingScore(a.ratings),
    ratingCount: a.ratings.length,
    tally: ratingTally(a.ratings).map(({ value, short, icon, count }) => ({
      value,
      short,
      icon,
      count,
    })),
    ratings: a.ratings.map((r) => ({
      value: r.value,
      note: r.note,
      graderName: r.grader.name,
    })),
  }));

  applicants.sort(
    (a, b) =>
      (b.score ?? -1) - (a.score ?? -1) ||
      b.ratingCount - a.ratingCount ||
      a.fullName.localeCompare(b.fullName)
  );

  return (
    <>
      <Nav grader={grader} />
      <InterviewClient applicants={applicants} />
    </>
  );
}
