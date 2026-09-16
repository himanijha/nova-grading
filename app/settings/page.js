import { redirect } from "next/navigation";
import { getCurrentGrader } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Nav from "../Nav";
import SettingsClient from "./SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const grader = await getCurrentGrader();
  if (!grader) redirect("/login");

  // Every grader has a password to change; only admins get the roster and the
  // progress numbers, so only admins pay for the queries.
  if (!grader.isAdmin) {
    return (
      <>
        <Nav grader={grader} />
        <SettingsClient me={grader} graders={null} stats={null} />
      </>
    );
  }

  const graders = await prisma.grader.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      isAdmin: true,
      mustReset: true,
      _count: { select: { grades: true } },
    },
  });

  const applicantCount = await prisma.applicant.count();
  const gradeCount = await prisma.grade.count();

  const ungraded = await prisma.applicant.count({ where: { grades: { none: {} } } });

  return (
    <>
      <Nav grader={grader} />
      <SettingsClient
        me={grader}
        graders={graders.map((g) => ({ ...g, gradeCount: g._count.grades }))}
        stats={{ applicantCount, gradeCount, ungraded }}
      />
    </>
  );
}
