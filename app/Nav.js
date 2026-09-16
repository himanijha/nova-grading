"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

/**
 * The nav follows the shape of the season: forms come in, applications get
 * read, the people who survive go to coffee chats. Grouping the pages that way
 * means a grader can find a page from the stage they are in, instead of
 * remembering which of seven flat links is the one they want.
 */
function navGroups(grader) {
  return [
    {
      key: "forms",
      label: "Forms",
      // Importing rewrites everybody's application; only admins do it.
      hidden: !grader?.isAdmin,
      items: [{ href: "/import", label: "Import CSV" }],
    },
    {
      key: "applications",
      label: "Applications",
      items: [
        { href: "/grading", label: "Grading" },
        { href: "/rankings", label: "Rankings" },
      ],
    },
    {
      key: "coffee",
      label: "Coffee chats",
      items: [
        { href: "/mugshots", label: "Mugshots" },
        { href: "/interview-selection", label: "Interview candidates" },
      ],
    },
  ].filter((g) => !g.hidden);
}

export default function Nav({ grader }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(null);
  const navRef = useRef(null);

  // Any click outside the nav, or Escape, puts the menu away.
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (!navRef.current?.contains(e.target)) setOpen(null);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(null);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Navigating is the end of the interaction — don't leave the menu hanging
  // open over the page it just opened.
  useEffect(() => setOpen(null), [path]);

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const groups = navGroups(grader);

  return (
    <nav className="nav" ref={navRef}>
      <Link href="/grading" className="nav-brand">
        NOVA
      </Link>
      <div className="nav-links">
        {groups.map((g) => {
          const here = g.items.some((i) => i.href === path);
          return (
            <div className="nav-group" key={g.key}>
              <button
                type="button"
                className={`nav-grp-btn${here ? " active" : ""}`}
                aria-expanded={open === g.key}
                aria-haspopup="true"
                onClick={() => setOpen((o) => (o === g.key ? null : g.key))}
              >
                {g.label}
                <span className={`nav-caret${open === g.key ? " open" : ""}`} aria-hidden="true">
                  ▾
                </span>
              </button>
              {open === g.key && (
                <div className="nav-menu">
                  {g.items.map((i) => (
                    <Link
                      key={i.href}
                      href={i.href}
                      className={path === i.href ? "active" : ""}
                    >
                      {i.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <Link href="/settings" className={path === "/settings" ? "active" : ""}>
          Settings
        </Link>

        {/* Your own name is the way to your account — nothing else in the nav
            is about you, and an extra top-level link would crowd it. */}
        <Link href="/settings" className="nav-who" title="Your account">
          {grader?.name}
        </Link>
        <button onClick={logout}>Logout</button>
      </div>
    </nav>
  );
}
