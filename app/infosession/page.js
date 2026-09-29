import { redirect } from "next/navigation";
import { getCurrentGrader } from "@/lib/auth";
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

  return (
    <>
      <Nav grader={grader} />
      <InfoSessionClient people={people} isAdmin={grader.isAdmin} />
    </>
  );
}
