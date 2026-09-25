import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { bad, fillRound, gate } from "@/lib/event";
import { groupSymbol } from "@/lib/symbols";

const MAX_GROUPS = 40;
const MAX_ROUNDS = 12;

/** Planning the rooms is the admins' job; one route, one action per request. */
export async function POST(req) {
  const { error } = await gate({ admin: true });
  if (error) return error;

  const body = await req.json().catch(() => ({}));

  switch (body.action) {
    // Grow or shrink the set of symbols. New groups get the next symbols in
    // order and start empty. Removed groups are always the last ones; in each
    // round their people go to the smallest remaining groups, so nobody is
    // silently dropped.
    case "setGroupCount": {
      const count = Math.floor(Number(body.count));
      if (!(count >= 1 && count <= MAX_GROUPS)) return bad(`Pick between 1 and ${MAX_GROUPS} groups.`);
      await prisma.$transaction(async (tx) => {
        const groups = await tx.group.findMany({
          where: { cohortId: body.cohortId },
          orderBy: { index: "asc" },
          select: { id: true, index: true },
        });
        if (groups.length > count) {
          const kept = groups.slice(0, count).map((g) => g.id);
          const removed = groups.slice(count).map((g) => g.id);
          const rounds = await tx.round.findMany({
            where: { cohortId: body.cohortId },
            select: { id: true, placements: { select: { applicantId: true, groupId: true } } },
          });
          for (const r of rounds) {
            const size = Object.fromEntries(kept.map((id) => [id, 0]));
            for (const p of r.placements) if (p.groupId in size) size[p.groupId]++;
            for (const p of r.placements.filter((x) => removed.includes(x.groupId))) {
              const smallest = kept.reduce((a, id) => (size[id] < size[a] ? id : a), kept[0]);
              size[smallest]++;
              await tx.placement.update({
                where: { roundId_applicantId: { roundId: r.id, applicantId: p.applicantId } },
                data: { groupId: smallest },
              });
            }
          }
          await tx.group.deleteMany({ where: { id: { in: removed } } });
        }
        const data = [];
        for (let i = groups.length; i < count; i++) {
          const s = groupSymbol(i);
          data.push({ cohortId: body.cohortId, index: i, color: s.color, shape: s.shape });
        }
        if (data.length) await tx.group.createMany({ data });
      });
      return NextResponse.json({ ok: true });
    }

    // { groupId, graderIds } — replaces who sits at this symbol. A grader
    // sits at one symbol per cohort, so adding them here takes them off any
    // other group in the same cohort.
    case "setGraders": {
      const graderIds = Array.isArray(body.graderIds) ? [...new Set(body.graderIds)] : [];
      const group = await prisma.group.findUnique({ where: { id: body.groupId }, select: { cohortId: true } });
      if (!group) return bad("Group not found.", 404);
      await prisma.$transaction([
        prisma.groupGrader.deleteMany({
          where: {
            OR: [
              { groupId: body.groupId },
              { graderId: { in: graderIds }, group: { cohortId: group.cohortId } },
            ],
          },
        }),
        prisma.groupGrader.createMany({
          data: graderIds.map((graderId) => ({ groupId: body.groupId, graderId })),
        }),
      ]);
      return NextResponse.json({ ok: true });
    }

    // Throw away every round and plan `rounds` new ones, each mixed against
    // the ones before it.
    case "generate": {
      const rounds = Math.floor(Number(body.rounds));
      if (!(rounds >= 1 && rounds <= MAX_ROUNDS)) return bad(`Pick between 1 and ${MAX_ROUNDS} rounds.`);
      const groups = await prisma.group.count({ where: { cohortId: body.cohortId } });
      if (groups === 0) return bad("Add groups before planning rounds.");
      await prisma.$transaction(
        async (tx) => {
          await tx.round.deleteMany({ where: { cohortId: body.cohortId } });
          for (let n = 1; n <= rounds; n++) {
            const round = await tx.round.create({ data: { cohortId: body.cohortId, number: n } });
            await fillRound(tx, { cohortId: body.cohortId, roundId: round.id });
          }
        },
        { timeout: 30000 }
      );
      return NextResponse.json({ ok: true });
    }

    case "addRound": {
      const groups = await prisma.group.count({ where: { cohortId: body.cohortId } });
      if (groups === 0) return bad("Add groups before planning rounds.");
      await prisma.$transaction(
        async (tx) => {
          const last = await tx.round.findFirst({
            where: { cohortId: body.cohortId },
            orderBy: { number: "desc" },
            select: { number: true },
          });
          if ((last?.number || 0) >= MAX_ROUNDS) throw new Error("TOO_MANY");
          const round = await tx.round.create({
            data: { cohortId: body.cohortId, number: (last?.number || 0) + 1 },
          });
          await fillRound(tx, { cohortId: body.cohortId, roundId: round.id });
        },
        { timeout: 30000 }
      ).catch((e) => {
        if (e.message !== "TOO_MANY") throw e;
      });
      return NextResponse.json({ ok: true });
    }

    // Re-roll one round, mixed against all the others.
    case "reshuffleRound": {
      const round = await prisma.round.findUnique({ where: { id: body.roundId } });
      if (!round) return bad("Round not found.", 404);
      await prisma.$transaction(
        (tx) => fillRound(tx, { cohortId: round.cohortId, roundId: round.id, excludeRoundId: round.id }),
        { timeout: 30000 }
      );
      return NextResponse.json({ ok: true });
    }

    // Remove a round and close the gap in the numbering.
    case "deleteRound": {
      const round = await prisma.round.findUnique({ where: { id: body.roundId } });
      if (!round) return NextResponse.json({ ok: true });
      await prisma.$transaction(async (tx) => {
        await tx.round.delete({ where: { id: round.id } });
        const later = await tx.round.findMany({
          where: { cohortId: round.cohortId, number: { gt: round.number } },
          orderBy: { number: "asc" },
        });
        for (const r of later) {
          await tx.round.update({ where: { id: r.id }, data: { number: r.number - 1 } });
        }
      });
      return NextResponse.json({ ok: true });
    }

    // { roundId, applicantId, groupId | null } — one person, one round.
    case "move": {
      const { roundId, applicantId, groupId } = body;
      if (!roundId || !applicantId) return bad("Missing round or applicant.");
      if (!groupId) {
        await prisma.placement.deleteMany({ where: { roundId, applicantId } });
        return NextResponse.json({ ok: true });
      }
      const [round, group, member] = await Promise.all([
        prisma.round.findUnique({ where: { id: roundId }, select: { cohortId: true } }),
        prisma.group.findUnique({ where: { id: groupId }, select: { cohortId: true } }),
        prisma.cohortMember.findUnique({ where: { applicantId }, select: { cohortId: true } }),
      ]);
      if (!round || !group || !member) return bad("Round, group or person not found.", 404);
      if (round.cohortId !== group.cohortId || member.cohortId !== round.cohortId) {
        return bad("That person, round and group are not all in the same cohort.");
      }
      await prisma.placement.upsert({
        where: { roundId_applicantId: { roundId, applicantId } },
        create: { roundId, applicantId, groupId },
        update: { groupId },
      });
      return NextResponse.json({ ok: true });
    }

    // Put anyone without a group this round (late additions, or people whose
    // group was removed) into the smallest groups, leaving everyone else put.
    case "placeUnplaced": {
      const round = await prisma.round.findUnique({ where: { id: body.roundId } });
      if (!round) return bad("Round not found.", 404);
      await prisma.$transaction(async (tx) => {
        const [members, groups, placements] = await Promise.all([
          tx.cohortMember.findMany({ where: { cohortId: round.cohortId }, select: { applicantId: true } }),
          tx.group.findMany({ where: { cohortId: round.cohortId }, orderBy: { index: "asc" }, select: { id: true } }),
          tx.placement.findMany({ where: { roundId: round.id }, select: { applicantId: true, groupId: true } }),
        ]);
        if (groups.length === 0) return;
        const size = Object.fromEntries(groups.map((g) => [g.id, 0]));
        for (const p of placements) size[p.groupId]++;
        const placed = new Set(placements.map((p) => p.applicantId));
        const data = [];
        for (const m of members) {
          if (placed.has(m.applicantId)) continue;
          const smallest = groups.reduce((a, g) => (size[g.id] < size[a.id] ? g : a), groups[0]);
          size[smallest.id]++;
          data.push({ roundId: round.id, applicantId: m.applicantId, groupId: smallest.id });
        }
        if (data.length) await tx.placement.createMany({ data });
      });
      return NextResponse.json({ ok: true });
    }

    default:
      return bad("Unknown action.");
  }
}
