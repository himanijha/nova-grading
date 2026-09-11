import { redirect } from "next/navigation";
import { getCurrentGrader } from "@/lib/auth";
import Nav from "../Nav";
import ImportClient from "./ImportClient";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const grader = await getCurrentGrader();
  if (!grader) redirect("/login");

  return (
    <>
      <Nav grader={grader} />
      <ImportClient />
    </>
  );
}
