import { redirect } from "next/navigation";
import { getCurrentGrader } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { normalizeGradYear } from "@/lib/mapping";
import Nav from "../Nav";
import RankingsClient from "./RankingsClient";

export const dynamic = "force-dynamic";

const avg = (nums) =>
  nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;

export default async function RankingsPage() {
  const grader = await getCurrentGrader();
  if (!grader) redirect("/login");

  const rows = await prisma.applicant.findMany({
    select: {
      id: true,
      fullName: true,
      gradYear: true,
      majors: true,
      roleCategory: true,
      grades: {
        select: {
          technical: true,
          thoughtfulness: true,
          initiative: true,
          communityFit: true,
        },
      },
    },
  });

  const applicants = rows.map((a) => {
    const totals = a.grades.map(
      (g) => g.technical + g.thoughtfulness + g.initiative + g.communityFit
    );
    return {
      id: a.id,
      fullName: a.fullName,
      gradYear: normalizeGradYear(a.gradYear) || "Unknown",
      majors: a.majors,
      roleCategory: a.roleCategory,
      reviewCount: a.grades.length,
      average: totals.length ? Number(avg(totals).toFixed(2)) : null,
      criteria: {
        technical: Number(avg(a.grades.map((g) => g.technical)).toFixed(2)),
        thoughtfulness: Number(avg(a.grades.map((g) => g.thoughtfulness)).toFixed(2)),
        initiative: Number(avg(a.grades.map((g) => g.initiative)).toFixed(2)),
        communityFit: Number(avg(a.grades.map((g) => g.communityFit)).toFixed(2)),
      },
    };
  });

  // Highest average first; ties broken by more reviews (more confidence), then name.
  applicants.sort(
    (a, b) =>
      (b.average ?? -1) - (a.average ?? -1) ||
      b.reviewCount - a.reviewCount ||
      a.fullName.localeCompare(b.fullName)
  );

  return (
    <>
      <Nav grader={grader} />
      <RankingsClient applicants={applicants} />
    </>
  );
}
