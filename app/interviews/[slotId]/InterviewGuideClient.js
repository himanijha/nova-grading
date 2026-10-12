"use client";

import { useState } from "react";
import Link from "next/link";
import { TRACKS, VERDICTS, ROLE_CATEGORIES, scriptForCategory } from "@/lib/interviewScripts";

function renderBold(text) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : part));
}

const SECTION_GROUPS = {
  before: "intro",
  timing: "intro",
  intros: "intro",
  general: "behavioral",
  "wrap-up": "wrapup",
  "wrap-up-closing": "wrapup",
  after: "wrapup",
};

function groupFor(key) {
  return SECTION_GROUPS[key] || "technical";
}

async function post(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return res.ok ? { ok: true } : { ok: false, error: data.error || "Couldn't save." };
}

/**
 * The interview guide for one slot. Two different things live on it:
 * - The notes (and the candidate's track) are shared — both interviewers
 *   write to the same copy, since they're writing up the same conversation.
 * - The rubric and verdict are each interviewer's own independent read on
 *   the candidate. Only an assigned interviewer gets an editable copy
 *   ("mine"); everyone else's scorecard is shown read-only, labeled by name
 *   ("others") — including both of theirs, for a grader who isn't assigned.
 */
export default function InterviewGuideClient({ slot, autoCategory, report, mine, others }) {
  const [track, setTrack] = useState(report.track || "");
  const [notes, setNotes] = useState(report.notes || {});
  const [categoryOverride, setCategoryOverride] = useState(report.scriptOverride || "");
  const category = categoryOverride || autoCategory;
  const script = scriptForCategory(category);
  const [open, setOpen] = useState(() => new Set(script.sections.map((s) => s.key)));
  const [reportStatus, setReportStatus] = useState("");

  async function saveReport(patch) {
    setReportStatus("saving");
    const r = await post("/api/interview-reports", { slotId: slot.id, ...patch });
    setReportStatus(r.ok ? "saved" : r.error);
  }

  function toggleSection(key) {
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function onTrackChange(value) {
    setTrack(value);
    saveReport({ track: value });
    // Collapse the non-matching track's section so it's out of the way, but
    // still clickable to expand — those questions stay useful either way.
    if (value) {
      setOpen((prev) => {
        const next = new Set(prev);
        script.sections.forEach((s) => {
          if (s.track && s.track !== value) next.delete(s.key);
        });
        return next;
      });
    }
  }

  function onCategoryChange(value) {
    setCategoryOverride(value);
    setOpen(new Set(scriptForCategory(value || autoCategory).sections.map((s) => s.key)));
    saveReport({ scriptOverride: value || null });
  }

  function onNoteBlur(id, value) {
    if (notes[id] === value) return;
    const next = { ...notes, [id]: value };
    setNotes(next);
    saveReport({ notes: next });
  }

  return (
    <div className="page wide">
      <Link href="/interviews" className="muted small" style={{ textDecoration: "underline" }}>
        ← Back to the schedule
      </Link>

      <h1 style={{ marginTop: 10 }}>{slot.candidateName || "Interview"}</h1>
      <p className="sub">
        {slot.day} · {slot.startRaw}
        {slot.endRaw ? `–${slot.endRaw}` : ""} · {slot.room} · {slot.roleRaw}
        <br />
        {slot.interviewer1Name || "—"} and {slot.interviewer2Name || "—"} interviewing
        {slot.candidateId && (
          <>
            {" · "}
            <Link href={`/grading?id=${slot.candidateId}`} style={{ textDecoration: "underline" }}>
              Application
            </Link>
          </>
        )}
      </p>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>{script.title}</h2>
        <p className="card-sub">{script.subtitle}</p>
        <p className="muted small">Shared between both of you — either can edit.</p>
        <div className="map-row">
          <span className="lbl">Interview type</span>
          <select className="inp" value={categoryOverride} onChange={(e) => onCategoryChange(e.target.value)}>
            <option value="">
              Auto, from Role(s) ({ROLE_CATEGORIES.find((c) => c.value === autoCategory)?.label})
            </option>
            {ROLE_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="map-row">
          <span className="lbl">Candidate track</span>
          <select className="inp" value={track} onChange={(e) => onTrackChange(e.target.value)}>
            <option value="">Pick once you know — collapses the other track's questions</option>
            {TRACKS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {script.sections.map((section) => (
        <section className={`card ig-group-${groupFor(section.key)}`} key={section.key}>
          <button
            type="button"
            className="ig-section-head"
            aria-expanded={open.has(section.key)}
            onClick={() => toggleSection(section.key)}
          >
            <h3>{section.title}</h3>
            <span className={`nav-caret${open.has(section.key) ? " open" : ""}`} aria-hidden="true">
              ▾
            </span>
          </button>

          {open.has(section.key) &&
            (section.type === "info" ? (
              <>
                <ul className="ig-bullets">
                  {section.bullets.map((b, i) =>
                    typeof b === "string" ? (
                      <li key={i}>{renderBold(b)}</li>
                    ) : (
                      <li key={i} className="ig-bullet-callout">
                        {b.important && <div className="ig-bullet-callout-label">Very important</div>}
                        {b.lines.map((line, j) => (
                          <div key={j}>{renderBold(line)}</div>
                        ))}
                      </li>
                    )
                  )}
                </ul>
                {section.noteKey && (
                  <textarea
                    className="inp"
                    rows={2}
                    style={{ marginTop: 10 }}
                    defaultValue={notes[section.noteKey] || ""}
                    onBlur={(e) => onNoteBlur(section.noteKey, e.target.value)}
                    placeholder="Notes…"
                  />
                )}
              </>
            ) : (
              <>
                {section.note && <p className="ig-guidance">{section.note}</p>}
                <ItemList items={section.items} notes={notes} onNoteBlur={onNoteBlur} />
              </>
            ))}
        </section>
      ))}

      {reportStatus && (
        <p className={reportStatus === "saving" || reportStatus === "saved" ? "muted small" : "warn-text"}>
          {reportStatus === "saving" ? "Saving…" : reportStatus === "saved" ? "Saved." : reportStatus}
        </p>
      )}

      {mine && <Scorecard key={mine.graderId} slotId={slot.id} rubric={script.rubric} card={mine} />}

      {others.length > 0 && <TheirScorecards others={others} rubric={script.rubric} />}
    </div>
  );
}

/** Your own rubric, verdict and explanation — the only one you can edit. */
function Scorecard({ slotId, rubric, card }) {
  const [scores, setScores] = useState(card.rubric || {});
  const [verdict, setVerdict] = useState(card.verdict || "");
  const [generalNotes, setGeneralNotes] = useState(card.generalNotes || "");
  const [status, setStatus] = useState("");

  async function save(patch) {
    setStatus("saving");
    const r = await post("/api/interview-scorecards", { slotId, ...patch });
    setStatus(r.ok ? "saved" : r.error);
  }

  function setScore(categoryId, n) {
    const next = { ...scores, [categoryId]: n };
    setScores(next);
    save({ rubric: next });
  }

  function onGeneralNotesBlur(value) {
    if (generalNotes === value) return;
    setGeneralNotes(value);
    save({ generalNotes: value });
  }

  async function pickVerdict(value) {
    if (!generalNotes.trim()) {
      setStatus("Add general notes explaining the verdict first.");
      return;
    }
    setVerdict(value);
    await save({ verdict: value, generalNotes });
  }

  return (
    <>
      {rubric && (
        <section className="card">
          <h3 style={{ marginTop: 0 }}>
            {rubric.title} <span className="muted small">— yours to edit</span>
          </h3>
          <p className="card-sub">{rubric.intro}</p>
          <RubricTable rubric={rubric} scores={scores} onScore={setScore} />
        </section>
      )}

      <section className="card">
        <h3 style={{ marginTop: 0 }}>
          Your verdict <span className="muted small">— yours to edit</span>
        </h3>
        <div className="seg">
          {VERDICTS.map((v) => (
            <button
              key={v.value}
              type="button"
              className={verdict === v.value ? "on" : ""}
              onClick={() => pickVerdict(v.value)}
            >
              {v.label}
            </button>
          ))}
        </div>

        <label className="lbl" style={{ display: "block", marginTop: 14 }}>
          General notes <span className="warn-text">(required to set a verdict)</span>
        </label>
        <textarea
          className="inp"
          rows={4}
          defaultValue={generalNotes}
          onBlur={(e) => onGeneralNotesBlur(e.target.value)}
          placeholder="Why this verdict — summarize the interview and your reasoning."
        />

        {status && (
          <p className={status === "saving" || status === "saved" ? "muted small" : "warn-text"}>
            {status === "saving" ? "Saving…" : status === "saved" ? "Saved." : status}
          </p>
        )}
      </section>
    </>
  );
}

/** Every other grader's scorecard for this slot, labeled by name so anyone
 * viewing the guide can compare rubric scores and general thoughts. */
function TheirScorecards({ others, rubric }) {
  return (
    <>
      {others.map((card) => (
        <section className="card" key={card.graderId}>
          <h3 style={{ marginTop: 0 }}>{card.graderName}'s scorecard</h3>
          {rubric && <RubricTable rubric={rubric} scores={card.rubric} readOnly />}
          <p style={{ marginTop: 14 }}>
            <strong>Verdict: </strong>
            {VERDICTS.find((v) => v.value === card.verdict)?.label || "Not set yet"}
          </p>
          {card.generalNotes && <p className="ig-guidance">{card.generalNotes}</p>}
        </section>
      ))}
    </>
  );
}

/** The scoring table: pick 1-5 per category (5/3/1 are described; 4/2 are
 * the in-between scores the rubric says to use for answers that fall
 * between them), and the total/average build up as scores go in. Read-only
 * for someone else's revealed scorecard. */
function RubricTable({ rubric, scores, onScore, readOnly = false }) {
  const filled = rubric.categories.filter((c) => scores[c.id]);
  const total = filled.reduce((sum, c) => sum + scores[c.id], 0);
  const max = rubric.categories.length * 5;

  return (
    <>
      <div className="ig-rubric">
        {rubric.categories.map((cat) => (
          <div className="ig-rubric-row" key={cat.id}>
            <div className="ig-rubric-label">
              <strong>{cat.label}</strong>
              <div className="ig-guidance">Draws from: {cat.drawsFrom}</div>
            </div>
            <div className="ig-rubric-scores">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  disabled={readOnly}
                  className={`ig-rubric-cell${scores[cat.id] === n ? " on" : ""}`}
                  onClick={() => onScore(cat.id, n)}
                >
                  <span className="ig-rubric-n">{n}</span>
                  {cat.anchors[n] && <span className="ig-rubric-text">{cat.anchors[n]}</span>}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="ig-rubric-total">
        {filled.length}/{rubric.categories.length} scored · Total <strong>{total}</strong>/{max}
        {filled.length === rubric.categories.length && (
          <> · Average <strong>{(total / filled.length).toFixed(1)}</strong></>
        )}
      </p>
    </>
  );
}

function ItemList({ items, notes, onNoteBlur }) {
  return (
    <div className="ig-items">
      {items.map((item) => (
        <div className="ig-item" key={item.id}>
          <div className="ig-prompt">{item.prompt}</div>
          {item.guidance?.map((g, i) => (
            <div className="ig-guidance" key={i}>
              <strong>{g.label}:</strong> {g.text}
            </div>
          ))}
          <textarea
            className="inp"
            rows={2}
            defaultValue={notes[item.id] || ""}
            onBlur={(e) => onNoteBlur(item.id, e.target.value)}
            placeholder="Notes…"
          />
        </div>
      ))}
    </div>
  );
}
