"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

/**
 * The nav follows the shape of the season: people come to an info session,
 * forms come in, applications get read, the people who pass come to the group
 * work event, and the people who shine there go to coffee chats. Grouping the
 * pages that way means a grader can find a page from the stage they are in,
 * instead of remembering which of seven flat links is the one they want.
 */
function navGroups(grader) {
  return [
    {
      key: "infosession",
      label: "Info session",
      items: [{ href: "/infosession", label: "Attendees" }],
    },
    {
      key: "forms",
      label: "Forms",
      // Importing and clearing applications is admin-only.
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
      key: "event",
      label: "Group work",
      // In the order the event runs: plan it, then on the day check people in
      // (with their photo), take notes in your group, rate at the end.
      items: [
        { href: "/event", label: "Overview" },
        grader?.isAdmin && { href: "/cohorts", label: "Cohorts" },
        { href: "/groups", label: "Groups" },
        { href: "/mugshots", label: "Mugshots" },
        { href: "/my-group", label: "My group" },
        { href: "/rate", label: "Rate" },
      ].filter(Boolean),
    },
    {
      key: "coffee",
      label: "Coffee chats",
      items: [{ href: "/interview-selection", label: "Interview candidates" }],
    },
  ].filter((g) => !g.hidden);
}

// The three screens used standing up at the event, one thumb away on a phone.
const TABS = [
  { href: "/mugshots", label: "Mugshots", icon: "📷" },
  { href: "/my-group", label: "My group", icon: "👥" },
  { href: "/rate", label: "Rate", icon: "👍" },
];

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
  const current = groups.flatMap((g) => g.items).find((i) => i.href === path);

  return (
    <>
    <nav className="nav" ref={navRef}>
      {/* Phones: brand, where you are, and a menu with every page. */}
      <div className="nav-mobile">
        <Link href="/event" className="nav-brand">
          NOVA
        </Link>
        <span className="nav-here">{current?.label || (path === "/settings" ? "Settings" : "")}</span>
        <button
          type="button"
          className="nav-menu-btn"
          aria-expanded={open === "sheet"}
          aria-label="Menu"
          onClick={() => setOpen((o) => (o === "sheet" ? null : "sheet"))}
        >
          {open === "sheet" ? "✕" : "☰"}
        </button>
        {open === "sheet" && (
          <div className="nav-sheet">
            {groups.map((g) => (
              <div key={g.key} className="nav-sheet-group">
                <div className="nav-sheet-title">{g.label}</div>
                {g.items.map((i) => (
                  <Link key={i.href} href={i.href} className={path === i.href ? "active" : ""}>
                    {i.label}
                  </Link>
                ))}
              </div>
            ))}
            <div className="nav-sheet-group">
              <div className="nav-sheet-title">{grader?.name}</div>
              <Link href="/settings">Settings</Link>
              <button type="button" onClick={logout}>
                Logout
              </button>
            </div>
          </div>
        )}
      </div>

      <Link href="/grading" className="nav-brand nav-desktop">
        NOVA
      </Link>
      <div className="nav-links nav-desktop">
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

        {/* Your own name is the only thing in the nav that is about you, so
            logging out lives under it rather than sitting out in the open. */}
        <div className="nav-group">
          <button
            type="button"
            className="nav-grp-btn nav-who"
            aria-expanded={open === "me"}
            aria-haspopup="true"
            onClick={() => setOpen((o) => (o === "me" ? null : "me"))}
          >
            {grader?.name}
            <span className={`nav-caret${open === "me" ? " open" : ""}`} aria-hidden="true">
              ▾
            </span>
          </button>
          {open === "me" && (
            <div className="nav-menu right">
              <button type="button" onClick={logout}>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
    <div className="tabbar">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className={path === t.href ? "on" : ""}>
          <span className="tab-icon" aria-hidden="true">
            {t.icon}
          </span>
          {t.label}
        </Link>
      ))}
    </div>
    </>
  );
}
