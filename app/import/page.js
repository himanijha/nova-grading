import { redirect } from "next/navigation";
import { getCurrentGrader } from "@/lib/auth";
import Nav from "../Nav";
import ImportClient from "./ImportClient";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const grader = await getCurrentGrader();
  if (!grader) redirect("/login");
  // Importing rewrites every application in the database, so it stays with the
  // admins who run the season rather than with everyone who grades it.
  if (!grader.isAdmin) redirect("/grading");

  return (
    <>
      <Nav grader={grader} />
      <ImportClient />
    </>
  );
}
