import { redirect } from "next/navigation";
import { getCurrentGrader } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { categoryFor } from "@/lib/interviewScripts";
import Nav from "../../Nav";
import InterviewGuideClient from "./InterviewGuideClient";

export const dynamic = "force-dynamic";

/** The interview guide for one slot: the dev or design script, picked by its
 * Role(s) text by default but switchable to any of the four categories, with
 * a place to jot notes and record a verdict. Any signed-in grader can open
 * it, but only the two assigned interviewers get an editable scorecard —
 * anyone else just sees everyone's scorecards read-only. */
export default async function InterviewGuidePage({ params }) {
  const grader = await getCurrentGrader();
  if (!grader) redirect("/login");

  const { slotId } = await params;
  const slot = await prisma.interviewSlot.findUnique({
    where: { id: slotId },
    include: {
      candidate: { select: { fullName: true, photo: { select: { updatedAt: true } } } },
      interviewer1: { select: { id: true, name: true } },
      interviewer2: { select: { id: true, name: true } },
      report: true,
      scorecards: { include: { grader: { select: { name: true } } } },
    },
  });
  if (!slot) redirect("/interviews");

  const autoCategory = categoryFor(slot.roleRaw);
  const report = slot.report
    ? {
        track: slot.report.track,
        notes: JSON.parse(slot.report.notesJson || "{}"),
        scriptOverride: slot.report.scriptOverride || null,
      }
    : { track: null, notes: {}, scriptOverride: null };

  const cards = slot.scorecards.map((s) => ({
    graderId: s.graderId,
    graderName: s.grader.name,
    rubric: JSON.parse(s.rubricJson || "{}"),
    verdict: s.verdict,
    generalNotes: s.generalNotes || "",
  }));
  // Your own scorecard, to fill in — only if you're one of the two assigned
  // interviewers. Everyone else's is shown read-only, right alongside it.
  const isAssigned = grader.id === slot.interviewer1Id || grader.id === slot.interviewer2Id;
  const mine = isAssigned
    ? cards.find((c) => c.graderId === grader.id) || {
        graderId: grader.id,
        graderName: grader.name,
        rubric: {},
        verdict: null,
        generalNotes: "",
      }
    : null;
  const others = cards.filter((c) => c.graderId !== grader.id || !isAssigned);

  return (
    <>
      <Nav grader={grader} />
      <InterviewGuideClient
        slot={{
          id: slot.id,
          day: slot.day,
          startRaw: slot.startRaw,
          endRaw: slot.endRaw,
          room: slot.room,
          roleRaw: slot.roleRaw,
          candidateName: slot.candidate?.fullName || slot.candidateRaw,
          candidateId: slot.candidateId,
          candidateHasPhoto: !!slot.candidate?.photo,
          candidatePhotoVersion: slot.candidate?.photo ? slot.candidate.photo.updatedAt.getTime() : null,
          interviewer1Name: slot.interviewer1?.name || slot.interviewer1Raw,
          interviewer2Name: slot.interviewer2?.name || slot.interviewer2Raw,
        }}
        autoCategory={autoCategory}
        report={report}
        mine={mine}
        others={others}
      />
    </>
  );
}
