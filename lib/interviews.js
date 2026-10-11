// Reading the interview schedule sheet: one row per room-and-time slot, filled
// in by hand with a candidate and up to two interviewers as the day runs. A
// slot is identified by day + start time + room, not by sheet row, so it keeps
// its notes even as rows above it shift. Interviewers are typed as first names
// only, so a name shared by two graders needs a hand match — see
// InterviewerAlias.
import Papa from "papaparse";
import { prisma } from "./db";
import { normalizeName, sheetCsvUrl } from "./signups";

const HEADER_NEEDLES = ["day", "start", "candidate"];
const HEADER_ROWS = 10;

/**
 * Turn the sheet's cells into slots. Finds the header row by name rather than
 * position, so a banner line above it ("ONLY SUNDAY IS FINALIZED") doesn't
 * throw off the columns. A side table of interviewer free-slot counts can sit
 * in the same rows, past the columns this reads, and is ignored.
 *
 * Returns { slots: [{ day, startRaw, endRaw, room, status, candidateRaw,
 * interviewer1Raw, interviewer2Raw, checkRaw }] }.
 */
export function parseInterviewSheet(rows) {
  const grid = (rows || []).map((r) => (Array.isArray(r) ? r : []).map((c) => String(c ?? "").trim()));
  const headerAt = grid.slice(0, HEADER_ROWS).findIndex((r) => {
    const lower = r.map((c) => c.toLowerCase());
    return HEADER_NEEDLES.every((needle) => lower.includes(needle));
  });
  if (headerAt === -1) return { slots: [] };

  const header = grid[headerAt].map((c) => c.toLowerCase());
  const col = (name) => header.indexOf(name);
  const idx = {
    day: col("day"),
    start: col("start"),
    end: col("end"),
    room: col("room"),
    status: col("status"),
    candidate: col("candidate"),
    role: col("role(s)"),
    interviewer1: col("interviewer 1"),
    interviewer2: col("interviewer 2"),
    check: col("check"),
  };
  if (idx.day === -1 || idx.start === -1 || idx.room === -1) return { slots: [] };

  const slots = [];
  for (const row of grid.slice(headerAt + 1)) {
    const day = row[idx.day] || "";
    const startRaw = row[idx.start] || "";
    const room = row[idx.room] || "";
    // A blank row, or a row that only carries the side helper table.
    if (!day || !startRaw || !room) continue;
    slots.push({
      day,
      startRaw,
      endRaw: idx.end === -1 ? "" : row[idx.end] || "",
      room,
      status: idx.status === -1 ? null : row[idx.status] || null,
      roleRaw: idx.role === -1 ? null : row[idx.role] || null,
      candidateRaw: idx.candidate === -1 ? null : row[idx.candidate] || null,
      interviewer1Raw: idx.interviewer1 === -1 ? null : row[idx.interviewer1] || null,
      interviewer2Raw: idx.interviewer2 === -1 ? null : row[idx.interviewer2] || null,
      checkRaw: idx.check === -1 ? null : row[idx.check] || null,
    });
  }
  return { slots };
}

const DAY_RE = /(\d{1,2})\/(\d{1,2})/;
const TIME_RE = /(\d{1,2}):(\d{2})\s*(am|pm)/i;

/** A number that sorts slots chronologically — "10:00 AM" sorts after "9:00
 * AM" as text, which is wrong, so this parses day + start time into one int. */
export function sortKeyFor(day, startRaw) {
  const d = String(day ?? "").match(DAY_RE);
  const t = String(startRaw ?? "").match(TIME_RE);
  const month = d ? Number(d[1]) : 0;
  const date = d ? Number(d[2]) : 0;
  let hour = t ? Number(t[1]) % 12 : 0;
  if (t && t[3].toLowerCase() === "pm") hour += 12;
  const minute = t ? Number(t[2]) : 0;
  return month * 1000000 + date * 10000 + hour * 100 + minute;
}

/** The first word of a name, normalised — what the sheet gives for an interviewer. */
export function firstNameKey(name) {
  return normalizeName(name).split(" ")[0] || "";
}

/** Graders ({ id, name }) prepared for matchInterviewer. */
export function graderIndex(graders) {
  return graders.map((g) => ({ id: g.id, first: firstNameKey(g.name) }));
}

/**
 * Who a sheet's interviewer first name is, given an alias map (first name →
 * graderId, from hand matches). Returns { status, graderId }: "alias",
 * "exact", "ambiguous" (two graders share the name, needs a hand match) or
 * "none".
 */
export function matchInterviewer(rawName, index, aliases) {
  const key = firstNameKey(rawName);
  if (!key) return { status: "none", graderId: null };
  const aliasId = aliases.get(key);
  if (aliasId) return { status: "alias", graderId: aliasId };
  const matches = index.filter((g) => g.first === key);
  if (matches.length === 1) return { status: "exact", graderId: matches[0].id };
  if (matches.length > 1) return { status: "ambiguous", graderId: null };
  return { status: "none", graderId: null };
}

const slotKey = (s) => `${s.day}\u0000${s.startRaw}\u0000${s.room}`;

/** The sheet's current cells, or { error } saying why they couldn't be read. */
async function fetchSheet(link) {
  const url = sheetCsvUrl(link);
  if (!url) return { error: "That doesn't look like a Google Sheets link." };
  let res;
  try {
    res = await fetch(url, { cache: "no-store" });
  } catch {
    return { error: "Couldn't reach Google Sheets. Try again in a moment." };
  }
  const type = res.headers.get("content-type") || "";
  if (!res.ok || !type.includes("text/csv")) {
    return {
      error:
        "Google wouldn't hand that sheet over. Set its sharing to “Anyone with the link”, then try again.",
    };
  }
  return { rows: Papa.parse(await res.text()).data };
}

/**
 * Make the slots match the sheet: upsert everyone the sheet has, and drop
 * whatever slot used to be there and no longer is (its notes go with it).
 * Both candidates and interviewers are matched by first name — candidates
 * against applicants who passed deliberations to the interviews,
 * interviewers against every grader, with InterviewerAlias as a hand-made
 * override for when two graders share a first name. Safe to call often:
 * unchanged rows are a no-op write.
 *
 * Returns { slots } or { error }.
 */
export async function syncInterviewSchedule(link) {
  const sheet = await fetchSheet(link);
  if (sheet.error) return sheet;
  const { slots } = parseInterviewSheet(sheet.rows);
  if (slots.length === 0) {
    return {
      error:
        "Couldn't find the schedule in that sheet. It needs Day, Start, End, Room and Candidate columns.",
    };
  }

  const [applicants, graders, aliasRows, existing] = await Promise.all([
    prisma.applicant.findMany({
      where: { deliberation: { passedToInterview: true } },
      select: { id: true, fullName: true },
    }),
    prisma.grader.findMany({ select: { id: true, name: true } }),
    prisma.interviewerAlias.findMany(),
    prisma.interviewSlot.findMany({ select: { id: true, day: true, startRaw: true, room: true } }),
  ]);
  const candidateIndex = graderIndex(applicants.map((a) => ({ id: a.id, name: a.fullName })));
  const gIndex = graderIndex(graders);
  const aliases = new Map(aliasRows.map((a) => [a.name, a.graderId]));

  // Candidates are matched by first name alone, same as interviewers: the
  // sheet's spelling of a full name drifts (nicknames, a username tacked on
  // in parens) too easily for an exact match to be worth keeping.
  const resolveCandidate = (raw) => {
    const key = firstNameKey(raw);
    if (!key) return null;
    const matches = candidateIndex.filter((a) => a.first === key);
    return matches.length === 1 ? matches[0].id : null;
  };
  const resolveInterviewer = (raw) => (raw ? matchInterviewer(raw, gIndex, aliases).graderId : null);

  const seenKeys = new Set();
  await prisma.$transaction(async (tx) => {
    for (const slot of slots) {
      seenKeys.add(slotKey(slot));
      const data = {
        endRaw: slot.endRaw,
        status: slot.status,
        roleRaw: slot.roleRaw,
        sortKey: sortKeyFor(slot.day, slot.startRaw),
        candidateRaw: slot.candidateRaw,
        candidateId: resolveCandidate(slot.candidateRaw),
        interviewer1Raw: slot.interviewer1Raw,
        interviewer1Id: resolveInterviewer(slot.interviewer1Raw),
        interviewer2Raw: slot.interviewer2Raw,
        interviewer2Id: resolveInterviewer(slot.interviewer2Raw),
        checkRaw: slot.checkRaw,
      };
      await tx.interviewSlot.upsert({
        where: { day_startRaw_room: { day: slot.day, startRaw: slot.startRaw, room: slot.room } },
        create: { day: slot.day, startRaw: slot.startRaw, room: slot.room, ...data },
        update: data,
      });
    }

    const stale = existing.filter((s) => !seenKeys.has(slotKey(s))).map((s) => s.id);
    if (stale.length) await tx.interviewSlot.deleteMany({ where: { id: { in: stale } } });

    const url = String(link).trim();
    await tx.interviewSheet.upsert({
      where: { id: "main" },
      create: { url },
      update: { url, syncedAt: new Date() },
    });
  });

  return { slots: slots.length };
}
