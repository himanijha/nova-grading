"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RATINGS, ratingMeta } from "@/lib/ratings";
import { GroupShape } from "../GroupBadge";
import { Mugshot } from "../Mugshot";
import NoteList from "../NoteList";
import PhotoButton from "../PhotoButton";

/**
 * After the last round: everyone you watched, what the room wrote about them,
 * and your thumbs. These are the same ratings Interview candidates ranks by.
 */
export default function RateClient({ cohorts, cohortId, people }) {
  const [scope, setScope] = useState("mine");
  const [show, setShow] = useState("todo");
  const [q, setQ] = useState("");

  if (cohorts.length === 0) {
    return (
      <div className="page">
        <h1>Rate</h1>
        <div className="card">No cohorts have been set up yet.</div>
      </div>
    );
  }

  const watched = people.filter((p) => p.watchedByMe);
  const pool = scope === "mine" ? watched : people;
  const rated = pool.filter((p) => p.myRating).length;
  const shown = pool.filter(
    (p) =>
      (show === "all" || (show === "todo" ? !p.myRating : p.myRating)) &&
      (!q.trim() || p.fullName.toLowerCase().includes(q.trim().toLowerCase()))
  );

  return (
    <div className="page rate">
      <h1>Rate</h1>
      <p className="sub">
        Give your thumbs once every round is done. You&apos;ve rated <strong>{rated}</strong> of{" "}
        {pool.length} {scope === "mine" ? "people you watched" : "people in this cohort"}.
      </p>

      {cohorts.length > 1 && (
        <div className="seg cohort-seg">
          {cohorts.map((c) => (
            <Link key={c.id} href={`/rate?cohort=${c.id}`} className={c.id === cohortId ? "on" : ""}>
              {c.name}
            </Link>
          ))}
        </div>
      )}

      <div className="toolbar">
        <div className="seg">
          <button className={scope === "mine" ? "on" : ""} onClick={() => setScope("mine")}>
            I watched {watched.length}
          </button>
          <button className={scope === "all" ? "on" : ""} onClick={() => setScope("all")}>
            Whole cohort {people.length}
          </button>
        </div>
        <div className="seg">
          <button className={show === "todo" ? "on" : ""} onClick={() => setShow("todo")}>
            To rate {pool.length - rated}
          </button>
          <button className={show === "done" ? "on" : ""} onClick={() => setShow("done")}>
            Rated {rated}
          </button>
          <button className={show === "all" ? "on" : ""} onClick={() => setShow("all")}>
            All
          </button>
        </div>
        <input
          className="inp"
          style={{ maxWidth: 220 }}
          type="search"
          placeholder="Search name"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {shown.length === 0 && (
        <div className="empty">
          {pool.length === 0
            ? scope === "mine"
              ? "You weren't at a group in this cohort. Switch to the whole cohort."
              : "Nobody is in this cohort yet."
            : show === "todo"
            ? "All done here."
            : "Nobody matches."}
        </div>
      )}

      <div className="stack">
        {shown.map((p) => (
          <RateCard key={p.id} person={p} />
        ))}
      </div>
    </div>
  );
}

function RateCard({ person }) {
  const router = useRouter();
  const [value, setValue] = useState(person.myRating?.value || null);
  const [note, setNote] = useState(person.myRating?.note || "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function save(nextValue) {
    setBusy(true);
    const res = await fetch("/api/ratings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicantId: person.id, value: nextValue, note }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setMsg(data.error || "Could not save.");
    setMsg(nextValue === null ? "Cleared." : "Saved.");
    router.refresh();
  }

  return (
    <section className="card rate-card">
      <div className="person-top">
        <Mugshot applicant={person} size={96} />
        <div style={{ minWidth: 0 }}>
          <strong className="person-card-name">{person.fullName}</strong>
          <div className="muted small">
            {[person.gradYear, person.majors].filter(Boolean).join(" · ")}
          </div>
          {!person.hasPhoto && (
            <div style={{ marginTop: 6 }}>
              <PhotoButton applicant={person} />
            </div>
          )}
          <div className="seen-by">
            {person.seenBy.map((s) => (
              <span key={s.round} className="seen-chip">
                <GroupShape color={s.group.color} shape={s.group.shape} size={11} />R{s.round}
                {s.graders.length ? ` ${s.graders.map((g) => g.name.split(" ")[0]).join(", ")}` : " —"}
              </span>
            ))}
          </div>
        </div>
      </div>

      {person.notes.length > 0 ? (
        <NoteList notes={person.notes} />
      ) : (
        <div className="muted small" style={{ margin: "8px 0" }}>
          No notes yet.
        </div>
      )}

      <div className="rate-row">
        {RATINGS.map((r) => (
          <button
            key={r.value}
            type="button"
            className={`rate-btn${value === r.value ? " on" : ""}`}
            aria-pressed={value === r.value}
            disabled={busy}
            onClick={() => {
              const next = value === r.value ? null : r.value;
              setValue(next);
              save(next);
            }}
          >
            <span className="rate-icon">{r.icon}</span>
            <span className="rate-text">{r.label}</span>
          </button>
        ))}
      </div>
      <div className="note-compose">
        <textarea
          className="inp"
          rows={2}
          placeholder="Why? (optional — shows next to your thumbs)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <button className="btn" disabled={busy || !value} onClick={() => save(value)}>
          Save reason
        </button>
      </div>
      <div className="save-note">{msg}</div>

      {person.others ? (
        person.others.length > 0 && (
          <div className="graded-by">
            <h4>Also rated by ({person.others.length})</h4>
            {person.others.map((r, i) => (
              <div className="grader-row" key={i}>
                <span>
                  {ratingMeta(r.value)?.icon} {r.graderName}
                </span>
                <span className="mug-sub">{r.note || "no reason given"}</span>
              </div>
            ))}
          </div>
        )
      ) : (
        person.otherCount > 0 && (
          <div className="muted small">
            {person.otherCount} other {person.otherCount === 1 ? "grader has" : "graders have"} rated —
            give yours to see theirs.
          </div>
        )
      )}
    </section>
  );
}
