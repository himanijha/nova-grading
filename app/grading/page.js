import { redirect } from "next/navigation";
import { getCurrentGrader } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { drivePreviewUrl } from "@/lib/mapping";
import Nav from "../Nav";
import GradingClient from "./GradingClient";

export const dynamic = "force-dynamic";

export default async function GradingPage({ searchParams }) {
  const grader = await getCurrentGrader();
  if (!grader) redirect("/login");

  const sp = await searchParams;
  const sort = sp?.sort || "fewest";
  const role = sp?.role || "all";
  const q = (sp?.q || "").trim();

  const where = {};
  if (role !== "all") where.roleCategory = role;
  if (q) {
    where.OR = [
      { fullName: { contains: q } },
      { uclaEmail: { contains: q } },
      { contactEmail: { contains: q } },
      { majors: { contains: q } },
    ];
  }

  const rows = await prisma.applicant.findMany({
    where,
    select: {
      id: true,
      fullName: true,
      submittedAt: true,
      roleCategory: true,
      grades: { select: { graderId: true } },
    },
  });

  const list = rows.map((a) => ({
    id: a.id,
    fullName: a.fullName,
    submittedAt: a.submittedAt ? a.submittedAt.toISOString() : null,
    roleCategory: a.roleCategory,
    reviewCount: a.grades.length,
    gradedByMe: a.grades.some((g) => g.graderId === grader.id),
  }));

  list.sort((a, b) => {
    if (sort === "name") return a.fullName.localeCompare(b.fullName);
    if (sort === "recent") {
      return (b.submittedAt || "").localeCompare(a.submittedAt || "");
    }
    if (sort === "most") {
      return b.reviewCount - a.reviewCount || a.fullName.localeCompare(b.fullName);
    }
    // "fewest" — the default: least-reviewed first, then oldest submission.
    return (
      a.reviewCount - b.reviewCount ||
      (a.submittedAt || "").localeCompare(b.submittedAt || "")
    );
  });

  const selectedId = sp?.id || list[0]?.id || null;

  let applicant = null;
  if (selectedId) {
    const a = await prisma.applicant.findUnique({
      where: { id: selectedId },
      include: {
        grades: {
          include: { grader: { select: { id: true, name: true, email: true } } },
          orderBy: { updatedAt: "desc" },
        },
      },
    });

    if (a) {
      applicant = {
        id: a.id,
        fullName: a.fullName,
        uclaEmail: a.uclaEmail,
        contactEmail: a.contactEmail,
        pronouns: a.pronouns,
        gradYear: a.gradYear,
        majors: a.majors,
        minors: a.minors,
        roleRaw: a.roleRaw,
        roleCategory: a.roleCategory,
        submittedAt: a.submittedAt ? a.submittedAt.toISOString() : null,
        resumeUrl: a.resumeUrl,
        resumeEmbedUrl: drivePreviewUrl(a.resumeUrl),
        qLookingForward: a.qLookingForward,
        qInitiative: a.qInitiative,
        qCommunity: a.qCommunity,
        links: a.links,
        anythingElse: a.anythingElse,
        grades: a.grades.map((g) => ({
          id: g.id,
          graderId: g.graderId,
          graderName: g.grader.name,
          technical: g.technical,
          thoughtfulness: g.thoughtfulness,
          initiative: g.initiative,
          communityFit: g.communityFit,
          technicalNote: g.technicalNote,
          thoughtfulnessNote: g.thoughtfulnessNote,
          initiativeNote: g.initiativeNote,
          communityFitNote: g.communityFitNote,
          overallNote: g.overallNote,
          autoDecision: g.autoDecision,
          updatedAt: g.updatedAt.toISOString(),
        })),
      };
    }
  }

  const totalApplicants = await prisma.applicant.count();
  const myReviewCount = await prisma.grade.count({ where: { graderId: grader.id } });

  // Coverage is a property of the whole pile, not of whatever the sidebar is
  // filtered to — "12 still need a second review" has to mean 12 overall, or
  // it silently changes every time someone searches.
  const reviewCounts = await prisma.applicant.findMany({
    select: { _count: { select: { grades: true } } },
  });
  const counts = reviewCounts.map((a) => a._count.grades);
  const coverage = {
    total: counts.length,
    // For each target: how many have reached it, and how many have not.
    targets: [1, 2, 3].map((n) => ({
      n,
      have: counts.filter((c) => c >= n).length,
      left: counts.filter((c) => c < n).length,
    })),
    // The exact spread, so "3" does not hide someone sitting on six reviews.
    exact: [0, 1, 2].map((n) => ({ n, count: counts.filter((c) => c === n).length })),
    threePlus: counts.filter((c) => c >= 3).length,
  };

  return (
    <>
      <Nav grader={grader} />
      <GradingClient
        grader={grader}
        list={list}
        applicant={applicant}
        totalApplicants={totalApplicants}
        coverage={coverage}
        myReviewCount={myReviewCount}
        sort={sort}
        role={role}
        q={q}
      />
    </>
  );
}
