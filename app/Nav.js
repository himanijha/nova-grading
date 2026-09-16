"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function Nav({ grader }) {
  const path = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const link = (href, label) => (
    <Link href={href} className={path === href ? "active" : ""}>
      {label}
    </Link>
  );

  return (
    <nav className="nav">
      <Link href="/grading" className="nav-brand">
        NOVA
      </Link>
      <div className="nav-links">
        {link("/rankings", "Rankings")}
        {link("/grading", "Grading")}
        {link("/mugshots", "Mugshots")}
        {link("/interview-selection", "Interviews")}
        {link("/import", "Import CSV")}
        {grader?.isAdmin && link("/admin", "Admin")}
        {/* Your own name is the way to your account — nothing else in the nav
            is about you, and an extra top-level link would crowd it. */}
        <Link
          href="/account"
          className={`nav-who${path === "/account" ? " active" : ""}`}
          title="Your account"
        >
          {grader?.name}
        </Link>
        <button onClick={logout}>Logout</button>
      </div>
    </nav>
  );
}
