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
          updatedAt: g.updatedAt.toISOString(),
        })),
      };
    }
  }

  const totalApplicants = await prisma.applicant.count();
  const myReviewCount = await prisma.grade.count({ where: { graderId: grader.id } });

  return (
    <>
      <Nav grader={grader} />
      <GradingClient
        grader={grader}
        list={list}
        applicant={applicant}
        totalApplicants={totalApplicants}
        myReviewCount={myReviewCount}
        sort={sort}
        role={role}
        q={q}
      />
    </>
  );
}
