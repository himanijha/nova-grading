import { redirect } from "next/navigation";
import { getCurrentGrader } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { APPLICANT_CARD, cardView, listCohorts } from "@/lib/event";
import { symbolMeta } from "@/lib/symbols";
import { ratingMeta } from "@/lib/ratings";
import Nav from "../Nav";
import DeliberationsClient from "./DeliberationsClient";

export const dynamic = "force-dynamic";

/**
 * Deliberations walk through round 3 one symbol group at a time. Cohorts come
 * in the order people attended them, so the earliest cohort's groups are first.
 */
export default async function DeliberationsPage() {
  const grader = await getCurrentGrader();
  if (!grader) redirect("/login");

  const [cohorts, rounds, verdictRows] = await Promise.all([
    listCohorts(),
    prisma.round.findMany({
      where: { number: 3 },
      select: {
        cohortId: true,
        placements: {
          select: {
            applicantId: true,
            group: { select: { id: true, index: true, color: true, shape: true } },
          },
        },
      },
    }),
    prisma.deliberationVerdict.findMany({
      orderBy: { position: "asc" },
      select: { applicantId: true, verdict: true },
    }),
  ]);

  const roundByCohort = new Map(rounds.map((r) => [r.cohortId, r]));
  const placed = [];
  const queueSeed = [];
  for (const c of cohorts) {
    const round = roundByCohort.get(c.id);
    if (!round) continue;
    const groups = new Map();
    for (const p of round.placements) {
      const g = groups.get(p.group.id) || { group: p.group, applicantIds: [] };
      g.applicantIds.push(p.applicantId);
      groups.set(p.group.id, g);
      placed.push(p.applicantId);
    }
    for (const g of [...groups.values()].sort((a, b) => a.group.index - b.group.index)) {
      queueSeed.push({ cohortId: c.id, cohortName: c.name, ...g });
    }
  }

  const applicants = await prisma.applicant.findMany({
    where: { id: { in: placed } },
    select: {
      ...APPLICANT_CARD,
      ratings: {
        select: { value: true, note: true, grader: { select: { name: true } } },
      },
      notes: {
        orderBy: { createdAt: "asc" },
        select: {
          body: true,
          grader: { select: { name: true } },
          round: { select: { number: true } },
          group: { select: { color: true, shape: true } },
        },
      },
    },
  });
  const byId = new Map(applicants.map((a) => [a.id, a]));

  // Round 3 groups as the client shows them. Names sorted within each group.
  const queue = queueSeed.map((g) => {
    const meta = symbolMeta(g.group.color, g.group.shape);
    return {
      key: g.group.id,
      cohortName: g.cohortName,
      groupName: meta.name,
      hex: meta.hex,
      color: g.group.color,
      shape: g.group.shape,
      applicantIds: g.applicantIds
        .map((id) => byId.get(id))
        .filter(Boolean)
        .sort((a, b) => a.fullName.localeCompare(b.fullName))
        .map((a) => a.id),
    };
  });

  const people = Object.fromEntries(
    applicants.map((a) => [
      a.id,
      {
        ...cardView(a),
        ratings: a.ratings.map((r) => ({
          value: r.value,
          icon: ratingMeta(r.value)?.icon || "",
          label: ratingMeta(r.value)?.label || r.value,
          note: r.note,
          graderName: r.grader.name,
        })),
        eventNotes: a.notes.map((n) => ({
          body: n.body,
          graderName: n.grader.name,
          round: n.round?.number ?? null,
          group: n.group ? { color: n.group.color, shape: n.group.shape } : null,
        })),
      },
    ])
  );

  const ranking = verdictRows.map((r) => ({ applicantId: r.applicantId, verdict: r.verdict }));

  return (
    <>
      <Nav grader={grader} />
      <DeliberationsClient
        queue={queue}
        people={people}
        ranking={ranking}
        isAdmin={grader.isAdmin}
      />
    </>
  );
}
