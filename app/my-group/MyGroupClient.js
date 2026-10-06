"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RATINGS } from "@/lib/ratings";
import GroupBadge from "../GroupBadge";
import { Mugshot } from "../Mugshot";
import NoteList from "../NoteList";
import PhotoButton from "../PhotoButton";

/** First names, with a last initial wherever two people share one. */
function shortNames(people) {
  const first = (p) => p.fullName.split(" ")[0];
  const count = {};
  for (const p of people) count[first(p)] = (count[first(p)] || 0) + 1;
  return Object.fromEntries(
    people.map((p) => {
      const parts = p.fullName.split(" ");
      const name = count[first(p)] > 1 && parts.length > 1 ? `${parts[0]} ${parts.at(-1)[0]}.` : parts[0];
      return [p.id, name];
    })
  );
}

/** POST/PATCH/DELETE some JSON; resolves to `{ data }` if it saved, `{ error }` if not. */
async function send(method, url, body) {
  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return res.ok ? { data } : { error: data.error || "Could not save." };
  } catch {
    return { error: "Could not save — check your connection." };
  }
}

/**
 * What a grader looks at during a round: which symbol they are at, the faces
 * in front of them, and a place to jot something about each person and give
 * their thumbs — the same ratings Interview candidates ranks by.
 */
export default function MyGroupClient({
  empty,
  cohorts,
  cohortId,
  rounds,
  roundId,
  groups,
  groupId,
  myGroupIds,
  people,
}) {
  const router = useRouter();

  // Cards show their own changes at once, so nothing waits on the server. This
  // quietly re-reads the page a moment after the last save, so that coming
  // back to it later doesn't show a copy from before the change.
  const settleTimer = useRef(null);
  useEffect(() => () => clearTimeout(settleTimer.current), []);
  const settle = () => {
    clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => router.refresh(), 1500);
  };

  if (empty) {
    return (
      <div className="page">
        <h1>My group</h1>
        <div className="card">No sessions yet. An admin reads them from the sign-up sheet.</div>
      </div>
    );
  }

  const href = (over) => {
    const p = new URLSearchParams({ cohort: cohortId, round: roundId || "", group: groupId || "", ...over });
    return `/my-group?${p}`;
  };

  const group = groups.find((g) => g.id === groupId) || null;
  const round = rounds.find((r) => r.id === roundId) || null;
  const mine = myGroupIds.includes(groupId);
  const names = shortNames(people || []);

  return (
    <div className="page mygroup">
      {cohorts.length > 1 && (
        <div className="seg cohort-seg">
          {cohorts.map((c) => (
            <Link key={c.id} href={`/my-group?cohort=${c.id}`} className={c.id === cohortId ? "on" : ""}>
              {c.name}
            </Link>
          ))}
        </div>
      )}

      {rounds.length === 0 ? (
        <div className="card">Rounds haven&apos;t been planned for this session yet.</div>
      ) : (
        <div className="seg round-seg">
          {rounds.map((r) => (
            <Link key={r.id} href={href({ round: r.id })} className={r.id === roundId ? "on" : ""}>
              Round {r.number}
            </Link>
          ))}
        </div>
      )}

      <div className="mygroup-head" style={group ? { "--gc": group.hex } : undefined}>
        {group ? (
          <>
            <GroupBadge group={group} size={40} big />
            <div className="muted small">
              {mine ? "You're at this symbol" : "Viewing another group"}
              {group.graders.length > 0 && ` · ${group.graders.map((g) => g.name).join(", ")}`}
            </div>
          </>
        ) : (
          <div>
            <strong>You aren&apos;t assigned to a group in this session.</strong>
            <div className="muted small">Pick one below to take notes for it.</div>
          </div>
        )}
        {groups.length > 0 && (
          <select
            className="inp group-switch"
            value={groupId || ""}
            aria-label="Switch group"
            onChange={(e) => {
              router.push(href({ group: e.target.value }));
            }}
          >
            {!groupId && <option value="">Choose a group…</option>}
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
                {myGroupIds.includes(g.id) ? " (yours)" : ""}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Faces first: who to look for in the room, before any typing. */}
      {people.length > 0 && (
        <div className="face-grid">
          {people.map((p) => (
            <a key={p.id} href={`#p-${p.id}`} className="face">
              <Mugshot applicant={p} size={88} zoom={false} />
              <span>{names[p.id]}</span>
            </a>
          ))}
        </div>
      )}

      {round && group && people.length === 0 && (
        <div className="empty">Nobody is in this group in round {round.number}.</div>
      )}

      <div className="stack">
        {people.map((p) => (
          <PersonCard key={`${roundId}:${p.id}`} person={p} round={round} group={group} onSaved={settle} />
        ))}
      </div>

      {round && group && people.length > 0 && (
        <p className="muted small center-text" style={{ marginTop: 20 }}>
          Notes are signed with your name and stamped Round {round.number} · {group.name}. Your
          thumbs follow the person, so you can change them in any round.
        </p>
      )}
    </div>
  );
}

function PersonCard({ person, round, group, onSaved }) {
  const [draft, setDraft] = useState("");
  const [err, setErr] = useState("");
  // What the card shows is kept here and changed the moment you act; the save
  // follows behind and only speaks up if it fails.
  const [notes, setNotes] = useState(person.notes);
  const [value, setValue] = useState(person.myRating);
  const savedValue = useRef(person.myRating);
  const latestValue = useRef(person.myRating);
  const tempId = useRef(0);
  // One save at a time per card, in the order they were made, so a quick
  // second tap can never be overtaken by the first.
  const queue = useRef(Promise.resolve());
  const enqueue = (job) => (queue.current = queue.current.then(job));

  function rate(next) {
    setValue(next);
    latestValue.current = next;
    setErr("");
    enqueue(async () => {
      const { error } = await send("POST", "/api/ratings", { applicantId: person.id, value: next });
      if (!error) {
        savedValue.current = next;
        return onSaved();
      }
      // Fall back to the last thumbs that did save, unless a newer tap is on its way.
      if (latestValue.current === next) {
        latestValue.current = savedValue.current;
        setValue(savedValue.current);
      }
      setErr(error);
    });
  }

  function add() {
    const body = draft.trim();
    if (!body) return;
    const key = `new-${++tempId.current}`;
    setNotes((list) => [
      ...list,
      {
        key,
        id: key,
        body,
        at: new Date().toISOString(),
        round: round?.number ?? null,
        group: group ? { color: group.color, shape: group.shape } : null,
        pending: true,
      },
    ]);
    setDraft("");
    setErr("");
    enqueue(async () => {
      const { data, error } = await send("POST", "/api/notes", {
        applicantId: person.id,
        body,
        roundId: round?.id,
      });
      if (!error) {
        setNotes((list) => list.map((n) => (n.key === key ? { ...n, id: data.id, pending: false } : n)));
        return onSaved();
      }
      // Hand the words back rather than lose them.
      setNotes((list) => list.filter((n) => n.key !== key));
      setDraft((d) => (d.trim() ? `${body}\n${d}` : body));
      setErr(error);
    });
  }

  function editNote(id, body) {
    const before = notes.find((n) => n.id === id)?.body;
    setNotes((list) => list.map((n) => (n.id === id ? { ...n, body } : n)));
    setErr("");
    enqueue(async () => {
      const { error } = await send("PATCH", "/api/notes", { noteId: id, body });
      if (!error) return onSaved();
      setNotes((list) => list.map((n) => (n.id === id && n.body === body ? { ...n, body: before } : n)));
      setErr(error);
    });
  }

  function deleteNote(id) {
    const at = notes.findIndex((n) => n.id === id);
    const gone = notes[at];
    setNotes((list) => list.filter((n) => n.id !== id));
    setErr("");
    enqueue(async () => {
      const { error } = await send("DELETE", "/api/notes", { noteId: id });
      if (!error) return onSaved();
      setNotes((list) => [...list.slice(0, at), gone, ...list.slice(at)]);
      setErr(error);
    });
  }

  return (
    <section className="card person-card" id={`p-${person.id}`}>
      <div className="person-top">
        <Mugshot applicant={person} size={96} />
        <div>
          <strong className="person-card-name">{person.fullName}</strong>
          <div className="muted small">
            {[person.gradYear, person.majors].filter(Boolean).join(" · ")}
          </div>
          {!person.checkedIn && <div className="warn-text small">Not checked in</div>}
          {!person.hasPhoto && (
            <div style={{ marginTop: 6 }}>
              <PhotoButton applicant={person} />
            </div>
          )}
        </div>
      </div>

      <NoteList notes={notes} mineOnly onEdit={editNote} onDelete={deleteNote} />

      <div className="note-compose">
        <textarea
          className="inp"
          rows={2}
          placeholder={`Note on ${person.fullName.split(" ")[0]}…`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button className="btn primary" disabled={!draft.trim()} onClick={add}>
          Add note
        </button>
      </div>

      <div className="rate-row">
        {RATINGS.map((r) => (
          <button
            key={r.value}
            type="button"
            className={`rate-btn${value === r.value ? " on" : ""}`}
            aria-pressed={value === r.value}
            onClick={() => rate(value === r.value ? null : r.value)}
          >
            <span className="rate-icon">{r.icon}</span>
            <span className="rate-text">{r.label}</span>
          </button>
        ))}
      </div>
      {err && <div className="err">{err}</div>}
    </section>
  );
}
