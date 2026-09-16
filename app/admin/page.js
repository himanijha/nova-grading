import { redirect } from "next/navigation";

// Admin was folded into Settings; old links and bookmarks still work.
export default function AdminPage() {
  redirect("/settings");
}
