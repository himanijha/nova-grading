"use client";

import { useState } from "react";
import Link from "next/link";
import { TRACKS, VERDICTS } from "@/lib/interviewScripts";

async function savePatch(slotId, patch) {
  const res = await fetch("/api/interview-reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slotId, ...patch }),
  });
  const data = await res.json().catch(() => ({}));
  return res.ok ? { ok: true } : { ok: false, error: data.error || "Couldn't save." };
}

/**
 * The interview guide for one slot: the script's sections as collapsible
 * blocks, a track picker that reveals the matching newer/experienced
 * questions, a note box under each question, and a verdict at the bottom
 * that needs general notes to explain it. Every field autosaves (on blur for
 * text, immediately for the track and verdict) rather than needing a save
 * button, since this is filled in live during the interview.
 */
export default function InterviewGuideClient({ slot, script, report }) {
  const [track, setTrack] = useState(report.track || "");
  const [notes, setNotes] = useState(report.notes || {});
  const [rubric, setRubric] = useState(report.rubric || {});
  const [verdict, setVerdict] = useState(report.verdict || "");
  const [generalNotes, setGeneralNotes] = useState(report.generalNotes || "");
  const [open, setOpen] = useState(() => new Set(script.sections.map((s) => s.key)));
  const [status, setStatus] = useState(""); // "", "saving", "saved", error message

  async function save(patch) {
    setStatus("saving");
    const r = await savePatch(slot.id, patch);
    setStatus(r.ok ? "saved" : r.error);
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
    save({ track: value });
  }

  function onNoteBlur(id, value) {
    if (notes[id] === value) return;
    const next = { ...notes, [id]: value };
    setNotes(next);
    save({ notes: next });
  }

  function setScore(categoryId, n) {
    const next = { ...rubric, [categoryId]: n };
    setRubric(next);
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
        <div className="map-row">
          <span className="lbl">Candidate track</span>
          <select className="inp" value={track} onChange={(e) => onTrackChange(e.target.value)}>
            <option value="">Pick once you know — unlocks the matching questions</option>
            {TRACKS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {script.sections.map((section) => (
        <section className="card" key={section.key}>
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
              <ul className="ig-bullets">
                {section.bullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            ) : (
              <ItemList items={section.items} track={track} notes={notes} onNoteBlur={onNoteBlur} />
            ))}
        </section>
      ))}

      {script.rubric && <Rubric rubric={script.rubric} scores={rubric} onScore={setScore} />}

      <section className="card">
        <h3 style={{ marginTop: 0 }}>Verdict</h3>
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
    </div>
  );
}

/** The scoring table: pick 1-5 per category (5/3/1 are described; 4/2 are
 * the in-between scores the rubric says to use for answers that fall
 * between them), and the total/average build up as scores go in. */
function Rubric({ rubric, scores, onScore }) {
  const filled = rubric.categories.filter((c) => scores[c.id]);
  const total = filled.reduce((sum, c) => sum + scores[c.id], 0);
  const max = rubric.categories.length * 5;

  return (
    <section className="card">
      <h3 style={{ marginTop: 0 }}>{rubric.title}</h3>
      <p className="card-sub">{rubric.intro}</p>
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
    </section>
  );
}

function ItemList({ items, track, notes, onNoteBlur }) {
  const shown = items.filter((item) => !item.track || item.track === track);
  if (shown.length === 0) {
    return <p className="muted small">Pick a track above to see these questions.</p>;
  }
  return (
    <div className="ig-items">
      {shown.map((item) => (
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
