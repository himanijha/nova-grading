// Reading the meet and greet sign-up sheet into the database. The sheet is the
// only say on who comes and when: each slot column is a session, and each name
// under it is an applicant — or, until someone finds their application, a
// Signup waiting to be matched.
import Papa from "papaparse";
import { prisma } from "./db";
import { clearPlacements } from "./event";
import {
  EVENT_TZ,
  matchName,
  nameIndex,
  normalizeName,
  parseSignupSheet,
  sessionName,
  sheetCsvUrl,
  zonedTime,
} from "./signups";

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
  // A sheet that isn't shared answers with a sign-in page rather than an error.
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
 * Make the sessions and who is in them match the sheet.
 *
 * A name goes to the applicant with exactly that name, or to whoever it was
 * matched to by hand before. Anything else is left as a Signup for a person to
 * settle — a near-miss is never guessed at, because a wrong guess would file
 * notes and ratings under someone else's application.
 *
 * Safe to run again: people already in the right session keep their check-in
 * and their groups. Only someone who has changed session, or left the sheet,
 * loses their place in the groups. Anyone put in a session by hand stays
 * there: the sheet got them wrong once, which is why someone stepped in.
 *
 * Returns { sessions, matched, unmatched } or { error }.
 */
export async function syncSheet(link) {
  const sheet = await fetchSheet(link);
  if (sheet.error) return sheet;
  const { slots } = parseSignupSheet(sheet.rows);
  if (slots.length === 0) {
    return {
      error:
        "Couldn't find any time slots in that sheet. Each slot needs its own column, with a time like “8:00-9:00pm” above the names.",
    };
  }

  const [applicants, byHand] = await Promise.all([
    prisma.applicant.findMany({ select: { id: true, fullName: true } }),
    prisma.nameMatch.findMany(),
  ]);
  const index = nameIndex(applicants);
  const known = new Set(applicants.map((a) => a.id));
  const remembered = new Map(byHand.map((m) => [m.name, m.applicantId]));
  // The sheet gives a month and a day; the year is this one, on campus.
  const year = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: EVENT_TZ, year: "numeric" }).format(new Date())
  );

  return prisma.$transaction(async (tx) => {
    const cohortOf = new Map(); // applicantId → cohortId
    const byHandRows = await tx.cohortMember.findMany({ where: { byHand: true }, select: { applicantId: true } });
    const placedByHand = new Set(byHandRows.map((m) => m.applicantId));
    const unmatched = [];
    const sessionIds = [];

    for (const slot of slots) {
      const startsAt = slot.start ? zonedTime({ year, ...slot.start }) : null;
      const data = {
        name: startsAt ? sessionName(startsAt) : slot.name,
        startsAt,
        location: slot.location,
      };
      const cohort = await tx.cohort.upsert({
        where: { sheetCol: slot.col },
        create: { ...data, sheetCol: slot.col },
        update: data,
        select: { id: true },
      });
      sessionIds.push(cohort.id);

      for (const name of slot.names) {
        const saved = remembered.get(normalizeName(name));
        const exact = matchName(name, index);
        const id = known.has(saved) ? saved : exact.status === "exact" ? exact.applicantId : null;
        if (placedByHand.has(id)) continue;
        // Someone on the sheet twice stays in their first slot; the second
        // entry is left for a person to look at.
        if (id && !cohortOf.has(id)) cohortOf.set(id, cohort.id);
        else unmatched.push({ cohortId: cohort.id, name });
      }
    }

    const current = await tx.cohortMember.findMany({
      where: { OR: [{ cohortId: { in: sessionIds } }, { applicantId: { in: [...cohortOf.keys()] } }] },
      select: { applicantId: true, cohortId: true, byHand: true },
    });
    const was = new Map(current.map((m) => [m.applicantId, m.cohortId]));
    const displaced = current
      .filter((m) => !m.byHand && cohortOf.get(m.applicantId) !== m.cohortId)
      .map((m) => m.applicantId);
    const joining = [...cohortOf].filter(([id, cohortId]) => was.get(id) !== cohortId);

    await clearPlacements(tx, displaced);
    await tx.cohortMember.deleteMany({ where: { applicantId: { in: displaced } } });
    if (joining.length) {
      await tx.cohortMember.createMany({
        data: joining.map(([applicantId, cohortId]) => ({ applicantId, cohortId })),
      });
    }

    await tx.signup.deleteMany({ where: { cohortId: { in: sessionIds } } });
    if (unmatched.length) await tx.signup.createMany({ data: unmatched });

    // Being on the sheet is what it now means to have passed.
    await tx.applicant.updateMany({
      where: { id: { in: [...cohortOf.keys()] } },
      data: { screeningStatus: "PASSED" },
    });

    const url = String(link).trim();
    await tx.eventSheet.upsert({
      where: { id: "main" },
      create: { url },
      update: { url, syncedAt: new Date() },
    });

    return { sessions: slots.length, matched: cohortOf.size, unmatched: unmatched.length };
  });
}
