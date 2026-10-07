import { redirect } from "next/navigation";
import { getCurrentGrader } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { columnFor } from "@/lib/deliberation";
import { normalizeGradYear } from "@/lib/mapping";
import { infoSessionByApplicant } from "@/lib/infosession";
import { ratingMeta } from "@/lib/ratings";
import Nav from "../Nav";
import InterviewClient from "./InterviewClient";

export const dynamic = "force-dynamic";

/**
 * Coffee chat candidates, in the order the deliberation ranking puts them.
 * Only people with a verdict are here; the thumbs ratings and event notes ride
 * along for the notes panel.
 */
export default async function InterviewSelectionPage() {
  const grader = await getCurrentGrader();
  if (!grader) redirect("/login");

  const [infoSession, rows] = await Promise.all([
    infoSessionByApplicant(),
    prisma.deliberationVerdict.findMany({
      orderBy: { position: "asc" },
      select: {
        applicantId: true,
        verdict: true,
        passedToInterview: true,
        applicant: {
          select: {
            fullName: true,
            gradYear: true,
            majors: true,
            roleCategory: true,
            photo: { select: { updatedAt: true } },
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
        },
      },
    }),
  ]);

  const ranking = rows.map((r) => ({
    applicantId: r.applicantId,
    verdict: r.verdict,
    passed: r.passedToInterview,
  }));

  const people = Object.fromEntries(
    rows.map((r) => {
      const a = r.applicant;
      return [
        r.applicantId,
        {
          fullName: a.fullName,
          // Canonical, so each class gets one column filter rather than one per spelling.
          gradYear: normalizeGradYear(a.gradYear) || "Unknown",
          majors: a.majors,
          column: columnFor(a.roleCategory),
          infoSession: infoSession.has(r.applicantId),
          hasPhoto: !!a.photo,
          photoVersion: a.photo ? a.photo.updatedAt.getTime() : null,
          ratings: a.ratings.map((x) => ({
            icon: ratingMeta(x.value)?.icon || "",
            label: ratingMeta(x.value)?.label || x.value,
            note: x.note,
            graderName: x.grader.name,
          })),
          eventNotes: a.notes.map((n) => ({
            body: n.body,
            graderName: n.grader.name,
            round: n.round?.number ?? null,
            group: n.group ? { color: n.group.color, shape: n.group.shape } : null,
          })),
        },
      ];
    })
  );

  return (
    <>
      <Nav grader={grader} />
      <InterviewClient ranking={ranking} people={people} isAdmin={grader.isAdmin} />
    </>
  );
}
