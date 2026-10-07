// Server-side helpers for the meet and greet: who may change what, and the
// reads several pages share.
import { NextResponse } from "next/server";
import { getCurrentGrader } from "./auth";
import { prisma } from "./db";
import { generateRound, seatNewcomer } from "./grouping";
import { symbolMeta } from "./symbols";

export const SCREENING = ["PENDING", "PASSED", "REJECTED"];

/** For API routes: { grader } when signed in (and an admin, if asked), else { error }. */
export async function gate({ admin = false } = {}) {
  const grader = await getCurrentGrader();
  if (!grader) return { error: NextResponse.json({ error: "Not signed in." }, { status: 401 }) };
  if (admin && !grader.isAdmin) {
    return { error: NextResponse.json({ error: "Admins only." }, { status: 403 }) };
  }
  return { grader };
}

export const bad = (error, status = 400) => NextResponse.json({ error }, { status });

/**
 * Take people out of whatever groups they were placed in. An applicant is in
 * one cohort, so all their placements belong to it — anyone leaving or
 * changing cohort loses the lot.
 */
export async function clearPlacements(tx, applicantIds) {
  if (applicantIds.length === 0) return;
  await tx.placement.deleteMany({ where: { applicantId: { in: applicantIds } } });
}

/** Earlier rounds as Map(applicantId → groupId), oldest first, for the mixer. */
export async function roundHistory(tx, cohortId, { excludeRoundId } = {}) {
  const rounds = await tx.round.findMany({
    where: { cohortId, ...(excludeRoundId ? { id: { not: excludeRoundId } } : {}) },
    orderBy: { number: "asc" },
    select: { placements: { select: { applicantId: true, groupId: true } } },
  });
  return rounds.map((r) => new Map(r.placements.map((p) => [p.applicantId, p.groupId])));
}

/** Split a cohort's members into its groups for one round and save it. */
export async function fillRound(tx, { cohortId, roundId, excludeRoundId }) {
  const [members, groups, history] = await Promise.all([
    tx.cohortMember.findMany({ where: { cohortId }, select: { applicantId: true } }),
    tx.group.findMany({ where: { cohortId }, orderBy: { index: "asc" }, select: { id: true } }),
    roundHistory(tx, cohortId, { excludeRoundId }),
  ]);
  const split = generateRound(
    members.map((m) => m.applicantId),
    groups.map((g) => g.id),
    history
  );
  await tx.placement.deleteMany({ where: { roundId } });
  if (split.size) {
    await tx.placement.createMany({
      data: [...split].map(([applicantId, groupId]) => ({ roundId, applicantId, groupId })),
    });
  }
}

/**
 * Give someone who joined late a seat in every round already planned, without
 * moving anyone else.
 */
export async function seatLatecomer(tx, cohortId, applicantId) {
  const [groups, rounds] = await Promise.all([
    tx.group.findMany({ where: { cohortId }, orderBy: { index: "asc" }, select: { id: true } }),
    tx.round.findMany({
      where: { cohortId },
      orderBy: { number: "asc" },
      select: { id: true, placements: { select: { applicantId: true, groupId: true } } },
    }),
  ]);
  const seats = seatNewcomer(
    groups.map((g) => g.id),
    rounds.map(
      (r) => new Map(r.placements.filter((p) => p.applicantId !== applicantId).map((p) => [p.applicantId, p.groupId]))
    )
  );
  if (seats.length === 0) return;
  await tx.placement.deleteMany({ where: { applicantId, roundId: { in: rounds.map((r) => r.id) } } });
  await tx.placement.createMany({
    data: rounds.map((r, i) => ({ roundId: r.id, applicantId, groupId: seats[i] })),
  });
}

/** A group as the client wants it: symbol details alongside the ids. */
export function groupView(g) {
  const meta = symbolMeta(g.color, g.shape);
  return {
    id: g.id,
    index: g.index,
    color: g.color,
    shape: g.shape,
    name: meta.name,
    hex: meta.hex,
    graders: (g.graders || []).map((x) => ({ id: x.grader.id, name: x.grader.name })),
  };
}

/** The bits of an applicant every event screen shows. */
export const APPLICANT_CARD = {
  id: true,
  fullName: true,
  uclaEmail: true,
  contactEmail: true,
  gradYear: true,
  majors: true,
  roleCategory: true,
  photo: { select: { updatedAt: true } },
};

export function cardView(a) {
  return {
    id: a.id,
    fullName: a.fullName,
    uclaEmail: a.uclaEmail,
    contactEmail: a.contactEmail,
    gradYear: a.gradYear,
    majors: a.majors,
    roleCategory: a.roleCategory,
    hasPhoto: !!a.photo,
    photoVersion: a.photo ? a.photo.updatedAt.getTime() : null,
  };
}

/**
 * The cohort a page should open on when none is picked: the one happening
 * now or next, falling back to the earliest.
 */
export function defaultCohortId(cohorts, now = new Date()) {
  if (cohorts.length === 0) return null;
  const HOUR = 60 * 60 * 1000;
  const timed = cohorts.filter((c) => c.startsAt);
  const current = timed
    .filter((c) => new Date(c.startsAt).getTime() + 2 * HOUR > now.getTime())
    .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt))[0];
  return (current || cohorts[0]).id;
}

/** Cohorts in the order people attend them: by start time, untimed last. */
export async function listCohorts() {
  const rows = await prisma.cohort.findMany({
    select: {
      id: true,
      name: true,
      startsAt: true,
      capacity: true,
      location: true,
      sheetCol: true,
      createdAt: true,
      _count: { select: { members: true } },
    },
  });
  return rows
    .map((c) => ({
      id: c.id,
      name: c.name,
      startsAt: c.startsAt ? c.startsAt.toISOString() : null,
      capacity: c.capacity,
      location: c.location,
      fromSheet: c.sheetCol != null,
      memberCount: c._count.members,
      createdAt: c.createdAt.getTime(),
    }))
    .sort(
      (a, b) =>
        (a.startsAt ? 0 : 1) - (b.startsAt ? 0 : 1) ||
        (a.startsAt || "").localeCompare(b.startsAt || "") ||
        a.createdAt - b.createdAt
    );
}
