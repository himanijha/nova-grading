"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import GroupBadge from "../GroupBadge";
import { Mugshot } from "../Mugshot";

// Short enough to fit a column of the board.
const ROLE_SHORT = {
  DEVELOPER: "Dev",
  DESIGNER: "Design",
  BOTH: "Dev + Design",
  OTHER: "Other",
  UNKNOWN: "No role",
};
const ROLE_ORDER = ["DEVELOPER", "DESIGNER", "BOTH", "OTHER", "UNKNOWN"];

// How long the group count sits still before it is saved.
const COUNT_SAVE_DELAY = 1500;

async function groupsApi(body, { keepalive = false } = {}) {
  const res = await fetch("/api/groups", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    keepalive,
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

  // The group count is stepped locally and saved once it stops changing, so
  // pressing + or − a few times costs one request, not one per press.
  // `draftCount` is what the stepper shows while that is pending.
  const [draftCount, setDraftCount] = useState(null);
  const [savingCount, setSavingCount] = useState(false);
  const wantCount = useRef(null);
  const countTimer = useRef(null);
  const countSave = useRef(null);
  const savedCount = board?.groups.length ?? 0;
  const savedCountRef = useRef(savedCount);
  savedCountRef.current = savedCount;

  function stepCount(next) {
    setErr("");
    wantCount.current = next;
    setDraftCount(next);
    clearTimeout(countTimer.current);
    countTimer.current = setTimeout(saveCount, COUNT_SAVE_DELAY);
  }

  // Saves the pending count now. Presses that land while a save is in flight
  // are picked up by the loop, so the last number pressed always wins.
  function saveCount() {
    clearTimeout(countTimer.current);
    countTimer.current = null;
    if (countSave.current) return countSave.current;
    if (wantCount.current == null || wantCount.current === savedCountRef.current) {
      return Promise.resolve();
    }
    countSave.current = (async () => {
      setSavingCount(true);
      let last = savedCountRef.current;
      while (wantCount.current != null && wantCount.current !== last) {
        const count = wantCount.current;
        const r = await groupsApi({ cohortId, action: "setGroupCount", count });
        if (!r.ok) {
          setErr(r.error);
          wantCount.current = null;
          setDraftCount(null);
          break;
        }
        last = count;
      }
      countSave.current = null;
      setSavingCount(false);
      router.refresh();
    })();
    return countSave.current;
  }

  // Once the page has caught up with the stepper there is nothing pending.
  useEffect(() => {
    if (draftCount != null && !savingCount && draftCount === savedCount) {
      wantCount.current = null;
      setDraftCount(null);
    }
  }, [draftCount, savingCount, savedCount]);

  // Leaving with a count still waiting to be saved: send it on the way out.
  useEffect(() => {
    const sendPending = () => {
      clearTimeout(countTimer.current);
      const count = wantCount.current;
      if (count == null || countSave.current || count === savedCountRef.current) return;
      wantCount.current = null;
      groupsApi({ cohortId, action: "setGroupCount", count }, { keepalive: true }).catch(() => {});
    };
    window.addEventListener("pagehide", sendPending);
    return () => {
      window.removeEventListener("pagehide", sendPending);
      sendPending();
    };
  }, [cohortId]);

  async function act(body) {
    setErr("");
    setBusy(true);
    // Everything else works on the groups as saved, so save the count first.
    await saveCount();
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
          No sessions yet.{" "}
          {isAdmin ? <Link href="/cohorts">Read the sign-up sheet first.</Link> : "An admin sets them up."}
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
        <Setup
          board={board}
          graders={graders}
          act={act}
          busy={busy || savingCount}
          count={draftCount ?? savedCount}
          stepCount={stepCount}
          stepping={busy}
          pending={draftCount != null}
        />
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
            <RoundActions board={board} round={round} act={act} busy={busy || savingCount} />
          )}
        </div>

        {round ? (
          <Board board={board} round={round} isAdmin={isAdmin} act={act} />
        ) : (
          <div className="empty">
            {board.groups.length === 0
              ? isAdmin
                ? "Set how many groups this session has, then plan the rounds."
                : "An admin hasn't set up groups for this session yet."
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

function Setup({ board, graders, act, busy, count, stepCount, stepping, pending }) {
  const n = board.members.length;
  const per = count ? n / count : null;

  // Graders sit at one symbol for the whole hour, so each can be at only one
  // group per cohort. Map grader → the group they're already at.
  const seatedAt = {};
  for (const g of board.groups) for (const x of g.graders) seatedAt[x.id] = g;

  return (
    <section className="card">
      <h3>Groups and graders</h3>
      {/* The stepper moves straight away and saves once it has been left
          alone for a moment; the groups below catch up when it has. */}
      <div className="setup-row">
        <span className="setup-label">Groups in the room</span>
        <div className="stepper">
          <button
            type="button"
            aria-label="One fewer group"
            disabled={stepping || count <= 1}
            onClick={() => stepCount(count - 1)}
          >
            −
          </button>
          <strong>{count}</strong>
          <button
            type="button"
            aria-label="One more group"
            disabled={stepping || count >= 40}
            onClick={() => stepCount(count + 1)}
          >
            +
          </button>
        </div>
        <span className="muted small">
          {per
            ? `${n} people → ${Math.floor(per)}${per % 1 ? `–${Math.ceil(per)}` : ""} per group`
            : `${n} people in this session`}
          {board.rounds.length > 0 &&
            " · a removed group's people move to the smallest groups; a new group starts empty until you reshuffle"}
        </span>
        {pending && <span className="muted small">Saving…</span>}
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

  const roleTally = (people) =>
    ROLE_ORDER.map((role) => [role, people.filter((m) => m.roleCategory === role).length])
      .filter(([, count]) => count > 0)
      .map(([role, count]) => `${count} ${ROLE_SHORT[role]}`)
      .join(" · ");

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
          {col.people.length > 0 && <div className="muted small board-roles">{roleTally(col.people)}</div>}
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
