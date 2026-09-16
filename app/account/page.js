import { redirect } from "next/navigation";
import { getCurrentGrader } from "@/lib/auth";
import Nav from "../Nav";
import AccountClient from "./AccountClient";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const grader = await getCurrentGrader();
  if (!grader) redirect("/login");

  return (
    <>
      <Nav grader={grader} />
      <AccountClient grader={grader} />
    </>
  );
}
