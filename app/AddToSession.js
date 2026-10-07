"use client";

import { useState } from "react";

const MAX_SHOWN = 6;

const matches = (p, q) => [p.fullName, p.uclaEmail].some((v) => v && v.toLowerCase().includes(q));

/**
 * Applications matching `q` that aren't in this session, each one tap from
 * being added to it. For the people the sign-up sheet got wrong. `others` is
 * every such applicant: { id, fullName, uclaEmail, status, sessionName }.
 */
export default function AddToSession({ cohort, others, q, onAdded }) {
  const [pickedId, setPickedId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const s = q.trim().toLowerCase();
  if (!s) return null;
  const found = others.filter((p) => matches(p, s));
  const shown = found.slice(0, MAX_SHOWN);

  async function add(p) {
    setBusy(true);
    setErr("");
    const res = await fetch("/api/cohorts/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cohortId: cohort.id, applicantId: p.id, move: !!p.sessionName }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setErr(data.error || "Something went wrong.");
    setPickedId(null);
    onAdded(p);
  }

  return (
    <div className="add-to-session">
      <div className="muted small">
        {found.length === 0
          ? "No other application matches that. Only people who applied can be added."
          : `Not in ${cohort.name} — tap to add`}
      </div>
      {err && <div className="err">{err}</div>}
      {shown.map((p) => {
        const blocked = p.status === "REJECTED";
        return (
          <div key={p.id} className="checkin-list">
            <button
              type="button"
              className="checkin-row"
              onClick={() => setPickedId(pickedId === p.id ? null : p.id)}
            >
              <span className="checkin-name">
                <strong>{p.fullName}</strong>
                <span className="muted small">{p.uclaEmail}</span>
              </span>
              <span className="checkin-marks">
                {blocked ? (
                  <span className="mark need">Not passed</span>
                ) : (
                  p.sessionName && <span className="mark need">In {p.sessionName}</span>
                )}
              </span>
            </button>
            {pickedId === p.id &&
              (blocked ? (
                <div className="warn-text small">
                  {p.fullName} was marked not passed in Rankings, so they can&apos;t be added. An
                  admin has to pass them there first.
                </div>
              ) : (
                <button type="button" className="btn primary" disabled={busy} onClick={() => add(p)}>
                  {busy
                    ? "Adding…"
                    : p.sessionName
                      ? `Move ${p.fullName} from ${p.sessionName} to ${cohort.name}`
                      : `Add ${p.fullName} to ${cohort.name}`}
                </button>
              ))}
          </div>
        );
      })}
      {found.length > shown.length && (
        <div className="muted small">{found.length - shown.length} more — keep typing to narrow it down.</div>
      )}
    </div>
  );
}
