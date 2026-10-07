"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Mugshot } from "../Mugshot";
import InfoStar from "../InfoStar";
import { COLUMNS, VERDICTS, reorderWithin } from "@/lib/deliberation";
import { compareGradYears, gradYearParts } from "@/lib/mapping";

const slug = (value) => value.toLowerCase().replace(/_/g, "-");

async function save(body) {
  const res = await fetch("/api/deliberations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return res.ok
    ? { ok: true, ranking: data.ranking }
    : { ok: false, error: data.error || "Something went wrong." };
}

/**
 * Coffee chat candidates in three columns, each in deliberation order, with a
 * grad year filter per column. The stats count only people passed to the
 * coffee chats, and move as the ranking does. Admins set verdicts, pass
 * maybes, and drag people within their column.
 */
export default function InterviewClient({ ranking, people, isAdmin }) {
  const router = useRouter();
  // Same shared state as Deliberations: changes land here at once and are
  // saved behind, and fresh data from the server replaces them.
  const [order, setOrder] = useState(ranking);
  useEffect(() => setOrder(ranking), [ranking]);

  const [years, setYears] = useState({ devs: "all", designers: "all", others: "all" });
  const [openId, setOpenId] = useState(null);
  const [drag, setDrag] = useState(null); // { id, column }
  const [dropAt, setDropAt] = useState(null); // { column, index }
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const rows = useMemo(
    () =>
      order
        .map((r, i) => ({
          ...people[r.applicantId],
          id: r.applicantId,
          place: i + 1,
          verdict: r.verdict,
          passed: !!r.passed,
        }))
        .filter((r) => r.fullName),
    [order, people]
  );

  const inColumn = (key) => rows.filter((r) => r.column === key);
  const shownIn = (key) =>
    years[key] === "all" ? inColumn(key) : inColumn(key).filter((r) => r.gradYear === years[key]);

  async function act(body) {
    setErr("");
    setBusy(true);
    const r = await save(body);
    setBusy(false);
    if (r.ok) setOrder(r.ranking);
    else setErr(r.error);
    router.refresh();
    return r.ok;
  }

  // Move `id` to position `toIndex` of the year-filtered column. Everyone
  // outside that filter keeps their place in the whole ranking.
  async function moveInColumn(column, id, toIndex) {
    const shown = shownIn(column).map((r) => r.id);
    const from = shown.indexOf(id);
    if (from < 0 || toIndex === from || toIndex < 0 || toIndex >= shown.length) return;
    const newShown = [...shown];
    newShown.splice(from, 1);
    newShown.splice(toIndex, 0, id);
    const members = inColumn(column).map((r) => r.id);
    const newMembers = reorderWithin(members, shown, newShown);
    const newRanking = reorderWithin(
      order.map((r) => r.applicantId),
      members,
      newMembers
    );
    const byId = Object.fromEntries(order.map((r) => [r.applicantId, r]));
    setOrder(newRanking.map((x) => byId[x]));
    await act({ order: newRanking });
  }

  function dropOn(column, index) {
    if (drag && drag.column === column) {
      const from = shownIn(column).findIndex((r) => r.id === drag.id);
      moveInColumn(column, drag.id, from < index ? index - 1 : index);
    }
    setDrag(null);
    setDropAt(null);
  }

  const passedRows = rows.filter((r) => r.passed);
  const yearsAll = [...new Set(rows.map((r) => r.gradYear))].sort(compareGradYears);

  return (
    <div className="page wide ic">
      <h1>Interview candidates</h1>
      <p className="sub">
        Everyone with a verdict from Deliberations, in ranking order. Strong accepts and yeses pass to
        the coffee chats automatically; maybes pass only when an admin passes them by hand.{" "}
        {isAdmin ? "Admins can change verdicts, pass maybes and drag people within their column." : "Only admins change verdicts and passes."}
      </p>

      {err && (
        <div className="err" style={{ marginBottom: 12 }}>
          {err}
        </div>
      )}

      <section className="card ic-stats">
        <div className="ic-hero">
          <div className="bd-title">Passed to the coffee chats</div>
          <div className="hero-num">{passedRows.length}</div>
          <div className="hero-sub">
            of {rows.length} with a verdict · {rows.length - passedRows.length} not passed
          </div>
        </div>

        <div>
          <div className="bd-title">By column</div>
          {COLUMNS.map((c) => {
            const total = inColumn(c.key).length;
            const passed = passedRows.filter((r) => r.column === c.key).length;
            return (
              <div className="bd-row" key={c.key}>
                <span className="bd-label">{c.label}</span>
                <span className="bd-track">
                  <span className="bd-fill" style={{ width: `${total ? (passed / total) * 100 : 0}%` }} />
                </span>
                <span className="bd-val">
                  <strong>{passed}</strong> / {total}
                </span>
              </div>
            );
          })}
        </div>

        <div>
          <div className="bd-title">Passed by verdict</div>
          {VERDICTS.filter((v) => v.value !== "COME_BACK" && v.value !== "STRONG_NO").map((v) => (
            <div className="bd-row" key={v.value}>
              <span className="bd-label">
                {v.icon} {v.label}
              </span>
              <span className="bd-val">
                <strong>{passedRows.filter((r) => r.verdict === v.value).length}</strong>
              </span>
            </div>
          ))}
        </div>

        <div className="ic-years">
          <div className="bd-title">Passed by graduation year</div>
          {yearsAll.length === 0 ? (
            <div className="muted">Nobody has a verdict yet.</div>
          ) : (
            <table className="tbl ic-year-table">
              <thead>
                <tr>
                  <th>Year</th>
                  {COLUMNS.map((c) => (
                    <th key={c.key} className="num">
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {yearsAll.map((y) => (
                  <tr key={y}>
                    <td>{gradYearParts(y).label}</td>
                    {COLUMNS.map((c) => (
                      <td key={c.key} className="num">
                        {passedRows.filter((r) => r.gradYear === y && r.column === c.key).length}
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
            Nobody has a verdict yet. Give people verdicts on Deliberations and they&apos;ll show up here.
          </div>
        </section>
      ) : (
        <div className="ic-cols">
          {COLUMNS.map((c) => {
            const members = inColumn(c.key);
            const shown = shownIn(c.key);
            const yearOpts = [...new Set(members.map((r) => r.gradYear))].sort(compareGradYears);
            return (
              <section className="card ic-col" key={c.key}>
                <div className="ic-col-head">
                  <h3>
                    {c.label} <span className="muted">({members.length})</span>
                  </h3>
                  <select
                    className="inp"
                    aria-label={`${c.label} graduation year`}
                    value={years[c.key]}
                    onChange={(e) => setYears({ ...years, [c.key]: e.target.value })}
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
                      const isDrop = dropAt?.column === c.key && dropAt.index === i && drag && !isMoving;
                      return (
                        <li
                          key={r.id}
                          className={`ic-item${isMoving ? " dragging" : ""}${isDrop ? " drop" : ""}`}
                          onDragOver={(e) => {
                            if (!isAdmin || !drag || drag.column !== c.key) return;
                            e.preventDefault();
                            if (!(dropAt?.column === c.key && dropAt.index === i)) setDropAt({ column: c.key, index: i });
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            dropOn(c.key, i);
                          }}
                        >
                          <div className="ic-row">
                            {isAdmin && (
                              <span
                                className="drag-handle"
                                draggable
                                title="Drag to move within this column"
                                onDragStart={(e) => {
                                  e.dataTransfer.effectAllowed = "move";
                                  e.dataTransfer.setData("text/plain", r.id);
                                  setDrag({ id: r.id, column: c.key });
                                }}
                                onDragEnd={() => {
                                  setDrag(null);
                                  setDropAt(null);
                                }}
                              >
                                ⋮⋮
                              </span>
                            )}
                            <span className="delib-place">{r.place}</span>
                            <Mugshot applicant={r} size={32} zoom={false} />
                            <div className="ic-who">
                              <button
                                type="button"
                                className="delib-name"
                                aria-expanded={openId === r.id}
                                onClick={() => setOpenId(openId === r.id ? null : r.id)}
                              >
                                {r.fullName}
                                {r.infoSession && <InfoStar size={14} />}
                              </button>
                              <span className="muted ic-year">{gradYearParts(r.gradYear).label}</span>
                            </div>

                            {isAdmin ? (
                              <select
                                className="inp ic-verdict"
                                aria-label={`Verdict for ${r.fullName}`}
                                value={r.verdict}
                                disabled={busy}
                                onChange={(e) =>
                                  act({ applicantId: r.id, verdict: e.target.value || null })
                                }
                              >
                                {VERDICTS.map((v) => (
                                  <option key={v.value} value={v.value}>
                                    {v.icon} {v.label}
                                  </option>
                                ))}
                                <option value="">Clear verdict</option>
                              </select>
                            ) : (
                              <span className={`delib-verdict v-${slug(r.verdict)}`}>
                                {VERDICTS.find((v) => v.value === r.verdict)?.label}
                              </span>
                            )}

                            {r.verdict === "MAYBE" ? (
                              <button
                                type="button"
                                className={`ic-pass${r.passed ? " on" : ""}`}
                                disabled={!isAdmin || busy}
                                onClick={() => act({ applicantId: r.id, passed: !r.passed })}
                                title={isAdmin ? "Maybes pass only by hand" : "Only admins pass people"}
                              >
                                {r.passed ? "Passed" : "Pass to interview"}
                              </button>
                            ) : (
                              <span className={`ic-auto${r.passed ? " on" : ""}`}>
                                {r.passed ? "Passed" : "Not passed"}
                              </span>
                            )}

                            {isAdmin && (
                              <span className="delib-nudge">
                                <button
                                  type="button"
                                  aria-label={`Move ${r.fullName} up`}
                                  disabled={busy || i === 0}
                                  onClick={() => moveInColumn(c.key, r.id, i - 1)}
                                >
                                  ▲
                                </button>
                                <button
                                  type="button"
                                  aria-label={`Move ${r.fullName} down`}
                                  disabled={busy || i === shown.length - 1}
                                  onClick={() => moveInColumn(c.key, r.id, i + 1)}
                                >
                                  ▼
                                </button>
                              </span>
                            )}
                          </div>

                          {openId === r.id && (
                            <div className="ic-notes">
                              {r.ratings.map((x, k) => (
                                <div className="delib-item" key={`r${k}`}>
                                  <div className="delib-stamp">
                                    <span>{x.icon}</span>
                                    <strong>{x.graderName}</strong>
                                    <span className="muted">{x.label}</span>
                                  </div>
                                  <div>{x.note || <span className="muted">No note.</span>}</div>
                                </div>
                              ))}
                              {r.eventNotes.map((n, k) => (
                                <div className="delib-item" key={`n${k}`}>
                                  <div className="delib-stamp">
                                    <strong>{n.graderName}</strong>
                                    {n.round != null && <span className="note-label">Round {n.round}</span>}
                                  </div>
                                  <div>{n.body}</div>
                                </div>
                              ))}
                              {r.ratings.length === 0 && r.eventNotes.length === 0 && (
                                <div className="muted">No ratings or notes yet.</div>
                              )}
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
