import { redirect } from "next/navigation";
import { getCurrentGrader } from "@/lib/auth";
import Nav from "../Nav";
import InterviewsClient from "./InterviewsClient";

export const dynamic = "force-dynamic";

/**
 * The interview schedule, read live from the sheet (see lib/interviews.js).
 * Everything after this is fetched client-side so the page can keep polling
 * for changes without a full reload.
 */
export default async function InterviewsPage() {
  const grader = await getCurrentGrader();
  if (!grader) redirect("/login");

  return (
    <>
      <Nav grader={grader} />
      <InterviewsClient isAdmin={grader.isAdmin} />
    </>
  );
}
