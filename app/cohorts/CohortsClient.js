"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Papa from "papaparse";
import { assignCohorts, matchAvailability } from "@/lib/grouping";
import { formatWhen } from "@/lib/when";

async function post(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return res.ok ? { ok: true, ...data } : { ok: false, error: data.error || "Something went wrong." };
}

// <input type="datetime-local"> speaks local time without a zone.
function toLocalInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CohortsClient({ cohorts, people }) {
  const router = useRouter();
  const refresh = () => router.refresh();

  const assigned = people.filter((p) => p.cohortId).length;

  return (
    <div className="page wide">
      <h1>Cohorts</h1>
      <p className="sub">
        The time slots for the group work event. Everyone who passed screening goes into exactly
        one. {people.length} passed · {assigned} in a cohort · {people.length - assigned} not yet.
      </p>

      {people.length === 0 && (
        <div className="card">
          <strong>Nobody has passed screening yet.</strong>{" "}
          <span className="muted">
            Set the cutoffs on <Link href="/rankings">Rankings</Link> and save them as the result
            first.
          </span>
        </div>
      )}

      <CohortList cohorts={cohorts} onChange={refresh} />
      {cohorts.length > 0 && people.length > 0 && (
        <AvailabilityMatch cohorts={cohorts} people={people} onDone={refresh} />
      )}
      {cohorts.length > 0 && people.length > 0 && (
        <Members cohorts={cohorts} people={people} onChange={refresh} />
      )}
    </div>
  );
}

// --- the slots themselves ----------------------------------------------------

function CohortList({ cohorts, onChange }) {
  const [adding, setAdding] = useState({ name: "", startsAt: "", capacity: "" });
  const [err, setErr] = useState("");

  async function add(e) {
    e.preventDefault();
    setErr("");
    const r = await post("/api/cohorts", {
      action: "create",
      name: adding.name,
      startsAt: adding.startsAt ? new Date(adding.startsAt).toISOString() : null,
      capacity: adding.capacity,
    });
    if (!r.ok) return setErr(r.error);
    setAdding({ name: "", startsAt: "", capacity: "" });
    onChange();
  }

  return (
    <section className="card">
      <h3>Time slots</h3>
      {cohorts.length === 0 && (
        <p className="muted">
          No cohorts yet. Add one per time slot — name them the way the availability form words
          them, and matching works without any fiddling.
        </p>
      )}
      {cohorts.length > 0 && (
        <div className="cohort-rows">
          {cohorts.map((c) => (
            <CohortRow key={c.id} cohort={c} onChange={onChange} />
          ))}
        </div>
      )}

      <form className="cohort-add" onSubmit={add}>
        <input
          className="inp"
          placeholder="Name, e.g. Sat Oct 4, 10am"
          value={adding.name}
          onChange={(e) => setAdding({ ...adding, name: e.target.value })}
        />
        <input
          className="inp"
          type="datetime-local"
          aria-label="Start time"
          value={adding.startsAt}
          onChange={(e) => setAdding({ ...adding, startsAt: e.target.value })}
        />
        <input
          className="inp"
          type="number"
          min="1"
          placeholder="Capacity (optional)"
          value={adding.capacity}
          onChange={(e) => setAdding({ ...adding, capacity: e.target.value })}
        />
        <button className="btn primary" disabled={!adding.name.trim()}>
          Add cohort
        </button>
      </form>
      {err && <div className="err">{err}</div>}
    </section>
  );
}

function CohortRow({ cohort, onChange }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    const r = await post("/api/cohorts", {
      action: "update",
      cohortId: cohort.id,
      name: form.name,
      startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
      capacity: form.capacity,
    });
    if (!r.ok) return setErr(r.error);
    setEditing(false);
    onChange();
  }

  async function remove() {
    await post("/api/cohorts", { action: "delete", cohortId: cohort.id });
    onChange();
  }

  if (editing) {
    return (
      <div className="cohort-row editing">
        <input className="inp" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input
          className="inp"
          type="datetime-local"
          value={form.startsAt}
          onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
        />
        <input
          className="inp"
          type="number"
          min="1"
          placeholder="No limit"
          value={form.capacity}
          onChange={(e) => setForm({ ...form, capacity: e.target.value })}
        />
        <div className="seg">
          <button type="button" onClick={() => setEditing(false)}>
            Cancel
          </button>
          <button type="button" className="on" onClick={save}>
            Save
          </button>
        </div>
        {err && <div className="err">{err}</div>}
      </div>
    );
  }

  const full = cohort.capacity && cohort.memberCount >= cohort.capacity;

  return (
    <div className="cohort-row">
      <div>
        <strong>{cohort.name}</strong>
        <div className="muted small">{formatWhen(cohort.startsAt)}</div>
      </div>
      <div className={full ? "warn-text" : ""}>
        <strong>{cohort.memberCount}</strong>
        {cohort.capacity ? ` / ${cohort.capacity}` : ""} people
      </div>
      <div className="seg">
        <Link href={`/groups?cohort=${cohort.id}`}>Groups</Link>
        <a href={`/api/cohorts/${cohort.id}/schedule`}>Schedule CSV</a>
        <button
          type="button"
          onClick={() => {
            setForm({
              name: cohort.name,
              startsAt: toLocalInput(cohort.startsAt),
              capacity: cohort.capacity ?? "",
            });
            setEditing(true);
          }}
        >
          Edit
        </button>
        {!confirmDelete ? (
          <button type="button" onClick={() => setConfirmDelete(true)}>
            Delete
          </button>
        ) : (
          <button type="button" className="danger-on" onClick={remove}>
            Delete {cohort.name} and its groups?
          </button>
        )}
      </div>
    </div>
  );
}

// --- matching from the availability form -----------------------------------

// First header matching the earliest pattern. The timestamp column mentions
// "time" too, so it never counts as the availability answer.
const guessColumn = (headers, patterns) =>
  patterns
    .map((re) => headers.find((h) => re.test(h) && !/timestamp/i.test(h)))
    .find(Boolean) || "";

function AvailabilityMatch({ cohorts, people, onDone }) {
  const [file, setFile] = useState(null); // { name, headers, rows }
  const [emailCol, setEmailCol] = useState("");
  const [availCol, setAvailCol] = useState("");
  const [matchText, setMatchText] = useState(() =>
    Object.fromEntries(cohorts.map((c) => [c.id, c.name]))
  );
  const [keepExisting, setKeepExisting] = useState(true);
  const [plan, setPlan] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  function onFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setPlan(null);
    setMsg("");
    Papa.parse(f, {
      header: true,
      skipEmptyLines: "greedy",
      complete: (out) => {
        const headers = (out.meta.fields || []).filter(Boolean);
        if (!headers.length) return setMsg("That file has no header row.");
        setFile({ name: f.name, headers, rows: out.data });
        setEmailCol(guessColumn(headers, [/ucla.*email/i, /email/i]));
        setAvailCol(guessColumn(headers, [/avail/i, /cohort/i, /slot/i, /attend/i, /time/i, /when/i]));
      },
      error: (e2) => setMsg(e2.message),
    });
  }

  // The cohort text each distinct answer would match, so a wording mismatch
  // shows up before anyone is placed.
  const answerPreview = useMemo(() => {
    if (!file || !availCol) return [];
    const counts = new Map();
    for (const row of file.rows) {
      const v = String(row[availCol] ?? "").trim();
      counts.set(v, (counts.get(v) || 0) + 1);
    }
    const withText = cohorts.map((c) => ({ id: c.id, match: matchText[c.id] }));
    return [...counts]
      .sort((a, b) => b[1] - a[1])
      .map(([answer, count]) => ({ answer, count, cohorts: matchAvailability(answer, withText) }));
  }, [file, availCol, cohorts, matchText]);

  function runMatch() {
    const byEmail = new Map();
    for (const p of people) {
      byEmail.set(p.uclaEmail.toLowerCase(), p);
      if (p.contactEmail) byEmail.set(p.contactEmail.toLowerCase(), p);
    }
    const withText = cohorts.map((c) => ({ id: c.id, match: matchText[c.id] }));

    const responded = new Map(); // personId → available cohort ids (last response wins)
    const unknownEmails = [];
    for (const row of file.rows) {
      const email = String(row[emailCol] ?? "").trim().toLowerCase();
      if (!email) continue;
      const person = byEmail.get(email);
      if (!person) {
        unknownEmails.push(email);
        continue;
      }
      responded.set(person.id, matchAvailability(row[availCol], withText));
    }

    const toPlace = [...responded]
      .filter(([id]) => !(keepExisting && people.find((p) => p.id === id).cohortId))
      .map(([id, available]) => ({ id, available }));

    const existing = {};
    if (keepExisting) {
      for (const p of people) if (p.cohortId) existing[p.cohortId] = (existing[p.cohortId] || 0) + 1;
    }
    const { placed, unplaced } = assignCohorts(toPlace, cohorts, { existing });

    setPlan({
      proposals: toPlace.map(({ id, available }) => ({
        person: people.find((p) => p.id === id),
        available,
        cohortId: placed.get(id) || "",
      })),
      unplaced,
      unknownEmails,
      noResponse: people.filter((p) => !responded.has(p.id)),
      kept: keepExisting ? responded.size - toPlace.length : 0,
    });
    setMsg("");
  }

  async function confirm() {
    setBusy(true);
    const assignments = plan.proposals
      .filter((p) => p.cohortId)
      .map((p) => ({ applicantId: p.person.id, cohortId: p.cohortId }));
    const r = assignments.length ? await post("/api/cohorts", { action: "assign", assignments }) : { ok: true };
    setBusy(false);
    if (!r.ok) return setMsg(r.error);
    setMsg(`Saved ${assignments.length} cohort assignments.`);
    setPlan(null);
    onDone();
  }

  const totals = useMemo(() => {
    if (!plan) return {};
    const t = {};
    for (const c of cohorts) t[c.id] = keepExisting ? c.memberCount : 0;
    for (const p of plan.proposals) if (p.cohortId) t[p.cohortId]++;
    return t;
  }, [plan, cohorts, keepExisting]);

  return (
    <section className="card">
      <h3>Match from the availability form</h3>
      <p className="card-sub">
        Upload the form&apos;s CSV export. Each response is matched to a passed applicant by email,
        and each person goes into one slot they said they can make — people with the fewest
        options first, then the emptiest slot. Nothing is saved until you confirm. A plain{" "}
        <span className="mono">email, cohort</span> CSV works too.
      </p>

      <input type="file" accept=".csv,text/csv" onChange={onFile} />

      {file && (
        <div className="stack" style={{ marginTop: 16 }}>
          <div className="map-row">
            <span className="lbl">Email column</span>
            <select className="inp" value={emailCol} onChange={(e) => setEmailCol(e.target.value)}>
              <option value="">—</option>
              {file.headers.map((h) => (
                <option key={h}>{h}</option>
              ))}
            </select>
          </div>
          <div className="map-row">
            <span className="lbl">Availability column</span>
            <select className="inp" value={availCol} onChange={(e) => setAvailCol(e.target.value)}>
              <option value="">—</option>
              {file.headers.map((h) => (
                <option key={h}>{h}</option>
              ))}
            </select>
          </div>

          <div className="bd-title" style={{ marginTop: 8 }}>
            Text that means each cohort
          </div>
          <p className="muted small" style={{ margin: "-6px 0 4px" }}>
            A response counts as available for a cohort if its answer contains this text (any
            capitalisation).
          </p>
          {cohorts.map((c) => (
            <div className="map-row" key={c.id}>
              <span className="lbl">{c.name}</span>
              <input
                className="inp"
                value={matchText[c.id] ?? ""}
                onChange={(e) => setMatchText({ ...matchText, [c.id]: e.target.value })}
              />
            </div>
          ))}

          {answerPreview.length > 0 && (
            <details className="answers">
              <summary>
                {answerPreview.length} different answers in the file —{" "}
                {answerPreview.filter((a) => a.cohorts.length === 0 && a.answer).length} match no
                cohort
              </summary>
              <table className="tbl">
                <tbody>
                  {answerPreview.map((a) => (
                    <tr key={a.answer}>
                      <td>{a.answer || <em className="muted">blank</em>}</td>
                      <td className="num">{a.count}</td>
                      <td className={a.cohorts.length ? "" : "warn-text"}>
                        {a.cohorts.length
                          ? a.cohorts.map((id) => cohorts.find((c) => c.id === id).name).join(", ")
                          : "no cohort"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          )}

          <label className="check">
            <input
              type="checkbox"
              checked={keepExisting}
              onChange={(e) => setKeepExisting(e.target.checked)}
            />
            Leave people who are already in a cohort where they are (for late responses)
          </label>

          <div>
            <button className="btn primary" disabled={!emailCol || !availCol} onClick={runMatch}>
              {plan ? "Match again" : "Match"} {file.rows.length} responses
            </button>
          </div>
        </div>
      )}

      {plan && (
        <div className="match-plan">
          <div className="plan-totals">
            {cohorts.map((c) => (
              <div key={c.id} className="plan-total">
                <div className="muted small">{c.name}</div>
                <div className="hero-num sm">
                  {totals[c.id]}
                  {c.capacity ? <span className="muted small"> / {c.capacity}</span> : null}
                </div>
              </div>
            ))}
          </div>

          <Problems plan={plan} />

          {plan.proposals.length > 0 && (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Can make</th>
                  <th>Goes to</th>
                </tr>
              </thead>
              <tbody>
                {plan.proposals.map((p, i) => (
                  <tr key={p.person.id}>
                    <td>
                      <strong>{p.person.fullName}</strong>
                      <div className="muted small">{p.person.uclaEmail}</div>
                    </td>
                    <td className="small">
                      {p.available.length
                        ? p.available.map((id) => cohorts.find((c) => c.id === id).name).join(", ")
                        : <span className="warn-text">none of the slots</span>}
                    </td>
                    <td>
                      <select
                        className="inp"
                        value={p.cohortId}
                        onChange={(e) => {
                          const proposals = [...plan.proposals];
                          proposals[i] = { ...p, cohortId: e.target.value };
                          setPlan({ ...plan, proposals });
                        }}
                      >
                        <option value="">Not placed</option>
                        {cohorts.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                            {p.available.includes(c.id) ? "" : " (not available)"}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="btn-row" style={{ maxWidth: 420 }}>
            <button className="btn" onClick={() => setPlan(null)} disabled={busy}>
              Discard
            </button>
            <button className="btn primary" onClick={confirm} disabled={busy}>
              {busy ? "Saving…" : `Confirm ${plan.proposals.filter((p) => p.cohortId).length} assignments`}
            </button>
          </div>
        </div>
      )}
      <div className="save-note">{msg}</div>
    </section>
  );
}

function Problems({ plan }) {
  const items = [];
  if (plan.kept > 0) items.push({ tone: "muted", text: `${plan.kept} responders are already in a cohort and were left alone.` });
  if (plan.unplaced.length) items.push({ tone: "warn-text", text: `${plan.unplaced.length} couldn't be placed — no slot they can make has room. Pick one by hand below.` });
  if (plan.unknownEmails.length)
    items.push({
      tone: "warn-text",
      text: `${plan.unknownEmails.length} responses don't match anyone who passed: ${plan.unknownEmails.slice(0, 8).join(", ")}${plan.unknownEmails.length > 8 ? "…" : ""}`,
    });
  if (plan.noResponse.length)
    items.push({
      tone: "warn-text",
      text: `${plan.noResponse.length} passed applicants haven't responded: ${plan.noResponse
        .slice(0, 8)
        .map((p) => p.fullName)
        .join(", ")}${plan.noResponse.length > 8 ? "…" : ""}`,
    });
  if (!items.length) return null;
  return (
    <ul className="problems">
      {items.map((it, i) => (
        <li key={i} className={it.tone}>
          {it.text}
        </li>
      ))}
    </ul>
  );
}

// --- everyone who passed, and where they are -------------------------------

function Members({ cohorts, people, onChange }) {
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [saving, setSaving] = useState(null);

  const shown = people.filter(
    (p) =>
      (filter === "all" ||
        (filter === "none" ? !p.cohortId : p.cohortId === filter)) &&
      (!q.trim() ||
        [p.fullName, p.uclaEmail].some((v) => v.toLowerCase().includes(q.trim().toLowerCase())))
  );

  async function move(person, cohortId) {
    setSaving(person.id);
    await post("/api/cohorts", {
      action: "assign",
      assignments: [{ applicantId: person.id, cohortId: cohortId || null }],
    });
    setSaving(null);
    onChange();
  }

  return (
    <section className="card">
      <h3>Everyone who passed</h3>
      <p className="card-sub">
        Move anyone by hand. Moving someone to another cohort takes them out of the groups they
        were planned into.
      </p>
      <div className="toolbar">
        <div className="seg">
          <button className={filter === "all" ? "on" : ""} onClick={() => setFilter("all")}>
            All {people.length}
          </button>
          <button className={filter === "none" ? "on" : ""} onClick={() => setFilter("none")}>
            No cohort {people.filter((p) => !p.cohortId).length}
          </button>
          {cohorts.map((c) => (
            <button key={c.id} className={filter === c.id ? "on" : ""} onClick={() => setFilter(c.id)}>
              {c.name} {c.memberCount}
            </button>
          ))}
        </div>
        <input
          className="inp"
          style={{ maxWidth: 260 }}
          placeholder="Search name or email"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      {shown.length === 0 ? (
        <div className="empty">Nobody here.</div>
      ) : (
        <table className="tbl">
          <tbody>
            {shown.map((p) => (
              <tr key={p.id}>
                <td>
                  <strong>{p.fullName}</strong>
                  <div className="muted small">
                    {p.uclaEmail}
                    {p.gradYear ? ` · ${p.gradYear}` : ""}
                  </div>
                </td>
                <td style={{ width: 240 }}>
                  <select
                    className="inp"
                    value={p.cohortId || ""}
                    disabled={saving === p.id}
                    onChange={(e) => move(p, e.target.value)}
                  >
                    <option value="">No cohort</option>
                    {cohorts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
