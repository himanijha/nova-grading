import { redirect } from "next/navigation";
import { getCurrentGrader } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { summarizeScorecards, syncInterviewDeliberationOrder } from "@/lib/interviewDeliberation";
import { columnFor } from "@/lib/deliberation";
import { normalizeGradYear } from "@/lib/mapping";
import { VERDICTS } from "@/lib/interviewScripts";
import Nav from "../Nav";
import InterviewDeliberationsClient from "./InterviewDeliberationsClient";

export const dynamic = "force-dynamic";

const verdictLabel = (value) => VERDICTS.find((v) => v.value === value)?.label || value;

/**
 * Final-interview deliberations: every candidate with at least one
 * interview verdict, bucketed by what their interviewers said (averaged
 * when the two disagree) and ranked by their rubric score within that
 * bucket. A drag only reorders within a bucket; the bucket itself follows
 * the scorecards.
 */
export default async function InterviewDeliberationsPage() {
  const grader = await getCurrentGrader();
  if (!grader) redirect("/login");

  const slots = await prisma.interviewSlot.findMany({
    where: { candidateId: { not: null } },
    select: {
      id: true,
      candidateId: true,
      candidate: {
        select: {
          fullName: true,
          gradYear: true,
          majors: true,
          roleCategory: true,
          photo: { select: { updatedAt: true } },
        },
      },
      scorecards: {
        select: {
          verdict: true,
          rubricJson: true,
          generalNotes: true,
          grader: { select: { name: true } },
        },
      },
    },
  });

  // A candidate is normally in one slot, but gather every scorecard across
  // all of theirs just in case the schedule put them in more than one.
  const byCandidate = new Map();
  for (const slot of slots) {
    if (!slot.candidateId || !slot.candidate) continue;
    const entry = byCandidate.get(slot.candidateId) || { candidate: slot.candidate, slotId: slot.id, scorecards: [] };
    entry.scorecards.push(...slot.scorecards);
    byCandidate.set(slot.candidateId, entry);
  }

  const summaries = new Map();
  for (const [applicantId, entry] of byCandidate) {
    const summary = summarizeScorecards(entry.scorecards);
    if (summary) summaries.set(applicantId, summary);
  }

  const order = await syncInterviewDeliberationOrder(summaries);

  const overrideRows = await prisma.interviewDeliberationVerdict.findMany({
    where: { applicantId: { in: order } },
    select: { applicantId: true, overrideBucket: true },
  });
  const overrides = new Map(overrideRows.map((r) => [r.applicantId, r.overrideBucket]));

  const people = Object.fromEntries(
    order.map((applicantId) => {
      const entry = byCandidate.get(applicantId);
      const summary = summaries.get(applicantId);
      const a = entry.candidate;
      const overrideBucket = overrides.get(applicantId) || null;
      return [
        applicantId,
        {
          id: applicantId,
          fullName: a.fullName,
          gradYear: normalizeGradYear(a.gradYear) || "Unknown",
          majors: a.majors,
          column: columnFor(a.roleCategory),
          hasPhoto: !!a.photo,
          photoVersion: a.photo ? a.photo.updatedAt.getTime() : null,
          slotId: entry.slotId,
          bucket: overrideBucket || summary.bucket,
          autoBucket: summary.bucket,
          overrideBucket,
          score: summary.score,
          perCategory: summary.perCategory,
          scorecards: entry.scorecards
            .filter((s) => s.verdict)
            .map((s) => ({
              graderName: s.grader.name,
              verdict: s.verdict,
              verdictLabel: verdictLabel(s.verdict),
              generalNotes: s.generalNotes || "",
              rubric: JSON.parse(s.rubricJson || "{}"),
            })),
        },
      ];
    })
  );

  return (
    <>
      <Nav grader={grader} />
      <InterviewDeliberationsClient order={order} people={people} isAdmin={grader.isAdmin} />
    </>
  );
}
