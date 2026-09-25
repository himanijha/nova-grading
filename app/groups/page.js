import { redirect } from "next/navigation";
import { getCurrentGrader } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { APPLICANT_CARD, cardView, defaultCohortId, groupView, listCohorts } from "@/lib/event";
import Nav from "../Nav";
import GroupsClient from "./GroupsClient";

export const dynamic = "force-dynamic";

export default async function GroupsPage({ searchParams }) {
  const grader = await getCurrentGrader();
  if (!grader) redirect("/login");

  const cohorts = await listCohorts();
  const { cohort: asked } = await searchParams;
  const cohortId = cohorts.some((c) => c.id === asked) ? asked : defaultCohortId(cohorts);

  let board = null;
  if (cohortId) {
    const [groups, rounds, members] = await Promise.all([
      prisma.group.findMany({
        where: { cohortId },
        orderBy: { index: "asc" },
        include: { graders: { select: { grader: { select: { id: true, name: true } } } } },
      }),
      prisma.round.findMany({
        where: { cohortId },
        orderBy: { number: "asc" },
        select: {
          id: true,
          number: true,
          placements: { select: { applicantId: true, groupId: true } },
        },
      }),
      prisma.cohortMember.findMany({
        where: { cohortId },
        select: { checkedInAt: true, applicant: { select: APPLICANT_CARD } },
      }),
    ]);
    board = {
      groups: groups.map(groupView),
      rounds: rounds.map((r) => ({
        id: r.id,
        number: r.number,
        placement: Object.fromEntries(r.placements.map((p) => [p.applicantId, p.groupId])),
      })),
      members: members
        .map((m) => ({ ...cardView(m.applicant), checkedIn: !!m.checkedInAt }))
        .sort((a, b) => a.fullName.localeCompare(b.fullName)),
    };
  }

  const graders = grader.isAdmin
    ? await prisma.grader.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } })
    : [];

  return (
    <>
      <Nav grader={grader} />
      <GroupsClient
        cohorts={cohorts}
        cohortId={cohortId}
        board={board}
        graders={graders}
        isAdmin={grader.isAdmin}
      />
    </>
  );
}
