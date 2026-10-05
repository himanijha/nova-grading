"use client";

import { useRef, useState } from "react";
import Papa from "papaparse";
import Link from "next/link";
import { useRouter } from "next/navigation";
import InfoStar from "../InfoStar";

const matches = (p, q) => {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  return [p.name, p.email, p.applicant?.fullName].some((v) => v && v.toLowerCase().includes(s));
};

// Sign-in sheets come in every shape: "Name", "Full name", or a first and a
// last name column. A UCLA email column is preferred over a personal one.
function guessColumns(headers) {
  const h = headers.map((x) => ({ x, n: x.toLowerCase() }));
  const find = (test) => h.find(({ n }) => test(n))?.x || "";
  const first = find((n) => n.includes("first") && n.includes("name"));
  const last = find((n) => n.includes("last") && n.includes("name"));
  return {
    name: first || find((n) => n.includes("name") && !n.includes("last")),
    lastName: first ? last : "",
    email: find((n) => n.includes("ucla") && n.includes("email")) || find((n) => n.includes("email")),
  };
}

/**
 * Who came to an info session. Anyone on this list gets a star next to their
 * name on the grading pages as soon as their application is in, and a note or
 * auto accept left here shows up in Rankings. Graders can add someone they saw
 * there before the sign-in sheet is imported; the import merges into them.
 */
export default function InfoSessionClient({ people, applicants, isAdmin }) {
  const router = useRouter();
  const searchRef = useRef(null);
  const [q, setQ] = useState("");
  const [show, setShow] = useState("all");
  const [openId, setOpenId] = useState(null);
  const [notice, setNotice] = useState("");

  const applied = people.filter((p) => p.applicant).length;
  const accepts = people.filter((p) => p.autoAccept).length;
  const open = people.find((p) => p.id === openId) || null;

  const shown = people.filter(
    (p) =>
      matches(p, q) &&
      (show === "all" ||
        (show === "applied" && p.applicant) ||
        (show === "not" && !p.applicant) ||
        (show === "notes" && (p.note || p.autoAccept)))
  );

  function back() {
    setOpenId(null);
    setNotice("");
    setQ("");
    setTimeout(() => searchRef.current?.focus(), 0);
  }

  function opened(id, text = "") {
    setNotice(text);
    setOpenId(id);
    router.refresh();
  }

  if (open) {
    return (
      <Person
        key={open.id}
        person={open}
        notice={notice}
        isAdmin={isAdmin}
        onBack={back}
        onChange={() => router.refresh()}
      />
    );
  }
  // Someone just added: they're open as soon as the refreshed list has them.
  if (openId) {
    return (
      <div className="page checkin">
        <div className="empty">Opening…</div>
      </div>
    );
  }

  return (
    <div className="page checkin infosess">
      <h1>Info session</h1>
      <p className="sub">
        Everyone who came to an info session. Their application gets a star <InfoStar size={16} />{" "}
        on Grading and Rankings, whether they applied before or after they were added. Search for
        someone to leave a note; if they aren&apos;t on the list yet, add them from the search.
      </p>

      {isAdmin && <ImportSheet onDone={() => router.refresh()} />}

      <div className="checkin-stats">
        <div>
          <strong>{people.length}</strong>
          <span>attended</span>
        </div>
        <div>
          <strong>{applied}</strong>
          <span>/ {people.length} applied</span>
        </div>
        <div>
          <strong>{accepts}</strong>
          <span>auto {accepts === 1 ? "accept" : "accepts"}</span>
        </div>
      </div>

      <div className="checkin-search">
        <input
          ref={searchRef}
          className="inp big"
          type="search"
          inputMode="search"
          autoComplete="off"
          placeholder="Search name or email"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="seg">
          <button className={show === "all" ? "on" : ""} onClick={() => setShow("all")}>
            All
          </button>
          <button className={show === "applied" ? "on" : ""} onClick={() => setShow("applied")}>
            Applied {applied}
          </button>
          <button className={show === "not" ? "on" : ""} onClick={() => setShow("not")}>
            Not yet {people.length - applied}
          </button>
          <button className={show === "notes" ? "on" : ""} onClick={() => setShow("notes")}>
            Has a note
          </button>
        </div>
      </div>

      <div className="checkin-list">
        {people.length === 0 && (
          <div className="empty">
            {isAdmin
              ? "Import the sign-in sheet above, or search for someone to add them by hand."
              : "Nobody is on the list yet. Search for someone to add them."}
          </div>
        )}
        {people.length > 0 && shown.length === 0 && (
          <div className="empty">No one on the list matches that.</div>
        )}
        {shown.map((p) => (
          <button key={p.id} type="button" className="checkin-row" onClick={() => setOpenId(p.id)}>
            <span className="checkin-name">
              <strong>
                {p.name}
                {p.applicant && <InfoStar size={16} />}
              </strong>
              <span className="muted small">{p.email || "No email yet"}</span>
            </span>
            <span className="checkin-marks">
              {p.autoAccept && <span className="dtag accept">auto accept</span>}
              {p.note && !p.autoAccept && <span className="mark ok">💬 Note</span>}
              {p.applicant ? (
                <span className="mark ok">Applied</span>
              ) : (
                <span className="mark need">Not applied</span>
              )}
            </span>
          </button>
        ))}
      </div>

      {q.trim() && <AddPerson key={q.trim()} q={q.trim()} applicants={applicants} onAdded={opened} />}
    </div>
  );
}

/**
 * Below the search results: add whoever was searched for. People who applied
 * come first, so picking one brings their exact name and email along.
 */
function AddPerson({ q, applicants, onAdded }) {
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const s = q.toLowerCase();
  const suggestions = applicants
    .filter((a) => [a.fullName, a.uclaEmail].some((v) => v && v.toLowerCase().includes(s)))
    .slice(0, 5);

  async function add(person) {
    setBusy(true);
    setErr("");
    const res = await fetch("/api/infosession/people", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(person),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) return onAdded(data.id, `Added ${person.name}.`);
    // Someone beat you to it, or they are under a name the search missed.
    if (res.status === 409 && data.id) return onAdded(data.id, data.error);
    setErr(data.error || "Could not add them.");
  }

  return (
    <div className="card infosess-add">
      <h3>Not on the list?</h3>
      {suggestions.length > 0 && (
        <>
          <div className="muted small">They applied — add them from their application:</div>
          <div className="stack" style={{ margin: "8px 0 12px" }}>
            {suggestions.map((a) => (
              <button
                key={a.id}
                type="button"
                className="btn"
                disabled={busy}
                onClick={() => add({ name: a.fullName, email: a.uclaEmail })}
              >
                + {a.fullName} · <span className="muted">{a.uclaEmail}</span>
              </button>
            ))}
          </div>
        </>
      )}
      {!form ? (
        <button
          type="button"
          className="btn"
          disabled={busy}
          onClick={() => setForm({ name: q.includes("@") ? "" : q, email: q.includes("@") ? q : "" })}
        >
          + Add someone new
        </button>
      ) : (
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            add(form);
          }}
        >
          <input
            className="inp"
            placeholder="Full name"
            value={form.name}
            autoFocus
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <input
            className="inp"
            type="email"
            placeholder="Email (optional — the sign-in sheet fills it in)"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
          <button className="btn primary" disabled={busy || !form.name.trim()}>
            {busy ? "Adding…" : "Add to the list"}
          </button>
        </form>
      )}
      {err && <div className="err">{err}</div>}
    </div>
  );
}

function ImportSheet({ onDone }) {
  const [headers, setHeaders] = useState(null);
  const [rows, setRows] = useState([]);
  const [cols, setCols] = useState({ name: "", lastName: "", email: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState(null);
  const fileRef = useRef(null);

  function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr("");
    setResult(null);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: "greedy",
      complete: (out) => {
        const hs = (out.meta.fields || []).filter(Boolean);
        if (hs.length === 0) return setErr("That file has no header row.");
        setHeaders(hs);
        setRows(out.data);
        setCols(guessColumns(hs));
      },
      error: (e2) => setErr(e2.message),
    });
  }

  async function submit() {
    setBusy(true);
    setErr("");
    const payload = rows.map((r) => ({
      name: [r[cols.name], cols.lastName ? r[cols.lastName] : ""]
        .map((v) => String(v ?? "").trim())
        .filter(Boolean)
        .join(" "),
      email: r[cols.email],
    }));
    const res = await fetch("/api/infosession", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows: payload }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setErr(data.error || "Import failed.");
    setResult(data);
    setHeaders(null);
    setRows([]);
    if (fileRef.current) fileRef.current.value = "";
    onDone();
  }

  const pick = (key, label, optional) => (
    <div className="map-row">
      <span className="lbl">
        {label} {!optional && <span className="req">*</span>}
      </span>
      <select
        className="inp"
        value={cols[key]}
        onChange={(e) => setCols((c) => ({ ...c, [key]: e.target.value }))}
      >
        <option value="">{optional ? "— none —" : "— pick a column —"}</option>
        {headers.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="card">
      <h3>Import sign-in sheet</h3>
      <p className="sub admin-only" style={{ margin: "0 0 10px" }}>
        Admins only. A CSV with a name and an email column. People already on the list (by email)
        keep their notes, and so does anyone a grader added by hand under the same name.
      </p>
      <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={onFile} />
      {headers && (
        <div style={{ marginTop: 14 }}>
          {pick("name", cols.lastName ? "First name" : "Name", false)}
          {pick("lastName", "Last name", true)}
          {pick("email", "Email", false)}
          <button
            className="btn primary"
            disabled={busy || !cols.name || !cols.email}
            onClick={submit}
          >
            {busy ? "Importing…" : `Import ${rows.length} ${rows.length === 1 ? "person" : "people"}`}
          </button>
        </div>
      )}
      {err && <div className="err">{err}</div>}
      {result && (
        <div className="save-note">
          {result.created} added, {result.merged} matched to people added by hand,{" "}
          {result.updated} updated, {result.unchanged} already on the list
          {result.skipped.length > 0 && `, ${result.skipped.length} skipped`}.
          {result.skipped.length > 0 && (
            <ul>
              {result.skipped.slice(0, 20).map((s) => (
                <li key={s.line}>
                  Line {s.line}: {s.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function Person({ person, notice, isAdmin, onBack, onChange }) {
  const [note, setNote] = useState(person.note || "");
  const [autoAccept, setAutoAccept] = useState(person.autoAccept);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const dirty = note.trim() !== (person.note || "") || autoAccept !== person.autoAccept;

  async function save() {
    if (autoAccept && !note.trim()) return setMsg("Explain this auto accept in the note.");
    setBusy(true);
    const res = await fetch("/api/infosession", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: person.id, note, autoAccept }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    setMsg(res.ok ? "Saved." : data.error || "Could not save.");
    if (res.ok) onChange();
  }

  async function remove() {
    if (!window.confirm(`Take ${person.name} off the info session list?`)) return;
    setBusy(true);
    await fetch("/api/infosession", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: person.id }),
    });
    setBusy(false);
    onBack();
    onChange();
  }

  return (
    <div className="page checkin person infosess">
      <button type="button" className="back" onClick={onBack}>
        ‹ Back to list
      </button>

      <h1 className="person-name">
        {person.name}
        {person.applicant && <InfoStar size={24} />}
      </h1>
      <div className="muted center-text">
        {person.email || "No email yet — the sign-in sheet will fill it in"}
      </div>
      {!person.onSheet && (
        <div className="muted small center-text">
          Added by hand{person.addedByName ? ` by ${person.addedByName}` : ""}, not on a sign-in
          sheet yet
        </div>
      )}
      {notice && <div className="save-note center-text">{notice}</div>}
      <div className="center-text" style={{ marginTop: 8 }}>
        {person.applicant ? (
          <Link href={`/grading?id=${person.applicant.id}`}>
            Applied as {person.applicant.fullName} — open application ↗
          </Link>
        ) : (
          <span className="mark need">No application yet</span>
        )}
      </div>

      <section className="card infosess-note">
        <h3>Note for Rankings</h3>
        <p className="muted small" style={{ marginTop: 0 }}>
          Shown with the graders&apos; reviews on this person&apos;s application in Rankings.
        </p>
        <textarea
          className={`inp${autoAccept && !note.trim() ? " needed" : ""}`}
          placeholder={autoAccept ? "Why is this an auto accept?" : "What stood out about them"}
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            setMsg("");
          }}
        />

        <div className="criterion auto-block">
          <div className="criterion-name">
            Auto decision{autoAccept && <span className="req"> — note required</span>}
          </div>
          <div className="criterion-desc">
            Works like an auto accept on the grading page: the application goes to the top of
            Rankings and passes whatever the cutoff is.
          </div>
          <div className="auto-row">
            <button
              type="button"
              className={`btn auto accept${autoAccept ? " on" : ""}`}
              aria-pressed={autoAccept}
              onClick={() => {
                setAutoAccept((a) => !a);
                setMsg("");
              }}
            >
              Auto accept
            </button>
          </div>
        </div>

        <div className="btn-row">
          <button className="btn primary" disabled={busy || !dirty} onClick={save}>
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
        <div className="save-note">
          {msg ||
            (person.updatedByName && (person.note || person.autoAccept)
              ? `Last edited by ${person.updatedByName}.`
              : "")}
        </div>
      </section>

      {isAdmin && (
        <button className="btn wide" style={{ marginTop: 16, color: "var(--danger)" }} disabled={busy} onClick={remove}>
          Remove from the list
        </button>
      )}
    </div>
  );
}
