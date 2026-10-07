"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import GroupBadge from "../GroupBadge";
import { Mugshot } from "../Mugshot";
import { VERDICTS, verdictMeta } from "@/lib/deliberation";
import { gradYearParts } from "@/lib/mapping";

const slug = (value) => value.toLowerCase().replace(/_/g, "-");

async function saveRanking(body) {
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
 * Round 3, one symbol group at a time. The left side is the person in front of
 * you: their photo, what the coffee chat graders thought, and the notes taken
 * in the room. The right side is the ranking, built as verdicts go in.
 */
export default function DeliberationsClient({ queue, people, ranking, isAdmin }) {
  const router = useRouter();
  const [groupIdx, setGroupIdx] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  // The ranking as shown. Changes land here at once and are saved behind; the
  // server's copy replaces it on the next refresh.
  const [order, setOrder] = useState(ranking);
  const [dragId, setDragId] = useState(null);
  const [dropAt, setDropAt] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => setOrder(ranking), [ranking]);

  const verdictOf = useMemo(
    () => Object.fromEntries(order.map((r) => [r.applicantId, r.verdict])),
    [order]
  );

  const allIds = useMemo(() => queue.flatMap((g) => g.applicantIds), [queue]);
  const groupOf = useMemo(() => {
    const map = {};
    queue.forEach((g, i) => g.applicantIds.forEach((id) => (map[id] = i)));
    return map;
  }, [queue]);

  const group = queue[groupIdx] || null;
  const members = group ? group.applicantIds : [];
  const current = selectedId && people[selectedId] ? selectedId : members[0] || null;
  const person = current ? people[current] : null;

  const passedOf = useMemo(
    () => Object.fromEntries(order.map((r) => [r.applicantId, !!r.passed])),
    [order]
  );

  const doneIn = (g) => g.applicantIds.filter((id) => verdictOf[id]).length;
  const totalDone = allIds.filter((id) => verdictOf[id]).length;

  function select(id) {
    setErr("");
    setSelectedId(id);
    if (groupOf[id] !== undefined) setGroupIdx(groupOf[id]);
  }

  // The next person after `fromId`, in queue order, who has no verdict yet.
  function nextUnrated(fromId) {
    const start = allIds.indexOf(fromId);
    for (let k = 1; k <= allIds.length; k++) {
      const id = allIds[(start + k) % allIds.length];
      if (!verdictOf[id]) return id;
    }
    return null;
  }

  async function act(body) {
    setErr("");
    setBusy(true);
    const r = await saveRanking(body);
    setBusy(false);
    if (r.ok) setOrder(r.ranking);
    else setErr(r.error);
    router.refresh();
    return r.ok;
  }

  async function setVerdict(value) {
    if (!current || !isAdmin) return;
    const ok = await act({ applicantId: current, verdict: value });
    // Moving straight on keeps the room going: the next person with no verdict.
    if (ok && value) {
      const next = nextUnrated(current);
      if (next) select(next);
    }
  }

  async function setPassed(passed) {
    if (!current || !isAdmin) return;
    await act({ applicantId: current, passed });
  }

  async function moveTo(id, toIndex) {
    const from = order.findIndex((r) => r.applicantId === id);
    if (from < 0 || toIndex === from || toIndex < 0 || toIndex >= order.length) return;
    const next = [...order];
    const [row] = next.splice(from, 1);
    next.splice(toIndex, 0, row);
    setOrder(next);
    await act({ order: next.map((r) => r.applicantId) });
  }

  // Dropping on row `index` puts the dragged person where that row is.
  function dropOn(index) {
    if (dragId) {
      const from = order.findIndex((r) => r.applicantId === dragId);
      moveTo(dragId, from < index ? index - 1 : index);
    }
    setDragId(null);
    setDropAt(null);
  }

  const shownRank = order
    .map((r, i) => ({ ...r, place: i + 1, person: people[r.applicantId] }))
    .filter((r) => r.person);

  return (
    <div className="page wide delib">
      <h1>Deliberations</h1>
      <p className="sub">
        Round 3, one symbol group at a time, earliest cohort first. Decide on each person and the
        ranking builds as you go.{" "}
        {isAdmin
          ? "Only admins set verdicts and reorder the ranking."
          : "You can read everything here; only admins set verdicts."}
      </p>

      <div className="delib-bar">
        <button
          type="button"
          className="btn"
          disabled={groupIdx === 0}
          onClick={() => setGroupIdx((i) => Math.max(0, i - 1))}
          aria-label="Previous group"
        >
          ‹ Prev
        </button>
        <select
          className="inp"
          aria-label="Group"
          value={groupIdx}
          onChange={(e) => {
            setGroupIdx(Number(e.target.value));
            setSelectedId(null);
          }}
          disabled={queue.length === 0}
        >
          {queue.map((g, i) => (
            <option key={g.key} value={i}>
              {g.cohortName} · {g.groupName} ({doneIn(g)}/{g.applicantIds.length})
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn"
          disabled={groupIdx >= queue.length - 1}
          onClick={() => setGroupIdx((i) => Math.min(queue.length - 1, i + 1))}
          aria-label="Next group"
        >
          Next ›
        </button>
        <span className="delib-total">
          <strong>{totalDone}</strong> of {allIds.length} decided
        </span>
      </div>

      {err && (
        <div className="err" style={{ marginBottom: 12 }}>
          {err}
        </div>
      )}

      {queue.length === 0 ? (
        <section className="card">
          <div className="empty">No round 3 groups yet. Plan the rounds on Groups, then come back here.</div>
        </section>
      ) : (
        <div className="delib-split">
          <section className="card delib-left">
            <div className="delib-people" role="list">
              {members.map((id) => {
                const p = people[id];
                const v = verdictMeta(verdictOf[id]);
                return (
                  <button
                    type="button"
                    role="listitem"
                    key={id}
                    className={`delib-chip${id === current ? " on" : ""}${v ? " decided" : ""}`}
                    onClick={() => select(id)}
                  >
                    {v ? <span aria-label={v.label}>{v.icon}</span> : <span className="delib-open">·</span>}
                    {p?.fullName}
                  </button>
                );
              })}
            </div>

            {person ? (
              <Detail
                key={current}
                person={person}
                group={group}
                verdict={verdictOf[current] || null}
                passed={!!passedOf[current]}
                isAdmin={isAdmin}
                busy={busy}
                onVerdict={setVerdict}
                onPass={setPassed}
              />
            ) : (
              <div className="empty">Nobody in this group.</div>
            )}
          </section>

          <section className="card delib-right">
            <h3>
              Ranking <span className="muted">({shownRank.length})</span>
            </h3>
            {shownRank.length === 0 ? (
              <div className="empty">Nobody yet. Give someone a verdict and they&apos;ll appear here.</div>
            ) : (
              <ol className="delib-rank">
                {shownRank.map((r, i) => {
                  const v = verdictMeta(r.verdict);
                  const isMoving = dragId === r.applicantId;
                  const isDrop = dropAt === i && dragId && !isMoving;
                  return (
                    <li
                      key={r.applicantId}
                      className={`delib-row${isMoving ? " dragging" : ""}${isDrop ? " drop" : ""}${
                        r.applicantId === current ? " on" : ""
                      }`}
                      onDragOver={(e) => {
                        if (!isAdmin || !dragId) return;
                        e.preventDefault();
                        if (dropAt !== i) setDropAt(i);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        dropOn(i);
                      }}
                    >
                      {isAdmin && (
                        <span
                          className="drag-handle"
                          draggable
                          title="Drag to move"
                          onDragStart={(e) => {
                            e.dataTransfer.effectAllowed = "move";
                            e.dataTransfer.setData("text/plain", r.applicantId);
                            setDragId(r.applicantId);
                          }}
                          onDragEnd={() => {
                            setDragId(null);
                            setDropAt(null);
                          }}
                        >
                          ⋮⋮
                        </span>
                      )}
                      <span className="delib-place">{r.place}</span>
                      <Mugshot applicant={r.person} size={34} zoom={false} />
                      <button type="button" className="delib-name" onClick={() => select(r.applicantId)}>
                        {r.person.fullName}
                        {r.verdict === "COME_BACK" && <span className="delib-flag">come back</span>}
                      </button>
                      <span className={`delib-verdict v-${slug(r.verdict)}`}>
                        {v?.label}
                        {r.passed && <span className="delib-passed">passed</span>}
                      </span>
                      {isAdmin && (
                        <span className="delib-nudge">
                          <button
                            type="button"
                            aria-label={`Move ${r.person.fullName} up`}
                            disabled={busy || i === 0}
                            onClick={() => moveTo(r.applicantId, i - 1)}
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            aria-label={`Move ${r.person.fullName} down`}
                            disabled={busy || i === shownRank.length - 1}
                            onClick={() => moveTo(r.applicantId, i + 1)}
                          >
                            ▼
                          </button>
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function Detail({ person, group, verdict, passed, isAdmin, busy, onVerdict, onPass }) {
  const { year, transfer } = gradYearParts(person.gradYear);
  return (
    <div className="delib-detail">
      <div className="delib-head">
        <Mugshot applicant={person} size={150} />
        <div>
          <div className="delib-name-big">{person.fullName}</div>
          <div className="muted">
            {person.gradYear ? `${year}${transfer ? " · transfer" : ""}` : "No grad year"}
            {person.majors ? ` · ${person.majors}` : ""}
          </div>
          <div style={{ marginTop: 8 }}>
            <GroupBadge group={group} size={16} />
          </div>
          <Link className="app-link" href={`/grading?id=${person.id}`}>
            application ↗
          </Link>
        </div>
      </div>

      <div className="delib-verdicts" role="group" aria-label="Verdict">
        {VERDICTS.map((v) => (
          <button
            type="button"
            key={v.value}
            className={`delib-vbtn${verdict === v.value ? " on" : ""} v-${slug(v.value)}`}
            disabled={!isAdmin || busy}
            onClick={() => onVerdict(verdict === v.value ? null : v.value)}
            title={
              !isAdmin
                ? "Only admins set verdicts"
                : verdict === v.value
                ? "Click again to clear"
                : `Set to ${v.label}`
            }
          >
            <span>{v.icon}</span> {v.label}
          </button>
        ))}
      </div>

      <div className="delib-pass">
        {verdict === "MAYBE" ? (
          <button
            type="button"
            className={`btn${passed ? " on" : ""}`}
            disabled={!isAdmin || busy}
            onClick={() => onPass(!passed)}
            title={isAdmin ? "Maybes pass to the coffee chats only by hand" : "Only admins pass people"}
          >
            {passed ? "Passed to coffee chats · undo" : "Pass to coffee chats"}
          </button>
        ) : verdict === "STRONG_ACCEPT" || verdict === "YES" ? (
          <span className="muted">Passed to the coffee chats automatically.</span>
        ) : (
          <span className="muted">Not passed to the coffee chats.</span>
        )}
      </div>

      <h3>Coffee chat ratings</h3>
      {person.ratings.length === 0 ? (
        <div className="muted">No ratings from the coffee chats yet.</div>
      ) : (
        <div className="delib-list">
          {person.ratings.map((r, i) => (
            <div className="delib-item" key={i}>
              <div className="delib-stamp">
                <span>{r.icon}</span>
                <strong>{r.graderName}</strong>
                <span className="muted">{r.label}</span>
              </div>
              <div>{r.note || <span className="muted">No note.</span>}</div>
            </div>
          ))}
        </div>
      )}

      <h3>Notes from the group work</h3>
      {person.eventNotes.length === 0 ? (
        <div className="muted">No notes from the group work yet.</div>
      ) : (
        <div className="delib-list">
          {person.eventNotes.map((n, i) => (
            <div className="delib-item" key={i}>
              <div className="delib-stamp">
                <strong>{n.graderName}</strong>
                {n.round != null && <span className="note-label">Round {n.round}</span>}
                {n.group && <GroupBadge group={n.group} size={12} />}
              </div>
              <div>{n.body}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
