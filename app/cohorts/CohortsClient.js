"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { matchName, nameIndex } from "@/lib/signups";
import { formatWhen } from "@/lib/when";
import AddToSession from "../AddToSession";

async function post(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return res.ok ? { ok: true, ...data } : { ok: false, error: data.error || "Something went wrong." };
}

export default function CohortsClient({ sheet, cohorts, signups, applicants }) {
  const router = useRouter();
  const refresh = () => router.refresh();

  const people = cohorts.reduce((n, c) => n + c.memberCount, 0);

  return (
    <div className="page wide">
      <h1>Sessions</h1>
      <p className="sub">
        Who is coming to the meet and greet, and when — read straight from the sign-up sheet.{" "}
        {people} people in {cohorts.length} sessions
        {signups.length > 0 && (
          <span className="warn-text"> · {signups.length} names without an application</span>
        )}
        .
      </p>

      <Sheet sheet={sheet} onChange={refresh} />
      {signups.length > 0 && (
        <Unmatched signups={signups} cohorts={cohorts} applicants={applicants} onChange={refresh} />
      )}
      {cohorts.map((c) => (
        <Session
          key={c.id}
          cohort={c}
          waiting={signups.filter((s) => s.cohortId === c.id).length}
          others={applicants
            .filter((a) => a.cohortId !== c.id)
            .map((a) => ({
              ...a,
              sessionName: cohorts.find((x) => x.id === a.cohortId)?.name || null,
            }))}
          onChange={refresh}
        />
      ))}
    </div>
  );
}

// --- the sheet ---------------------------------------------------------------

function Sheet({ sheet, onChange }) {
  const [url, setUrl] = useState(sheet?.url || "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function sync(e) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    setErr("");
    const r = await post("/api/cohorts", { action: "sync", url });
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    setMsg(
      `Read ${r.sessions} sessions: ${r.matched} people matched to their application` +
        (r.unmatched ? `, ${r.unmatched} names still to find.` : ".")
    );
    onChange();
  }

  return (
    <section className="card">
      <h3>Sign-up sheet</h3>
      <p className="card-sub">
        Each column with a time above it is a session, and each name under it is someone coming.
        The day, room and time come from the column&apos;s headers. The sheet has to be shared as
        “Anyone with the link”.
      </p>
      <form className="toolbar" onSubmit={sync}>
        <input
          className="inp"
          style={{ flex: 1, minWidth: 240 }}
          placeholder="https://docs.google.com/spreadsheets/d/…"
          aria-label="Sign-up sheet link"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button className="btn primary" disabled={busy || !url.trim()}>
          {busy ? "Reading…" : sheet ? "Refresh from sheet" : "Read sheet"}
        </button>
      </form>
      {err && <div className="err">{err}</div>}
      <div className="save-note">
        {msg || (sheet ? `Last read ${formatWhen(sheet.syncedAt)}.` : "")}
      </div>
    </section>
  );
}

// --- names nobody has an application for yet ---------------------------------

function Unmatched({ signups, cohorts, applicants, onChange }) {
  const [saving, setSaving] = useState(null);
  const [err, setErr] = useState("");

  // Someone already in a session is spoken for.
  const free = useMemo(() => applicants.filter((a) => !a.inSession), [applicants]);
  const index = useMemo(() => nameIndex(free), [free]);
  const byId = useMemo(() => new Map(free.map((a) => [a.id, a])), [free]);
  const sessionName = (id) => cohorts.find((c) => c.id === id)?.name || "";

  async function match(signup, applicantId) {
    if (!applicantId) return;
    setSaving(signup.id);
    setErr("");
    const r = await post("/api/cohorts", { action: "match", signupId: signup.id, applicantId });
    setSaving(null);
    if (!r.ok) setErr(r.error);
    onChange();
  }

  return (
    <section className="card">
      <h3>
        {signups.length} {signups.length === 1 ? "name" : "names"} without an application
      </h3>
      <p className="card-sub">
        Nobody applied under exactly these names. Pick whose application each one is — usually a
        nickname, a middle name or a typo. They join their session as soon as you do, and the
        choice is remembered the next time the sheet is read.
      </p>
      {err && <div className="err">{err}</div>}
      <table className="tbl">
        <thead>
          <tr>
            <th>On the sheet</th>
            <th>Session</th>
            <th>Application</th>
          </tr>
        </thead>
        <tbody>
          {signups.map((s) => {
            const near = matchName(s.name, index).candidates.map((id) => byId.get(id));
            return (
              <tr key={s.id}>
                <td>
                  <strong>{s.name}</strong>
                  <div className={`small ${near.length ? "muted" : "warn-text"}`}>
                    {near.length
                      ? `Could be ${near.map((a) => a.fullName).join(" or ")}`
                      : "No similar name among the applications"}
                  </div>
                </td>
                <td className="small">{sessionName(s.cohortId)}</td>
                <td style={{ width: 340 }}>
                  <select
                    className="inp"
                    aria-label={`Application for ${s.name}`}
                    value=""
                    disabled={saving === s.id}
                    onChange={(e) => match(s, e.target.value)}
                  >
                    <option value="">Find their application…</option>
                    {near.length > 0 && (
                      <optgroup label="Similar names">
                        {near.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.fullName} · {a.uclaEmail}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    <optgroup label="Everyone not in a session yet">
                      {free.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.fullName} · {a.uclaEmail}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

// --- one session -------------------------------------------------------------

function Session({ cohort, waiting, others, onChange }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [q, setQ] = useState("");

  async function takeBack(applicantId) {
    await fetch("/api/cohorts/members", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicantId }),
    });
    onChange();
  }

  async function remove() {
    await post("/api/cohorts", { action: "delete", cohortId: cohort.id });
    onChange();
  }

  return (
    <section className="card">
      <div className="cohort-row" style={{ borderBottom: 0, padding: 0 }}>
        <div>
          <h3 style={{ margin: 0 }}>{cohort.name}</h3>
          <div className="muted small">
            {formatWhen(cohort.startsAt)}
            {cohort.location ? ` · ${cohort.location}` : ""}
            {cohort.fromSheet ? "" : " · not on the sheet"}
          </div>
        </div>
        <div>
          <strong>{cohort.memberCount}</strong> {cohort.memberCount === 1 ? "person" : "people"}
          {waiting > 0 && <span className="warn-text"> · {waiting} without an application</span>}
        </div>
        <div className="seg">
          <Link href={`/groups?cohort=${cohort.id}`}>Groups</Link>
          <Link href={`/mugshots?cohort=${cohort.id}`}>Mugshots</Link>
          <a href={`/api/cohorts/${cohort.id}/schedule`}>Schedule CSV</a>
          {!cohort.fromSheet &&
            (!confirmDelete ? (
              <button type="button" onClick={() => setConfirmDelete(true)}>
                Delete
              </button>
            ) : (
              <button type="button" className="danger-on" onClick={remove}>
                Delete {cohort.name} and its groups?
              </button>
            ))}
        </div>
      </div>
      {cohort.members.length > 0 && (
        <details className="answers" style={{ marginTop: 12 }}>
          <summary>Who&apos;s coming</summary>
          <p className="small" style={{ lineHeight: 1.7 }}>{cohort.members.join(" · ")}</p>
        </details>
      )}
      <details className="answers" style={{ marginTop: 12 }}>
        <summary>
          Add someone by hand{cohort.byHand.length > 0 && ` · ${cohort.byHand.length} added`}
        </summary>
        <p className="card-sub">
          For someone the sheet has wrong or doesn&apos;t have at all. They get a seat in every
          planned round without anyone else moving, and reading the sheet again leaves them here.
        </p>
        {cohort.byHand.map((a) => (
          <div key={a.id} className="small" style={{ marginBottom: 6 }}>
            {a.fullName} · added by hand{" "}
            <button type="button" className="btn sm" onClick={() => takeBack(a.id)}>
              Remove
            </button>
          </div>
        ))}
        <input
          className="inp"
          type="search"
          autoComplete="off"
          placeholder="Search applications by name or email"
          aria-label={`Add someone to ${cohort.name}`}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <AddToSession
          cohort={cohort}
          others={others}
          q={q}
          onAdded={() => {
            setQ("");
            onChange();
          }}
        />
      </details>
    </section>
  );
}
