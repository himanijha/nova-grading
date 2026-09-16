import { redirect } from "next/navigation";

// Your account was folded into Settings; old links and bookmarks still work.
export default function AccountPage() {
  redirect("/settings");
}
