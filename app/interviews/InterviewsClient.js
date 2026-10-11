"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import NoteList from "../NoteList";

const POLL_MS = 25000;

async function call(url, method, body) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return res.ok ? { ok: true, ...data } : { ok: false, error: data.error || "Something went wrong." };
}

/**
 * The interview schedule, polled from the sheet every 25s so it live-updates
 * as rooms fill in, in chronological order. Everyone sees the whole day; a
 * row opens for notes for its own two interviewers, or for an admin on any
 * row. Candidates and interviewers are matched by first name automatically;
 * an unmatched name just shows as the sheet's raw text.
 */
export default function InterviewsClient({ isAdmin }) {
  const [data, setData] = useState(null);
  const [loadErr, setLoadErr] = useState("");
  const [openId, setOpenId] = useState(null);
  const pollRef = useRef(null);

  async function load() {
    try {
      const res = await fetch("/api/interviews", { cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return setLoadErr(body.error || "Couldn't load the schedule.");
      setLoadErr("");
      setData(body);
    } catch {
      setLoadErr("Couldn't reach the server. Retrying…");
    }
  }

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, POLL_MS);
    return () => clearInterval(pollRef.current);
  }, []);

  if (!data) {
    return (
      <div className="page wide">
        <h1>Interviews</h1>
        {loadErr ? <p className="warn-text">{loadErr}</p> : <p className="sub">Loading…</p>}
      </div>
    );
  }

  const byDay = new Map();
  for (const slot of data.slots) {
    if (!byDay.has(slot.day)) byDay.set(slot.day, []);
    byDay.get(slot.day).push(slot);
  }

  return (
    <div className="page wide">
      <h1>Interviews</h1>
      <p className="sub">
        The interview schedule, read live from the sheet.{" "}
        {data.syncedAt ? `Last synced ${new Date(data.syncedAt).toLocaleTimeString()}.` : "Not set up yet."}
      </p>
      {data.syncError && <p className="warn-text">{data.syncError} (showing the last good read.)</p>}
      {loadErr && <p className="warn-text">{loadErr}</p>}

      {isAdmin && <SheetSettings sheetUrl={data.sheetUrl} onChange={load} />}

      {data.slots.length === 0 && <p className="muted">No interview slots yet.</p>}

      {[...byDay.entries()].map(([day, slots]) => (
        <section className="card" key={day}>
          <h3>{day}</h3>
          <table className="tbl">
            <thead>
              <tr>
                <th>Time</th>
                <th>Room</th>
                <th>Candidate</th>
                <th>Interviewer 1</th>
                <th>Interviewer 2</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {slots.map((slot) => (
                <SlotRow
                  key={slot.id}
                  slot={slot}
                  isAdmin={isAdmin}
                  open={openId === slot.id}
                  onToggle={() => setOpenId((id) => (id === slot.id ? null : slot.id))}
                  onChange={load}
                />
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}

function SheetSettings({ sheetUrl, onChange }) {
  const [url, setUrl] = useState(sheetUrl || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    setMsg("");
    const r = await call("/api/interviews", "POST", { action: "setUrl", url });
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    setMsg(`Read ${r.slots.length} interview slots.`);
    onChange();
  }

  return (
    <section className="card">
      <h3>Schedule sheet</h3>
      <p className="card-sub">
        Day, Start, End, Room, Status, Candidate, Role(s), Interviewer 1, Interviewer 2 — shared
        as “Anyone with the link”.
      </p>
      <form className="toolbar" onSubmit={save}>
        <input
          className="inp"
          style={{ flex: 1, minWidth: 240 }}
          placeholder="https://docs.google.com/spreadsheets/d/…"
          aria-label="Interview schedule sheet link"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button className="btn primary" type="submit" disabled={busy || !url.trim()}>
          {busy ? "Reading…" : "Save & sync"}
        </button>
      </form>
      {err && <p className="warn-text">{err}</p>}
      {msg && <p className="muted small">{msg}</p>}
    </section>
  );
}

function SlotRow({ slot, isAdmin, open, onToggle, onChange }) {
  const clickable = slot.mine || isAdmin;
  return (
    <>
      <tr
        className={clickable ? "clickable" : ""}
        onClick={clickable ? onToggle : undefined}
      >
        <td>
          {slot.startRaw}
          {slot.endRaw ? `–${slot.endRaw}` : ""}
        </td>
        <td>{slot.room}</td>
        <td>
          <CandidateName id={slot.candidateId} name={slot.candidateName} raw={slot.candidateRaw} />
        </td>
        <td>
          <Named name={slot.interviewer1Name} raw={slot.interviewer1Raw} />
        </td>
        <td>
          <Named name={slot.interviewer2Name} raw={slot.interviewer2Raw} />
        </td>
        <td>{slot.roleRaw}</td>
      </tr>
      {open && (
        <tr>
          <td colSpan={6}>
            <SlotNotes slot={slot} isAdmin={isAdmin} onChange={onChange} />
          </td>
        </tr>
      )}
    </>
  );
}

/** A matched name, or the sheet's raw text when the sync couldn't place it. */
function Named({ name, raw }) {
  if (name) return <>{name}</>;
  if (!raw) return <span className="muted">—</span>;
  return <span className="warn-text">{raw}</span>;
}

/** A matched candidate's name, clickable to their application and coffee chat page. */
function CandidateName({ id, name, raw }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  if (!id) return <Named name={name} raw={raw} />;
  return (
    <span className="name-menu" ref={ref}>
      <button
        type="button"
        className="name-menu-btn"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
      >
        {name}
      </button>
      {open && (
        <div className="name-menu-popup" onClick={(e) => e.stopPropagation()}>
          <Link href={`/grading?id=${id}`}>Application</Link>
          <Link href={`/interview-selection?focus=${id}`}>Coffee chat</Link>
          <Link href={`/deliberations?focus=${id}`}>Deliberations</Link>
        </div>
      )}
    </span>
  );
}

function SlotNotes({ slot, isAdmin, onChange }) {
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const canWrite = slot.mine || isAdmin;

  const notes = slot.notes.map((n) => ({ ...n, round: null, group: null }));

  async function add() {
    const body = draft.trim();
    if (!body) return;
    setBusy(true);
    setErr("");
    const r = await call("/api/interview-notes", "POST", { slotId: slot.id, body });
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    setDraft("");
    onChange();
  }

  async function editNote(noteId, body) {
    const r = await call("/api/interview-notes", "PATCH", { noteId, body });
    if (!r.ok) setErr(r.error);
    else onChange();
  }

  async function deleteNote(noteId) {
    const r = await call("/api/interview-notes", "DELETE", { noteId });
    if (!r.ok) setErr(r.error);
    else onChange();
  }

  return (
    <div className="interview-notes">
      <NoteList notes={notes} onEdit={editNote} onDelete={deleteNote} />
      {notes.length === 0 && <p className="muted small">No notes yet.</p>}
      {canWrite ? (
        <div className="note-compose">
          <textarea
            className="inp"
            rows={2}
            placeholder="Notes on this interview…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button className="btn primary" disabled={busy || !draft.trim()} onClick={add}>
            Add note
          </button>
        </div>
      ) : (
        <p className="muted small">Only {slot.interviewer1Name || "Interviewer 1"} and{" "}
          {slot.interviewer2Name || "Interviewer 2"} can add notes here.</p>
      )}
      {err && <p className="warn-text">{err}</p>}
    </div>
  );
}
