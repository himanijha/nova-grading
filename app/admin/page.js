import { redirect } from "next/navigation";
import { getCurrentGrader } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Nav from "../Nav";
import AdminClient from "./AdminClient";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const grader = await getCurrentGrader();
  if (!grader) redirect("/login");
  if (!grader.isAdmin) redirect("/grading");

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
      <AdminClient
        me={grader}
        graders={graders.map((g) => ({ ...g, gradeCount: g._count.grades }))}
        stats={{ applicantCount, gradeCount, ungraded }}
      />
    </>
  );
}
