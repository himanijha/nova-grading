"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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

/**
 * What a grader looks at during a round: which symbol they are at, the faces
 * in front of them, and a place to jot something about each person. Ratings
 * come later, on Rate, once every round is done.
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

  if (empty) {
    return (
      <div className="page">
        <h1>My group</h1>
        <div className="card">No cohorts have been set up yet.</div>
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
        <div className="card">Rounds haven&apos;t been planned for this cohort yet.</div>
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
            <strong>You aren&apos;t assigned to a group in this cohort.</strong>
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
          <PersonCard key={p.id} person={p} roundId={roundId} />
        ))}
      </div>

      {round && group && people.length > 0 && (
        <p className="muted small center-text" style={{ marginTop: 20 }}>
          Notes are signed with your name and stamped Round {round.number} · {group.name}. Give your
          thumbs on <Link href="/rate">Rate</Link> once every round is done.
        </p>
      )}
    </div>
  );
}

function PersonCard({ person, roundId }) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function add() {
    if (!draft.trim()) return;
    setBusy(true);
    setErr("");
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicantId: person.id, body: draft, roundId }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setErr(data.error || "Could not save.");
    setDraft("");
    router.refresh();
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

      <NoteList notes={person.notes} mineOnly />

      <div className="note-compose">
        <textarea
          className="inp"
          rows={2}
          placeholder={`Note on ${person.fullName.split(" ")[0]}…`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button className="btn primary" disabled={busy || !draft.trim()} onClick={add}>
          {busy ? "Saving…" : "Add note"}
        </button>
      </div>
      {err && <div className="err">{err}</div>}
    </section>
  );
}
