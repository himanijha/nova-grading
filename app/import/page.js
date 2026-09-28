import { redirect } from "next/navigation";
import { getCurrentGrader } from "@/lib/auth";
import Nav from "../Nav";
import { prisma } from "@/lib/db";
import ImportClient from "./ImportClient";
import ResumeZip from "./ResumeZip";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const grader = await getCurrentGrader();
  if (!grader) redirect("/login");
  // Importing and clearing applications affect the whole database, so they stay
  // with the admins who run the season rather than with everyone who grades it.
  if (!grader.isAdmin) redirect("/grading");

  const applicants = await prisma.applicant.findMany({
    select: { id: true, fullName: true, uclaEmail: true, resume: { select: { id: true } } },
  });

  return (
    <>
      <Nav grader={grader} />
      <ImportClient
        resumes={
          <ResumeZip
            applicants={applicants.map((a) => ({
              id: a.id,
              fullName: a.fullName,
              uclaEmail: a.uclaEmail,
              hasResume: Boolean(a.resume),
            }))}
          />
        }
      />
    </>
  );
}
