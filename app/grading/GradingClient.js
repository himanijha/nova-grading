"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const MAX_ROWS = 250;

const CRITERIA = [
  {
    key: "technical",
    name: "Technical / Design Skill",
    desc: "Evidence of building, learning, and craft — code or design — relative to the opportunities they've had.",
  },
  {
    key: "thoughtfulness",
    name: "Thoughtfulness",
    desc: "Specific, grounded reflection and genuine curiosity, rather than polished but generic prose.",
  },
  {
    key: "initiative",
    name: "Initiative",
    desc: "Did they identify something that needed doing and actually drive it forward?",
  },
  {
    key: "communityFit",
    name: "Community Fit",
    desc: "Care for a community and a sense of how they'd contribute to Nova's tech-for-good mission.",
  },
];

const ROLE_LABEL = {
  DEVELOPER: "Developer",
  DESIGNER: "Designer",
  BOTH: "Developer + Designer",
  OTHER: "Other",
  UNKNOWN: "Not specified",
};

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function Info({ label, children }) {
  return (
    <div>
      <div className="info-label">{label}</div>
      <div className="info-value">{children || "—"}</div>
    </div>
  );
}

function Essay({ q, a }) {
  return (
    <div className="essay">
      <div className="essay-q">{q}</div>
      <div className="essay-a">{a || <span style={{ color: "#8b8598" }}>No response</span>}</div>
    </div>
  );
}

export default function GradingClient({
  grader,
  list,
  applicant,
  totalApplicants,
  myReviewCount,
  sort,
  role,
  q,
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [search, setSearch] = useState(q);

  // Push the search box into the URL after the user stops typing.
  useEffect(() => {
    if (search === q) return;
    const t = setTimeout(() => setParam({ q: search || null, id: null }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Pin the selected applicant into the URL. Without this, selection falls back
  // to "first in the list" — and since the list is sorted by fewest reviews,
  // saving a grade re-sorts it and silently moves you to a different applicant.
  useEffect(() => {
    if (params.get("id") || !applicant) return;
    const next = new URLSearchParams(params.toString());
    next.set("id", applicant.id);
    router.replace(`/grading?${next.toString()}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicant?.id]);

  function setParam(updates) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    router.push(`/grading?${next.toString()}`);
  }

  const shown = list.slice(0, MAX_ROWS);

  const myGrade = useMemo(
    () => applicant?.grades.find((g) => g.graderId === grader.id) || null,
    [applicant, grader.id]
  );

  return (
    <div className="grade-layout">
      <aside className="sidebar">
        <div className="sidebar-head">
          <h2>Applications</h2>
          <span className="pill">
            {totalApplicants} • {myReviewCount} reviewed by you
          </span>
        </div>

        <div className="field">
          <input
            className="inp"
            placeholder="Search by name, email, or major"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="field row-inline">
          <label htmlFor="sort">Sort by</label>
          <select
            id="sort"
            className="inp"
            value={sort}
            onChange={(e) => setParam({ sort: e.target.value })}
          >
            <option value="fewest">Fewest reviews</option>
            <option value="most">Most reviews</option>
            <option value="recent">Most recent</option>
            <option value="name">Name (A–Z)</option>
          </select>
        </div>

        <div className="field row-inline">
          <label htmlFor="role">Role</label>
          <select
            id="role"
            className="inp"
            value={role}
            onChange={(e) => setParam({ role: e.target.value, id: null })}
          >
            <option value="all">All roles</option>
            <option value="DEVELOPER">Developers</option>
            <option value="DESIGNER">Designers</option>
            <option value="BOTH">Developer + Designer</option>
            <option value="OTHER">Other</option>
            <option value="UNKNOWN">Not specified</option>
          </select>
        </div>

        <div className="count-note">
          Showing {shown.length} of {list.length}
          {list.length > shown.length ? " (narrow the search to see more)" : ""}
        </div>

        {shown.map((a) => (
          <button
            key={a.id}
            className={`app-item${applicant?.id === a.id ? " active" : ""}`}
            onClick={() => setParam({ id: a.id })}
          >
            <div className="app-item-top">
              <span className="app-item-name">{a.fullName}</span>
              {a.gradedByMe ? (
                <span className="badge mine">Graded by you</span>
              ) : (
                <span className={`badge${a.reviewCount === 0 ? " zero" : ""}`}>
                  {a.reviewCount} {a.reviewCount === 1 ? "review" : "reviews"}
                </span>
              )}
            </div>
            <div className="app-item-sub">
              {ROLE_LABEL[a.roleCategory]} · {fmtDate(a.submittedAt)}
            </div>
          </button>
        ))}

        {shown.length === 0 && <div className="empty">No applicants match.</div>}
      </aside>

      <main className="center">
        {!applicant ? (
          <div className="empty">
            {totalApplicants === 0
              ? "No applications yet — import a CSV to get started."
              : "Select an applicant from the list."}
          </div>
        ) : (
          <>
            <h1>{applicant.fullName}</h1>
            <div style={{ color: "var(--muted)", marginBottom: 22 }}>
              Submitted {fmtDate(applicant.submittedAt)} ·{" "}
              {ROLE_LABEL[applicant.roleCategory]}
            </div>

            <section className="card">
              <h3>Basic Information</h3>
              <div className="info-grid">
                <Info label="Name">{applicant.fullName}</Info>
                <Info label="Pronouns">{applicant.pronouns}</Info>
                <Info label="UCLA Email">{applicant.uclaEmail}</Info>
                <Info label="Preferred Contact Email">
                  {applicant.contactEmail || applicant.uclaEmail}
                </Info>
                <Info label="Graduation Year">{applicant.gradYear}</Info>
                <Info label="Role Interest">{applicant.roleRaw}</Info>
                <Info label="Major(s)">{applicant.majors}</Info>
                <Info label="Minor(s)">{applicant.minors}</Info>
                <Info label="Links">
                  {applicant.links ? (
                    <a href={applicant.links} target="_blank" rel="noreferrer">
                      {applicant.links}
                    </a>
                  ) : null}
                </Info>
              </div>
            </section>

            <section className="card">
              <h3>Essay Responses</h3>
              <Essay
                q="What are you looking forward to in Nova?"
                a={applicant.qLookingForward}
              />
              <Essay
                q="Tell us about a time when you took initiative to create a solution."
                a={applicant.qInitiative}
              />
              <Essay
                q="What is a community that is meaningful to you, and what role have you played in it?"
                a={applicant.qCommunity}
              />
              <Essay
                q="Is there anything else you'd like to share with us?"
                a={applicant.anythingElse}
              />
            </section>

            <section className="card">
              <h3>Resume</h3>
              {applicant.resumeEmbedUrl ? (
                <>
                  <iframe
                    className="resume-frame"
                    src={applicant.resumeEmbedUrl}
                    title={`${applicant.fullName} resume`}
                  />
                  <div style={{ marginTop: 10 }}>
                    <a href={applicant.resumeUrl} target="_blank" rel="noreferrer">
                      Open resume in a new tab ↗
                    </a>
                  </div>
                </>
              ) : (
                <div className="empty">No resume link on this application.</div>
              )}
            </section>
          </>
        )}
      </main>

      <ScoringPanel
        key={applicant?.id || "none"}
        grader={grader}
        applicant={applicant}
        myGrade={myGrade}
        list={shown}
        onNavigate={(id) => setParam({ id })}
      />
    </div>
  );
}

function ScoringPanel({ grader, applicant, myGrade, list, onNavigate }) {
  const router = useRouter();
  const blank = { technical: 0, thoughtfulness: 0, initiative: 0, communityFit: 0 };

  const [scores, setScores] = useState(
    myGrade
      ? {
          technical: myGrade.technical,
          thoughtfulness: myGrade.thoughtfulness,
          initiative: myGrade.initiative,
          communityFit: myGrade.communityFit,
        }
      : blank
  );
  const [notes, setNotes] = useState({
    technicalNote: myGrade?.technicalNote || "",
    thoughtfulnessNote: myGrade?.thoughtfulnessNote || "",
    initiativeNote: myGrade?.initiativeNote || "",
    communityFitNote: myGrade?.communityFitNote || "",
    overallNote: myGrade?.overallNote || "",
  });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const msgTimer = useRef(null);

  useEffect(() => () => clearTimeout(msgTimer.current), []);

  if (!applicant) {
    return (
      <aside className="scoring">
        <h2>Scoring</h2>
        <div className="empty">No applicant selected.</div>
      </aside>
    );
  }

  const complete = CRITERIA.every((c) => scores[c.key] >= 1);

  function flash(text) {
    setMsg(text);
    clearTimeout(msgTimer.current);
    msgTimer.current = setTimeout(() => setMsg(""), 3000);
  }

  async function save(advance) {
    if (!complete) return flash("Score all four criteria before saving.");
    setBusy(true);
    const res = await fetch("/api/grades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicantId: applicant.id, ...scores, ...notes }),
    });
    setBusy(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return flash(data.error || "Could not save.");
    }

    if (advance) {
      const i = list.findIndex((a) => a.id === applicant.id);
      const next =
        list.slice(i + 1).find((a) => !a.gradedByMe) ||
        list.find((a) => !a.gradedByMe && a.id !== applicant.id);
      if (next) return onNavigate(next.id);
      flash("Saved — nothing left ungraded in this list.");
    } else {
      flash("Saved.");
    }
    router.refresh();
  }

  const others = applicant.grades;
  const total = CRITERIA.reduce((sum, c) => sum + (scores[c.key] || 0), 0);

  return (
    <aside className="scoring">
      <h2>Scoring</h2>

      {CRITERIA.map((c) => (
        <div className="criterion" key={c.key}>
          <div className="criterion-name">{c.name}</div>
          <div className="criterion-desc">{c.desc}</div>
          <div className="scale">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className={scores[c.key] === n ? "on" : ""}
                aria-pressed={scores[c.key] === n}
                onClick={() => setScores((s) => ({ ...s, [c.key]: n }))}
              >
                {n}
              </button>
            ))}
          </div>
          <textarea
            className="inp"
            placeholder="Comment (optional)"
            value={notes[`${c.key}Note`]}
            onChange={(e) =>
              setNotes((n) => ({ ...n, [`${c.key}Note`]: e.target.value }))
            }
          />
        </div>
      ))}

      <div className="criterion">
        <div className="criterion-name">Overall notes</div>
        <textarea
          className="inp"
          placeholder="Anything the rest of the team should know"
          value={notes.overallNote}
          onChange={(e) => setNotes((n) => ({ ...n, overallNote: e.target.value }))}
        />
      </div>

      <div style={{ fontSize: 13, color: "var(--muted)" }}>
        Your total: <strong>{total}</strong> / 20
      </div>

      <div className="btn-row">
        <button className="btn" disabled={busy} onClick={() => save(false)}>
          Save
        </button>
        <button className="btn primary" disabled={busy} onClick={() => save(true)}>
          Save &amp; Next
        </button>
      </div>
      <div className="save-note">{msg}</div>

      <div className="graded-by">
        <h4>Graded by ({others.length})</h4>
        {others.length === 0 && (
          <div style={{ color: "var(--muted)", fontSize: 13 }}>
            No one has graded this application yet.
          </div>
        )}
        {others.map((g) => (
          <div className="grader-row" key={g.id}>
            <span>
              {g.graderName}
              {g.graderId === grader.id ? " (you)" : ""}
            </span>
            <span className="grader-scores">
              {g.technical}/{g.thoughtfulness}/{g.initiative}/{g.communityFit} ·{" "}
              {g.technical + g.thoughtfulness + g.initiative + g.communityFit}
            </span>
          </div>
        ))}
      </div>
    </aside>
  );
}
