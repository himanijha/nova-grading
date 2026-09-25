import { redirect } from "next/navigation";
import { getCurrentGrader } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { listCohorts } from "@/lib/event";
import { normalizeGradYear } from "@/lib/mapping";
import Nav from "../Nav";
import CohortsClient from "./CohortsClient";

export const dynamic = "force-dynamic";

export default async function CohortsPage() {
  const grader = await getCurrentGrader();
  if (!grader) redirect("/login");
  // Deciding who comes when is planning, and planning is the admins'.
  if (!grader.isAdmin) redirect("/groups");

  const [cohorts, passed] = await Promise.all([
    listCohorts(),
    prisma.applicant.findMany({
      where: { screeningStatus: "PASSED" },
      orderBy: { fullName: "asc" },
      select: {
        id: true,
        fullName: true,
        uclaEmail: true,
        contactEmail: true,
        gradYear: true,
        cohort: { select: { cohortId: true } },
      },
    }),
  ]);

  const people = passed.map((a) => ({
    id: a.id,
    fullName: a.fullName,
    uclaEmail: a.uclaEmail,
    contactEmail: a.contactEmail,
    gradYear: normalizeGradYear(a.gradYear) || "",
    cohortId: a.cohort?.cohortId || null,
  }));

  return (
    <>
      <Nav grader={grader} />
      <CohortsClient cohorts={cohorts} people={people} />
    </>
  );
}
