import { redirect } from "next/navigation";
import { getCurrentGrader } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { scriptFor } from "@/lib/interviewScripts";
import Nav from "../../Nav";
import InterviewGuideClient from "./InterviewGuideClient";

export const dynamic = "force-dynamic";

/** The interview guide for one slot: the dev or design script, picked by its
 * Role(s) text, with a place to jot notes and record a verdict. Any signed-in
 * grader can open and fill one in — the two assigned interviewers are the
 * ones who matter at the end, but there's no one else around to protect this
 * from. */
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
      scorecards: { include: { grader: { select: { name: true } } } },
    },
  });
  if (!slot) redirect("/interviews");

  const script = scriptFor(slot.roleRaw);
  const report = slot.report
    ? { track: slot.report.track, notes: JSON.parse(slot.report.notesJson || "{}") }
    : { track: null, notes: {} };

  const cards = slot.scorecards.map((s) => ({
    graderId: s.graderId,
    graderName: s.grader.name,
    rubric: JSON.parse(s.rubricJson || "{}"),
    verdict: s.verdict,
    generalNotes: s.generalNotes || "",
  }));
  // Your own scorecard, to fill in. Everyone else's is shown read-only, right
  // alongside it.
  const mine = cards.find((c) => c.graderId === grader.id) || {
    graderId: grader.id,
    graderName: grader.name,
    rubric: {},
    verdict: null,
    generalNotes: "",
  };
  const others = cards.filter((c) => c.graderId !== grader.id);

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
        mine={mine}
        others={others}
      />
    </>
  );
}
