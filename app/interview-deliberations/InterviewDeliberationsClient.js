"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mugshot } from "../Mugshot";
import { BUCKETS, SCORE_CATEGORIES, reorderWithin } from "@/lib/interviewDeliberation";
import { compareGradYears, gradYearParts } from "@/lib/mapping";

const slug = (value) => value.toLowerCase().replace(/_/g, "-");

async function save(body) {
  const res = await fetch("/api/interview-deliberations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return res.ok ? { ok: true, order: data.order } : { ok: false, error: data.error || "Something went wrong." };
}

/**
 * Final-interview candidates in four columns — Strong accept, Soft yes,
 * Maybe, No — each in rank order (score, then any manual drag), with a grad
 * year filter per column. The bucket itself comes from the scorecards, not
 * from here; dragging only reorders within a column.
 */
export default function InterviewDeliberationsClient({ order: initialOrder, people, isAdmin }) {
  const router = useRouter();
  const [order, setOrder] = useState(initialOrder);
  const [years, setYears] = useState(Object.fromEntries(BUCKETS.map((b) => [b.key, "all"])));
  const [openId, setOpenId] = useState(null);
  const [drag, setDrag] = useState(null); // { id, column }
  const [dropAt, setDropAt] = useState(null); // { column, index }
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const rows = useMemo(
    () => order.map((id, i) => ({ ...people[id], place: i + 1 })).filter((r) => r.fullName),
    [order, people]
  );

  const inColumn = (key) => rows.filter((r) => r.bucket === key);
  const shownIn = (key) =>
    years[key] === "all" ? inColumn(key) : inColumn(key).filter((r) => r.gradYear === years[key]);

  async function act(body) {
    setErr("");
    setBusy(true);
    const r = await save(body);
    setBusy(false);
    if (r.ok) setOrder(r.order);
    else setErr(r.error);
    router.refresh();
    return r.ok;
  }

  async function moveInColumn(column, id, toIndex) {
    const shown = shownIn(column).map((r) => r.id);
    const from = shown.indexOf(id);
    if (from < 0 || toIndex === from || toIndex < 0 || toIndex >= shown.length) return;
    const newShown = [...shown];
    newShown.splice(from, 1);
    newShown.splice(toIndex, 0, id);
    const members = inColumn(column).map((r) => r.id);
    const newMembers = reorderWithin(members, shown, newShown);
    const newOrder = reorderWithin(order, members, newMembers);
    setOrder(newOrder);
    await act({ order: newOrder });
  }

  function dropOn(column, index) {
    if (drag && drag.column === column) {
      const from = shownIn(column).findIndex((r) => r.id === drag.id);
      moveInColumn(column, drag.id, from < index ? index - 1 : index);
    }
    setDrag(null);
    setDropAt(null);
  }

  const yearsAll = [...new Set(rows.map((r) => r.gradYear))].sort(compareGradYears);

  return (
    <div className="page wide ic">
      <h1>Interview deliberations</h1>
      <p className="sub">
        Everyone with a final-interview verdict, bucketed by what their interviewers said and ranked by
        rubric score within that bucket. {isAdmin ? "Admins can drag people within their column." : "Only admins reorder."}
      </p>

      {err && (
        <div className="err" style={{ marginBottom: 12 }}>
          {err}
        </div>
      )}

      <section className="card ic-stats">
        <div className="ic-hero">
          <div className="bd-title">Candidates with a verdict</div>
          <div className="hero-num">{rows.length}</div>
          <div className="hero-sub">across all interview slots</div>
        </div>

        <div>
          <div className="bd-title">By bucket</div>
          {BUCKETS.map((b) => {
            const count = inColumn(b.key).length;
            return (
              <div className="bd-row" key={b.key}>
                <span className="bd-label">
                  {b.icon} {b.label}
                </span>
                <span className="bd-track">
                  <span className="bd-fill" style={{ width: `${rows.length ? (count / rows.length) * 100 : 0}%` }} />
                </span>
                <span className="bd-val">
                  <strong>{count}</strong> / {rows.length}
                </span>
              </div>
            );
          })}
        </div>

        <div className="ic-years">
          <div className="bd-title">By graduation year</div>
          {yearsAll.length === 0 ? (
            <div className="muted">Nobody has a verdict yet.</div>
          ) : (
            <table className="tbl ic-year-table">
              <thead>
                <tr>
                  <th>Year</th>
                  {BUCKETS.map((b) => (
                    <th key={b.key} className="num">
                      {b.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {yearsAll.map((y) => (
                  <tr key={y}>
                    <td>{gradYearParts(y).label}</td>
                    {BUCKETS.map((b) => (
                      <td key={b.key} className="num">
                        {rows.filter((r) => r.gradYear === y && r.bucket === b.key).length}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {rows.length === 0 ? (
        <section className="card">
          <div className="empty">
            Nobody has an interview verdict yet. Once interviewers record one on a scorecard, they&apos;ll show up here.
          </div>
        </section>
      ) : (
        <div className="ic-cols id-cols">
          {BUCKETS.map((b) => {
            const members = inColumn(b.key);
            const shown = shownIn(b.key);
            const yearOpts = [...new Set(members.map((r) => r.gradYear))].sort(compareGradYears);
            return (
              <section className={`card ic-col v-${slug(b.key)}`} key={b.key}>
                <div className="ic-col-head">
                  <h3>
                    {b.icon} {b.label} <span className="muted">({members.length})</span>
                  </h3>
                  <select
                    className="inp"
                    aria-label={`${b.label} graduation year`}
                    value={years[b.key]}
                    onChange={(e) => setYears({ ...years, [b.key]: e.target.value })}
                  >
                    <option value="all">All years</option>
                    {yearOpts.map((y) => (
                      <option key={y} value={y}>
                        {gradYearParts(y).label}
                      </option>
                    ))}
                  </select>
                </div>

                {shown.length === 0 ? (
                  <div className="empty">Nobody here yet.</div>
                ) : (
                  <ol className="ic-list">
                    {shown.map((r, i) => {
                      const isMoving = drag?.id === r.id;
                      const isDrop = dropAt?.column === b.key && dropAt.index === i && drag && !isMoving;
                      return (
                        <li
                          key={r.id}
                          className={`ic-item${isMoving ? " dragging" : ""}${isDrop ? " drop" : ""}`}
                          onDragOver={(e) => {
                            if (!isAdmin || !drag || drag.column !== b.key) return;
                            e.preventDefault();
                            if (!(dropAt?.column === b.key && dropAt.index === i)) setDropAt({ column: b.key, index: i });
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            dropOn(b.key, i);
                          }}
                        >
                          <div className="id-row">
                            {isAdmin && (
                              <span
                                className="drag-handle"
                                draggable
                                title="Drag to move within this column"
                                onDragStart={(e) => {
                                  e.dataTransfer.effectAllowed = "move";
                                  e.dataTransfer.setData("text/plain", r.id);
                                  setDrag({ id: r.id, column: b.key });
                                }}
                                onDragEnd={() => {
                                  setDrag(null);
                                  setDropAt(null);
                                }}
                              >
                                ⋮⋮
                              </span>
                            )}
                            <Mugshot applicant={r} size={32} zoom={false} />
                            <div className="ic-who">
                              <button
                                type="button"
                                className="delib-name"
                                aria-expanded={openId === r.id}
                                onClick={() => setOpenId(openId === r.id ? null : r.id)}
                              >
                                {r.fullName}
                              </button>
                              <span className="muted ic-year">{gradYearParts(r.gradYear).label}</span>
                            </div>
                            <span className="id-score">{r.score != null ? r.score.toFixed(1) : "—"}</span>

                            {isAdmin && (
                              <span className="delib-nudge">
                                <button
                                  type="button"
                                  aria-label={`Move ${r.fullName} up`}
                                  disabled={busy || i === 0}
                                  onClick={() => moveInColumn(b.key, r.id, i - 1)}
                                >
                                  ▲
                                </button>
                                <button
                                  type="button"
                                  aria-label={`Move ${r.fullName} down`}
                                  disabled={busy || i === shown.length - 1}
                                  onClick={() => moveInColumn(b.key, r.id, i + 1)}
                                >
                                  ▼
                                </button>
                              </span>
                            )}
                          </div>

                          {openId === r.id && (
                            <div className="ic-notes">
                              <div className="id-breakdown">
                                {SCORE_CATEGORIES.map((c) => (
                                  <div className="bd-row" key={c.id}>
                                    <span className="bd-label">{c.label}</span>
                                    <span className="bd-track">
                                      <span
                                        className="bd-fill"
                                        style={{ width: `${r.perCategory[c.id] != null ? (r.perCategory[c.id] / 5) * 100 : 0}%` }}
                                      />
                                    </span>
                                    <span className="bd-val">
                                      <strong>{r.perCategory[c.id] != null ? r.perCategory[c.id].toFixed(1) : "—"}</strong> / 5
                                    </span>
                                  </div>
                                ))}
                              </div>
                              {r.scorecards.map((s, k) => (
                                <div className="delib-item" key={k}>
                                  <div className="delib-stamp">
                                    <strong>{s.graderName}</strong>
                                    <span className="muted">{s.verdictLabel}</span>
                                  </div>
                                  <div>{s.generalNotes || <span className="muted">No notes.</span>}</div>
                                </div>
                              ))}
                              <Link className="app-link" href={`/interviews/${r.slotId}`}>
                                full interview notes ↗
                              </Link>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
