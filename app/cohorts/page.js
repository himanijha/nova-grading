import { redirect } from "next/navigation";
import { getCurrentGrader } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { listCohorts } from "@/lib/event";
import Nav from "../Nav";
import CohortsClient from "./CohortsClient";

export const dynamic = "force-dynamic";

export default async function CohortsPage() {
  const grader = await getCurrentGrader();
  if (!grader) redirect("/login");
  // Deciding who comes when is planning, and planning is the admins'.
  if (!grader.isAdmin) redirect("/groups");

  const [cohorts, sheet, members, signups, applicants] = await Promise.all([
    listCohorts(),
    prisma.eventSheet.findUnique({ where: { id: "main" } }),
    prisma.cohortMember.findMany({
      orderBy: { applicant: { fullName: "asc" } },
      select: { cohortId: true, applicant: { select: { id: true, fullName: true } } },
    }),
    prisma.signup.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, cohortId: true } }),
    prisma.applicant.findMany({
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, uclaEmail: true, cohort: { select: { cohortId: true } } },
    }),
  ]);

  return (
    <>
      <Nav grader={grader} />
      <CohortsClient
        sheet={sheet ? { url: sheet.url, syncedAt: sheet.syncedAt.toISOString() } : null}
        cohorts={cohorts.map((c) => ({
          ...c,
          members: members.filter((m) => m.cohortId === c.id).map((m) => m.applicant.fullName),
        }))}
        signups={signups}
        applicants={applicants.map((a) => ({
          id: a.id,
          fullName: a.fullName,
          uclaEmail: a.uclaEmail,
          inSession: !!a.cohort,
        }))}
      />
    </>
  );
}
