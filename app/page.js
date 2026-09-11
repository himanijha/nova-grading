import { redirect } from "next/navigation";
import { getCurrentGrader } from "@/lib/auth";

export default async function Home() {
  const grader = await getCurrentGrader();
  redirect(grader ? "/grading" : "/login");
}
