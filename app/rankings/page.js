import { redirect } from "next/navigation";
import { getCurrentGrader } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { normalizeGradYear } from "@/lib/mapping";
import Nav from "../Nav";
import RankingsClient from "./RankingsClient";

export const dynamic = "force-dynamic";

const avg = (nums) =>
  nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;

// An auto decision overrides the average outright. If two graders disagree —
// one accept, one reject — nothing is overridden: the app has no basis for
// picking a side, so it flags the clash and leaves the average standing.
function overrideFor(grades) {
  const accept = grades.some((g) => g.autoDecision === "ACCEPT");
  const reject = grades.some((g) => g.autoDecision === "REJECT");
  if (accept && reject) return "CONFLICT";
  if (accept) return "ACCEPT";
  if (reject) return "REJECT";
  return null;
}

// Accepts on top, rejects at the bottom, everyone else ranked by average.
const overrideRank = (a) =>
  a.override === "ACCEPT" ? 0 : a.override === "REJECT" ? 2 : 1;

const CRITERION_LABEL = {
  technicalNote: "Technical",
  thoughtfulnessNote: "Thoughtfulness",
  initiativeNote: "Initiative",
  communityFitNote: "Community fit",
  overallNote: "Overall",
};

/** Everything one grader wrote about an applicant, in rubric order. */
function notesFrom(grade) {
  return Object.entries(CRITERION_LABEL)
    .map(([key, label]) => ({ label, text: (grade[key] || "").trim() }))
    .filter((n) => n.text);
}

export default async function RankingsPage() {
  const grader = await getCurrentGrader();
  if (!grader) redirect("/login");

  const rows = await prisma.applicant.findMany({
    select: {
      id: true,
      fullName: true,
      gradYear: true,
      majors: true,
      roleCategory: true,
      grades: {
        select: {
          technical: true,
          thoughtfulness: true,
          initiative: true,
          communityFit: true,
          autoDecision: true,
          technicalNote: true,
          thoughtfulnessNote: true,
          initiativeNote: true,
          communityFitNote: true,
          overallNote: true,
          grader: { select: { name: true } },
        },
      },
    },
  });

  const applicants = rows.map((a) => {
    const totals = a.grades.map(
      (g) => g.technical + g.thoughtfulness + g.initiative + g.communityFit
    );
    return {
      id: a.id,
      fullName: a.fullName,
      gradYear: normalizeGradYear(a.gradYear) || "Unknown",
      majors: a.majors,
      roleCategory: a.roleCategory,
      reviewCount: a.grades.length,
      // What graders wrote while scoring, so the table can explain why someone
      // sits where they do without opening the grading screen. The thumbs
      // notes from Mugshots stay out of it — that is the interview round, and
      // this page ranks the application. A grader with an auto decision is
      // kept even when they wrote nothing — their verdict is the thing that
      // needs explaining.
      graderNotes: a.grades
        .map((g) => ({
          graderName: g.grader.name,
          total: g.technical + g.thoughtfulness + g.initiative + g.communityFit,
          autoDecision: g.autoDecision,
          notes: notesFrom(g),
        }))
        .filter((g) => g.notes.length > 0 || g.autoDecision),
      override: overrideFor(a.grades),
      noteCount: a.grades.reduce((n, g) => n + notesFrom(g).length, 0),
      average: totals.length ? Number(avg(totals).toFixed(2)) : null,
      criteria: {
        technical: Number(avg(a.grades.map((g) => g.technical)).toFixed(2)),
        thoughtfulness: Number(avg(a.grades.map((g) => g.thoughtfulness)).toFixed(2)),
        initiative: Number(avg(a.grades.map((g) => g.initiative)).toFixed(2)),
        communityFit: Number(avg(a.grades.map((g) => g.communityFit)).toFixed(2)),
      },
    };
  });

  // Overrides first, then highest average; ties broken by more reviews (more
  // confidence), then name.
  applicants.sort(
    (a, b) =>
      overrideRank(a) - overrideRank(b) ||
      (b.average ?? -1) - (a.average ?? -1) ||
      b.reviewCount - a.reviewCount ||
      a.fullName.localeCompare(b.fullName)
  );

  return (
    <>
      <Nav grader={grader} />
      <RankingsClient applicants={applicants} />
    </>
  );
}
