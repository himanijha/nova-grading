import { redirect } from "next/navigation";
import { getCurrentGrader } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { APPLICANT_CARD, cardView, defaultCohortId, listCohorts } from "@/lib/event";
import Nav from "../Nav";
import RateClient from "./RateClient";

export const dynamic = "force-dynamic";

export default async function RatePage({ searchParams }) {
  const grader = await getCurrentGrader();
  if (!grader) redirect("/login");

  const params = await searchParams;
  const cohorts = await listCohorts();
  const mine = await prisma.groupGrader.findMany({
    where: { graderId: grader.id },
    select: { group: { select: { cohortId: true } } },
  });
  const myCohortIds = new Set(mine.map((m) => m.group.cohortId));
  const cohortId = cohorts.some((c) => c.id === params.cohort)
    ? params.cohort
    : defaultCohortId(cohorts.filter((c) => myCohortIds.has(c.id))) || defaultCohortId(cohorts);

  let people = [];
  if (cohortId) {
    const members = await prisma.cohortMember.findMany({
      where: { cohortId },
      select: {
        applicant: {
          select: {
            ...APPLICANT_CARD,
            placements: {
              select: {
                round: { select: { number: true } },
                group: {
                  select: {
                    color: true,
                    shape: true,
                    graders: { select: { grader: { select: { id: true, name: true } } } },
                  },
                },
              },
            },
            notes: {
              orderBy: { createdAt: "asc" },
              select: {
                id: true,
                body: true,
                createdAt: true,
                graderId: true,
                grader: { select: { name: true } },
                round: { select: { number: true } },
                group: { select: { color: true, shape: true } },
              },
            },
            ratings: {
              select: { value: true, note: true, graderId: true, grader: { select: { name: true } } },
            },
          },
        },
      },
    });

    people = members.map(({ applicant: a }) => {
      // Who sat with this person, round by round — derived from the groups'
      // graders rather than stored, so moving someone updates it.
      const seenBy = a.placements
        .sort((x, y) => x.round.number - y.round.number)
        .map((p) => ({
          round: p.round.number,
          group: { color: p.group.color, shape: p.group.shape },
          graders: p.group.graders.map((g) => g.grader),
        }));
      const myRating = a.ratings.find((r) => r.graderId === grader.id) || null;
      return {
        ...cardView(a),
        seenBy,
        watchedByMe: seenBy.some((s) => s.graders.some((g) => g.id === grader.id)),
        notes: a.notes.map((n) => ({
          id: n.id,
          body: n.body,
          at: n.createdAt.toISOString(),
          graderName: n.grader.name,
          mine: n.graderId === grader.id,
          round: n.round?.number ?? null,
          group: n.group,
        })),
        myRating: myRating ? { value: myRating.value, note: myRating.note } : null,
        // Other people's thumbs stay hidden until you have given yours, the
        // same rule as rubric scores on Grading: form your own view first.
        others: myRating
          ? a.ratings
              .filter((r) => r.graderId !== grader.id)
              .map((r) => ({ value: r.value, note: r.note, graderName: r.grader.name }))
          : null,
        otherCount: a.ratings.filter((r) => r.graderId !== grader.id).length,
      };
    });
    people.sort((a, b) => a.fullName.localeCompare(b.fullName));
  }

  return (
    <>
      <Nav grader={grader} />
      <RateClient cohorts={cohorts} cohortId={cohortId} people={people} />
    </>
  );
}
