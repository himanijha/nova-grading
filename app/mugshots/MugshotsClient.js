"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { uploadPhoto } from "@/lib/photo-client";
import GroupBadge from "../GroupBadge";
import { Mugshot } from "../Mugshot";

const matches = (p, q) => {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  return [p.fullName, p.uclaEmail, p.contactEmail].some((v) => v && v.toLowerCase().includes(s));
};

/**
 * The door. Built for one hand on a phone: search, tap the name, take the
 * photo, read them their groups, next.
 */
export default function MugshotsClient({ cohorts, cohortId, people }) {
  const router = useRouter();
  const searchRef = useRef(null);
  const [q, setQ] = useState("");
  const [show, setShow] = useState("waiting");
  const [openId, setOpenId] = useState(null);

  if (cohorts.length === 0) {
    return (
      <div className="page">
        <h1>Mugshots</h1>
        <div className="card">No cohorts have been set up yet.</div>
      </div>
    );
  }

  const arrived = people.filter((p) => p.checkedIn).length;
  const photos = people.filter((p) => p.hasPhoto).length;
  const open = people.find((p) => p.id === openId) || null;

  const shown = people.filter(
    (p) =>
      matches(p, q) &&
      // A search looks through everyone — the person in front of you may
      // already be marked arrived by someone else.
      (q.trim() || show === "all" || (show === "waiting" ? !p.checkedIn : p.checkedIn))
  );

  function next() {
    setOpenId(null);
    setQ("");
    // Straight back to typing the next name.
    setTimeout(() => searchRef.current?.focus(), 0);
  }

  if (open) {
    return <Person person={open} onBack={next} onChange={() => router.refresh()} />;
  }

  return (
    <div className="page checkin">
      <h1>Mugshots</h1>
      <p className="sub">
        Photograph everyone as they arrive, so every grader has a face to put to the notes.
      </p>
      <div className="seg cohort-seg">
        {cohorts.map((c) => (
          <Link key={c.id} href={`/mugshots?cohort=${c.id}`} className={c.id === cohortId ? "on" : ""}>
            {c.name}
          </Link>
        ))}
      </div>

      <div className="checkin-stats">
        <div>
          <strong>{arrived}</strong>
          <span>/ {people.length} arrived</span>
        </div>
        <div>
          <strong>{photos}</strong>
          <span>/ {people.length} photos</span>
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
        {!q.trim() && (
          <div className="seg">
            <button className={show === "waiting" ? "on" : ""} onClick={() => setShow("waiting")}>
              Not here yet {people.length - arrived}
            </button>
            <button className={show === "arrived" ? "on" : ""} onClick={() => setShow("arrived")}>
              Arrived {arrived}
            </button>
            <button className={show === "all" ? "on" : ""} onClick={() => setShow("all")}>
              All
            </button>
          </div>
        )}
      </div>

      <div className="checkin-list">
        {people.length === 0 && <div className="empty">Nobody is in this cohort yet.</div>}
        {people.length > 0 && shown.length === 0 && (
          <div className="empty">{q.trim() ? "No one in this cohort matches that." : "Nobody here."}</div>
        )}
        {shown.map((p) => (
          <button key={p.id} type="button" className="checkin-row" onClick={() => setOpenId(p.id)}>
            <Mugshot applicant={p} size={48} zoom={false} />
            <span className="checkin-name">
              <strong>{p.fullName}</strong>
              <span className="muted small">{p.uclaEmail}</span>
            </span>
            <span className="checkin-marks">
              {!p.hasPhoto && <span className="mark need">No photo</span>}
              {p.checkedIn && <span className="mark ok">✓ Here</span>}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Person({ person, onBack, onChange }) {
  const cameraRef = useRef(null);
  const libraryRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function setArrived(arrived) {
    await fetch("/api/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicantId: person.id, arrived }),
    });
    onChange();
  }

  async function take(file) {
    if (!file) return;
    setBusy(true);
    const r = await uploadPhoto(person.id, file, setMsg);
    if (r.ok) {
      setMsg("Photo saved.");
      // Being photographed at the door is arriving.
      if (!person.checkedIn) await setArrived(true);
      else onChange();
    } else {
      setMsg(r.error);
    }
    setBusy(false);
  }

  return (
    <div className="page checkin person">
      <button type="button" className="back" onClick={onBack}>
        ‹ Back to list
      </button>

      <div className="person-photo">
        {person.hasPhoto ? (
          <Mugshot applicant={person} size={220} />
        ) : (
          <button type="button" className="photo-empty" onClick={() => cameraRef.current?.click()}>
            <span className="photo-empty-icon">📷</span>
            <span>Tap to take their photo</span>
          </button>
        )}
      </div>

      <h1 className="person-name">{person.fullName}</h1>
      <div className="muted center-text">
        {[person.gradYear, person.majors].filter(Boolean).join(" · ") || person.uclaEmail}
      </div>

      {/* capture="environment" opens the back camera: you are photographing
          the person in front of you, not yourself. */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => take(e.target.files?.[0])}
      />
      <input ref={libraryRef} type="file" accept="image/*" hidden onChange={(e) => take(e.target.files?.[0])} />

      <div className="stack person-actions">
        <button className="btn primary big" disabled={busy} onClick={() => cameraRef.current?.click()}>
          {busy ? msg || "Saving…" : person.hasPhoto ? "Retake photo" : "Take photo"}
        </button>
        <button className="btn" disabled={busy} onClick={() => libraryRef.current?.click()}>
          Choose from library
        </button>
        {person.checkedIn ? (
          <button className="btn" disabled={busy} onClick={() => setArrived(false)}>
            ✓ Arrived — undo
          </button>
        ) : (
          <button className="btn" disabled={busy} onClick={() => setArrived(true)}>
            Mark arrived without a photo
          </button>
        )}
      </div>
      {!busy && msg && <div className="save-note center-text">{msg}</div>}

      <section className="card schedule">
        <h3>Their groups</h3>
        {person.schedule.length === 0 ? (
          <div className="muted">Rounds haven&apos;t been planned for this cohort yet.</div>
        ) : (
          person.schedule.map((s) => (
            <div className="schedule-row" key={s.round}>
              <span className="muted">Round {s.round}</span>
              <GroupBadge group={s.group} size={22} />
            </div>
          ))
        )}
      </section>

      <button className="btn primary big wide" onClick={onBack}>
        Next person
      </button>
    </div>
  );
}
