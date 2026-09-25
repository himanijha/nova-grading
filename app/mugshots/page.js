import { redirect } from "next/navigation";
import { getCurrentGrader } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { APPLICANT_CARD, cardView, defaultCohortId, listCohorts } from "@/lib/event";
import { symbolMeta } from "@/lib/symbols";
import Nav from "../Nav";
import MugshotsClient from "./MugshotsClient";

export const dynamic = "force-dynamic";

export default async function MugshotsPage({ searchParams }) {
  const grader = await getCurrentGrader();
  if (!grader) redirect("/login");

  const cohorts = await listCohorts();
  const { cohort: asked } = await searchParams;
  const cohortId = cohorts.some((c) => c.id === asked) ? asked : defaultCohortId(cohorts);

  let people = [];
  if (cohortId) {
    const [members, rounds] = await Promise.all([
      prisma.cohortMember.findMany({
        where: { cohortId },
        select: { checkedInAt: true, applicant: { select: APPLICANT_CARD } },
      }),
      prisma.round.findMany({
        where: { cohortId },
        orderBy: { number: "asc" },
        select: {
          number: true,
          placements: {
            select: { applicantId: true, group: { select: { color: true, shape: true } } },
          },
        },
      }),
    ]);

    // Each person's groups in round order, to read out at the door.
    const schedule = (id) =>
      rounds.map((r) => {
        const p = r.placements.find((x) => x.applicantId === id);
        return {
          round: r.number,
          group: p ? { ...p.group, name: symbolMeta(p.group.color, p.group.shape).name } : null,
        };
      });

    people = members
      .map((m) => ({
        ...cardView(m.applicant),
        checkedIn: !!m.checkedInAt,
        schedule: schedule(m.applicant.id),
      }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }

  return (
    <>
      <Nav grader={grader} />
      <MugshotsClient cohorts={cohorts} cohortId={cohortId} people={people} />
    </>
  );
}
