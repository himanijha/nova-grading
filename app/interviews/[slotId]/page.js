import { redirect } from "next/navigation";
import { getCurrentGrader } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { scriptFor } from "@/lib/interviewScripts";
import Nav from "../../Nav";
import InterviewGuideClient from "./InterviewGuideClient";

export const dynamic = "force-dynamic";

/** The interview guide for one slot: the dev or design script, picked by its
 * Role(s) text, with a place to jot notes and record a verdict. Only that
 * slot's two interviewers, or an admin, get it — everyone else has no
 * interview of their own here to guide. */
export default async function InterviewGuidePage({ params }) {
  const grader = await getCurrentGrader();
  if (!grader) redirect("/login");

  const { slotId } = await params;
  const slot = await prisma.interviewSlot.findUnique({
    where: { id: slotId },
    include: {
      candidate: { select: { fullName: true } },
      interviewer1: { select: { id: true, name: true } },
      interviewer2: { select: { id: true, name: true } },
      report: true,
    },
  });
  if (!slot) redirect("/interviews");

  const isInterviewer = slot.interviewer1Id === grader.id || slot.interviewer2Id === grader.id;
  if (!isInterviewer && !grader.isAdmin) redirect("/interviews");

  const script = scriptFor(slot.roleRaw);
  const report = slot.report
    ? {
        track: slot.report.track,
        notes: JSON.parse(slot.report.notesJson || "{}"),
        rubric: JSON.parse(slot.report.rubricJson || "{}"),
        verdict: slot.report.verdict,
        generalNotes: slot.report.generalNotes || "",
      }
    : { track: null, notes: {}, rubric: {}, verdict: null, generalNotes: "" };

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
          interviewer1Name: slot.interviewer1?.name || slot.interviewer1Raw,
          interviewer2Name: slot.interviewer2?.name || slot.interviewer2Raw,
        }}
        script={script}
        report={report}
      />
    </>
  );
}
