import { redirect } from "next/navigation";
import { getCurrentGrader } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { loadAttendees } from "@/lib/infosession";
import Nav from "../Nav";
import InfoSessionClient from "./InfoSessionClient";

export const dynamic = "force-dynamic";

export default async function InfoSessionPage() {
  const grader = await getCurrentGrader();
  if (!grader) redirect("/login");

  const people = (await loadAttendees())
    .map((p) => ({
      ...p,
      applicant: p.applicant && { id: p.applicant.id, fullName: p.applicant.fullName },
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Offered as suggestions when adding someone by hand, so a grader can pick
  // the person who applied and get their exact name and email.
  const listed = new Set(people.filter((p) => p.applicant).map((p) => p.applicant.id));
  const applicants = (
    await prisma.applicant.findMany({ select: { id: true, fullName: true, uclaEmail: true } })
  ).filter((a) => !listed.has(a.id));

  return (
    <>
      <Nav grader={grader} />
      <InfoSessionClient people={people} applicants={applicants} isAdmin={grader.isAdmin} />
    </>
  );
}
