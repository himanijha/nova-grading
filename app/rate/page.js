import { redirect } from "next/navigation";

// Rate was folded into My group; old links and bookmarks land there.
export default function RatePage() {
  redirect("/my-group");
}
