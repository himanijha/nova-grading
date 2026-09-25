"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import GroupBadge from "../GroupBadge";
import { Mugshot } from "../Mugshot";

async function groupsApi(body) {
  const res = await fetch("/api/groups", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return res.ok ? { ok: true } : { ok: false, error: data.error || "Something went wrong." };
}

export default function GroupsClient({ cohorts, cohortId, board, graders, isAdmin }) {
  const router = useRouter();
  const [roundId, setRoundId] = useState(board?.rounds[0]?.id || null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  // Keep the selected round valid as rounds are added and removed.
  useEffect(() => {
    if (!board) return;
    if (!board.rounds.some((r) => r.id === roundId)) {
      setRoundId(board.rounds[board.rounds.length - 1]?.id || null);
    }
  }, [board, roundId]);

  async function act(body) {
    setErr("");
    setBusy(true);
    const r = await groupsApi({ cohortId, ...body });
    setBusy(false);
    if (!r.ok) setErr(r.error);
    router.refresh();
    return r.ok;
  }

  if (cohorts.length === 0) {
    return (
      <div className="page">
        <h1>Groups</h1>
        <div className="card">
          No cohorts yet.{" "}
          {isAdmin ? <Link href="/cohorts">Create the time slots first.</Link> : "An admin sets them up."}
        </div>
      </div>
    );
  }

  const round = board.rounds.find((r) => r.id === roundId) || null;

  return (
    <div className="page wide">
      <h1>Groups</h1>
      <p className="sub">
        Each round splits the room into symbol groups. Graders stay at one symbol all hour; people
        move to a new one each round.
      </p>

      <div className="seg" style={{ marginBottom: 16 }}>
        {cohorts.map((c) => (
          <Link key={c.id} href={`/groups?cohort=${c.id}`} className={c.id === cohortId ? "on" : ""}>
            {c.name} · {c.memberCount}
          </Link>
        ))}
      </div>

      {isAdmin && (
        <Setup board={board} graders={graders} act={act} busy={busy} />
      )}

      {err && <div className="err" style={{ marginBottom: 12 }}>{err}</div>}

      <section className="card">
        <div className="round-bar">
          <div className="seg">
            {board.rounds.map((r) => (
              <button key={r.id} className={r.id === roundId ? "on" : ""} onClick={() => setRoundId(r.id)}>
                Round {r.number}
              </button>
            ))}
            {board.rounds.length === 0 && <span className="muted">No rounds planned yet.</span>}
          </div>
          {isAdmin && board.groups.length > 0 && (
            <RoundActions board={board} round={round} act={act} busy={busy} />
          )}
        </div>

        {round ? (
          <Board board={board} round={round} isAdmin={isAdmin} act={act} />
        ) : (
          <div className="empty">
            {board.groups.length === 0
              ? isAdmin
                ? "Set how many groups this cohort has, then plan the rounds."
                : "An admin hasn't set up groups for this cohort yet."
              : isAdmin
              ? "Plan the rounds above."
              : "No rounds planned yet."}
          </div>
        )}
      </section>
    </div>
  );
}

// --- how many groups, and who sits at each ---------------------------------

function Setup({ board, graders, act, busy }) {
  const n = board.members.length;
  const count = board.groups.length;
  const per = count ? n / count : null;
  const setCount = (next) => act({ action: "setGroupCount", count: next });

  // Graders sit at one symbol for the whole hour, so each can be at only one
  // group per cohort. Map grader → the group they're already at.
  const seatedAt = {};
  for (const g of board.groups) for (const x of g.graders) seatedAt[x.id] = g;

  return (
    <section className="card">
      <h3>Groups and graders</h3>
      {/* A stepper that saves on each press, so the number shown is always
          what the room actually has. */}
      <div className="setup-row">
        <span className="setup-label">Groups in the room</span>
        <div className="stepper">
          <button
            type="button"
            aria-label="One fewer group"
            disabled={busy || count <= 1}
            onClick={() => setCount(count - 1)}
          >
            −
          </button>
          <strong>{count}</strong>
          <button
            type="button"
            aria-label="One more group"
            disabled={busy || count >= 40}
            onClick={() => setCount(count + 1)}
          >
            +
          </button>
        </div>
        <span className="muted small">
          {per
            ? `${n} people → ${Math.floor(per)}${per % 1 ? `–${Math.ceil(per)}` : ""} per group`
            : `${n} people in this cohort`}
          {board.rounds.length > 0 &&
            " · a removed group's people move to the smallest groups; a new group starts empty until you reshuffle"}
        </span>
      </div>

      {board.groups.length > 0 && (
        <div className="grader-grid">
          {board.groups.map((g) => (
            <GraderPicker
              key={g.id}
              group={g}
              graders={graders}
              seatedAt={seatedAt}
              act={act}
              busy={busy}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function GraderPicker({ group, graders, seatedAt, act, busy }) {
  const ids = group.graders.map((g) => g.id);
  const others = graders.filter((g) => !ids.includes(g.id));
  return (
    <div className="grader-pick">
      <GroupBadge group={group} />
      <div className="chips">
        {group.graders.map((g) => (
          <span className="chip" key={g.id}>
            {g.name}
            <button
              type="button"
              aria-label={`Remove ${g.name} from ${group.name}`}
              disabled={busy}
              onClick={() =>
                act({ action: "setGraders", groupId: group.id, graderIds: ids.filter((x) => x !== g.id) })
              }
            >
              ×
            </button>
          </span>
        ))}
        {others.length > 0 && (
          <select
            className="chip-add"
            value=""
            disabled={busy}
            aria-label={`Add a grader to ${group.name}`}
            onChange={(e) =>
              e.target.value &&
              act({ action: "setGraders", groupId: group.id, graderIds: [...ids, e.target.value] })
            }
          >
            <option value="">+ grader</option>
            {/* Someone already at another symbol is moved here, not doubled up. */}
            {others.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
                {seatedAt[g.id] ? ` (move from ${seatedAt[g.id].name})` : ""}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}

// --- planning rounds ---------------------------------------------------------

function RoundActions({ board, round, act, busy }) {
  const [planning, setPlanning] = useState(false);
  const [rounds, setRounds] = useState(board.rounds.length || 3);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => setConfirmDelete(false), [round?.id]);

  const unplaced = round ? board.members.filter((m) => !round.placement[m.id]).length : 0;

  if (planning) {
    return (
      <div className="round-actions confirm-box">
        <label htmlFor="nrounds">Plan</label>
        <input
          id="nrounds"
          className="inp"
          type="number"
          min="1"
          max="12"
          style={{ width: 70 }}
          value={rounds}
          onChange={(e) => setRounds(e.target.value)}
        />
        <span>
          rounds from scratch?
          {board.rounds.length > 0 && " This replaces every round and move made so far."}
        </span>
        <button className="btn sm" onClick={() => setPlanning(false)}>
          Cancel
        </button>
        <button
          className="btn sm primary"
          disabled={busy || !(rounds >= 1)}
          onClick={async () => {
            if (await act({ action: "generate", rounds: Number(rounds) })) setPlanning(false);
          }}
        >
          {busy ? "Planning…" : "Plan"}
        </button>
      </div>
    );
  }

  return (
    <div className="round-actions">
      <button className="btn sm" disabled={busy} onClick={() => setPlanning(true)}>
        {board.rounds.length ? "Re-plan all rounds" : "Plan rounds"}
      </button>
      {board.rounds.length > 0 && (
        <button className="btn sm" disabled={busy} onClick={() => act({ action: "addRound" })}>
          + Round
        </button>
      )}
      {round && (
        <button
          className="btn sm"
          disabled={busy}
          title="New random groups for this round, mixed against the others"
          onClick={() => act({ action: "reshuffleRound", roundId: round.id })}
        >
          Reshuffle round {round.number}
        </button>
      )}
      {round && unplaced > 0 && (
        <button
          className="btn sm primary"
          disabled={busy}
          onClick={() => act({ action: "placeUnplaced", roundId: round.id })}
        >
          Place {unplaced} unplaced
        </button>
      )}
      {round &&
        (confirmDelete ? (
          <button
            className="btn sm danger"
            disabled={busy}
            onClick={() => act({ action: "deleteRound", roundId: round.id })}
          >
            Delete round {round.number}?
          </button>
        ) : (
          <button className="btn sm" disabled={busy} onClick={() => setConfirmDelete(true)}>
            Delete round
          </button>
        ))}
    </div>
  );
}

// --- the board ---------------------------------------------------------------

function Board({ board, round, isAdmin, act }) {
  const [dragging, setDragging] = useState(null);
  const [over, setOver] = useState(null);
  const [menuFor, setMenuFor] = useState(null);

  const inGroup = (groupId) => board.members.filter((m) => round.placement[m.id] === groupId);
  const unplaced = board.members.filter((m) => !round.placement[m.id]);

  function move(applicantId, groupId) {
    setMenuFor(null);
    if ((round.placement[applicantId] || null) === groupId) return;
    act({ action: "move", roundId: round.id, applicantId, groupId });
  }

  const columns = [
    ...board.groups.map((g) => ({ key: g.id, group: g, people: inGroup(g.id) })),
    ...(unplaced.length ? [{ key: "none", group: null, people: unplaced }] : []),
  ];

  return (
    <div className="board">
      {columns.map((col) => (
        <div
          key={col.key}
          className={`board-col${over === col.key ? " over" : ""}${col.group ? "" : " unplaced"}`}
          style={col.group ? { "--gc": col.group.hex } : undefined}
          onDragOver={
            isAdmin
              ? (e) => {
                  e.preventDefault();
                  setOver(col.key);
                }
              : undefined
          }
          onDragLeave={() => setOver(null)}
          onDrop={
            isAdmin
              ? (e) => {
                  e.preventDefault();
                  setOver(null);
                  if (dragging) move(dragging, col.group?.id || null);
                  setDragging(null);
                }
              : undefined
          }
        >
          <div className="board-head">
            {col.group ? <GroupBadge group={col.group} /> : <strong>Unplaced</strong>}
            <span className="pill-count">{col.people.length}</span>
          </div>
          {col.group && (
            <div className="muted small board-graders">
              {col.group.graders.length ? col.group.graders.map((g) => g.name).join(", ") : "No grader"}
            </div>
          )}
          <div className="board-people">
            {col.people.map((m) => (
              <div
                key={m.id}
                className={`board-person${dragging === m.id ? " dragging" : ""}`}
                draggable={isAdmin}
                onDragStart={() => setDragging(m.id)}
                onDragEnd={() => setDragging(null)}
              >
                <Mugshot applicant={m} size={30} />
                <span className="board-name">
                  {m.fullName}
                  {m.checkedIn && <span className="arrived" title="Checked in">●</span>}
                </span>
                {isAdmin && (
                  <>
                    <button
                      type="button"
                      className="move-btn"
                      aria-label={`Move ${m.fullName}`}
                      onClick={() => setMenuFor(menuFor === m.id ? null : m.id)}
                    >
                      ⇄
                    </button>
                    {menuFor === m.id && (
                      <select
                        className="inp move-select"
                        autoFocus
                        value={round.placement[m.id] || ""}
                        onChange={(e) => move(m.id, e.target.value || null)}
                        onBlur={() => setMenuFor(null)}
                      >
                        <option value="">Unplaced</option>
                        {board.groups.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </>
                )}
              </div>
            ))}
            {col.people.length === 0 && <div className="muted small">Nobody</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
