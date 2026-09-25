import { redirect } from "next/navigation";
import { getCurrentGrader } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { listCohorts } from "@/lib/event";
import { symbolMeta } from "@/lib/symbols";
import Nav from "../Nav";
import EventClient from "./EventClient";

export const dynamic = "force-dynamic";

export default async function EventPage() {
  const grader = await getCurrentGrader();
  if (!grader) redirect("/login");

  const [statusRows, graded, cohorts, unassigned] = await Promise.all([
    prisma.applicant.groupBy({ by: ["screeningStatus"], _count: true }),
    prisma.applicant.count({ where: { grades: { some: {} } } }),
    listCohorts(),
    prisma.applicant.count({ where: { screeningStatus: "PASSED", cohort: null } }),
  ]);
  const screening = { PASSED: 0, REJECTED: 0, PENDING: 0 };
  for (const r of statusRows) screening[r.screeningStatus] = r._count;

  const details = await Promise.all(
    cohorts.map(async (c) => {
      const [groups, rounds, members] = await Promise.all([
        prisma.group.findMany({
          where: { cohortId: c.id },
          orderBy: { index: "asc" },
          select: { color: true, shape: true, graders: { select: { graderId: true } } },
        }),
        prisma.round.count({ where: { cohortId: c.id } }),
        prisma.cohortMember.findMany({
          where: { cohortId: c.id },
          select: {
            checkedInAt: true,
            applicant: {
              select: {
                photo: { select: { id: true } },
                _count: { select: { notes: true, ratings: true } },
                ratings: { where: { graderId: grader.id }, select: { id: true } },
                placements: {
                  select: { group: { select: { graders: { select: { graderId: true } } } } },
                },
              },
            },
          },
        }),
      ]);

      const mine = groups.filter((g) => g.graders.some((x) => x.graderId === grader.id));
      const watched = members.filter((m) =>
        m.applicant.placements.some((p) => p.group.graders.some((x) => x.graderId === grader.id))
      );
      return {
        ...c,
        groups: groups.length,
        groupsWithGrader: groups.filter((g) => g.graders.length > 0).length,
        rounds,
        arrived: members.filter((m) => m.checkedInAt).length,
        photos: members.filter((m) => m.applicant.photo).length,
        notes: members.reduce((n, m) => n + m.applicant._count.notes, 0),
        rated: members.filter((m) => m.applicant._count.ratings > 0).length,
        myGroups: mine.map((g) => symbolMeta(g.color, g.shape).name),
        watched: watched.length,
        watchedRated: watched.filter((m) => m.applicant.ratings.length > 0).length,
      };
    })
  );

  return (
    <>
      <Nav grader={grader} />
      <EventClient
        isAdmin={grader.isAdmin}
        screening={screening}
        graded={graded}
        unassigned={unassigned}
        cohorts={details}
      />
    </>
  );
}
