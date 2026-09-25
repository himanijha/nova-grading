import { redirect } from "next/navigation";

// Check-in lives at /mugshots now; keep old links working.
export default async function CheckinPage({ searchParams }) {
  const { cohort } = await searchParams;
  redirect(cohort ? `/mugshots?cohort=${encodeURIComponent(cohort)}` : "/mugshots");
}
