import { redirect } from "next/navigation";
import { getCurrentGrader } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { APPLICANT_CARD, cardView, defaultCohortId, groupView, listCohorts } from "@/lib/event";
import Nav from "../Nav";
import MyGroupClient from "./MyGroupClient";

export const dynamic = "force-dynamic";

export default async function MyGroupPage({ searchParams }) {
  const grader = await getCurrentGrader();
  if (!grader) redirect("/login");

  const params = await searchParams;
  const cohorts = await listCohorts();

  const mine = await prisma.groupGrader.findMany({
    where: { graderId: grader.id },
    select: { group: { select: { id: true, cohortId: true } } },
  });
  const myCohortIds = new Set(mine.map((m) => m.group.cohortId));

  // Open on a cohort you are sitting in, if there is one today.
  const cohortId = cohorts.some((c) => c.id === params.cohort)
    ? params.cohort
    : defaultCohortId(cohorts.filter((c) => myCohortIds.has(c.id))) || defaultCohortId(cohorts);

  if (!cohortId) {
    return (
      <>
        <Nav grader={grader} />
        <MyGroupClient empty />
      </>
    );
  }

  const [groups, rounds] = await Promise.all([
    prisma.group.findMany({
      where: { cohortId },
      orderBy: { index: "asc" },
      include: { graders: { select: { grader: { select: { id: true, name: true } } } } },
    }),
    prisma.round.findMany({ where: { cohortId }, orderBy: { number: "asc" }, select: { id: true, number: true } }),
  ]);

  const myGroupIds = groups.filter((g) => g.graders.some((x) => x.grader.id === grader.id)).map((g) => g.id);
  const round = rounds.find((r) => r.id === params.round) || rounds[0] || null;
  const groupId = groups.some((g) => g.id === params.group) ? params.group : myGroupIds[0] || null;

  let people = [];
  if (round && groupId) {
    const placements = await prisma.placement.findMany({
      where: { roundId: round.id, groupId },
      select: {
        applicant: {
          select: {
            ...APPLICANT_CARD,
            cohort: { select: { checkedInAt: true } },
            // Only your own notes here: this screen is for writing. Everyone's
            // notes are read together on Rate.
            notes: {
              where: { graderId: grader.id },
              orderBy: { createdAt: "asc" },
              select: {
                id: true,
                body: true,
                createdAt: true,
                round: { select: { number: true } },
                group: { select: { color: true, shape: true } },
              },
            },
          },
        },
      },
    });
    people = placements
      .map(({ applicant: a }) => ({
        ...cardView(a),
        checkedIn: !!a.cohort?.checkedInAt,
        notes: a.notes.map((n) => ({
          id: n.id,
          body: n.body,
          at: n.createdAt.toISOString(),
          round: n.round?.number ?? null,
          group: n.group,
        })),
      }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }

  return (
    <>
      <Nav grader={grader} />
      <MyGroupClient
        cohorts={cohorts}
        cohortId={cohortId}
        rounds={rounds}
        roundId={round?.id || null}
        groups={groups.map(groupView)}
        groupId={groupId}
        myGroupIds={myGroupIds}
        people={people}
      />
    </>
  );
}
