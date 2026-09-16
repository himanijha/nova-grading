"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RATINGS, ratingMeta } from "@/lib/ratings";
import { Mugshot } from "../Mugshot";

import { MAX_UPLOAD_BYTES, MAX_UPLOAD_LABEL } from "@/lib/upload";

const MAX_RESULTS = 40;

const matches = (a, q) => {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  return [a.fullName, a.uclaEmail, a.majors, a.gradYear]
    .filter(Boolean)
    .some((v) => String(v).toLowerCase().includes(s));
};

/** Search box + result list. Used twice on this page, independently. */
function Picker({ id, label, applicants, selectedId, onSelect, query, onQuery }) {
  const results = useMemo(
    () => applicants.filter((a) => matches(a, query)).slice(0, MAX_RESULTS),
    [applicants, query]
  );

  return (
    <div className="mug-picker">
      <label className="mug-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="inp"
        placeholder="Search by name, email, major, or year"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
      />
      <div className="mug-results">
        {results.length === 0 && <div className="empty">No applicant matches that.</div>}
        {results.map((a) => (
          <button
            key={a.id}
            type="button"
            className={`mug-result${a.id === selectedId ? " on" : ""}`}
            onClick={() => onSelect(a.id)}
          >
            <Mugshot applicant={a} zoom={false} />
            <span className="mug-result-text">
              <strong>{a.fullName}</strong>
              <span className="mug-sub">
                {[a.gradYear, a.majors].filter(Boolean).join(" · ") || a.uclaEmail}
              </span>
            </span>
            {a.myRating && (
              <span className="mug-chip" title={ratingMeta(a.myRating.value)?.label}>
                {ratingMeta(a.myRating.value)?.icon}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Shrink big camera images in the browser. A 4MB phone photo becomes a few
 * hundred KB, which keeps the database (and its backups) reasonable. Anything
 * the browser cannot decode — HEIC, most likely — is sent through untouched.
 */
async function shrink(file, max = 900) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 900 * 1024) return file;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d").drawImage(bmp, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", {
      type: "image/jpeg",
    });
  } catch {
    return file;
  }
}

export default function MugshotsClient({ grader, applicants }) {
  const router = useRouter();

  // The two halves of the page are deliberately independent: you photograph
  // people in one order and form opinions in another.
  const [photoQuery, setPhotoQuery] = useState("");
  const [photoId, setPhotoId] = useState(null);
  const [rateQuery, setRateQuery] = useState("");
  const [rateId, setRateId] = useState(null);

  const byId = (id) => applicants.find((a) => a.id === id) || null;
  const photoTarget = byId(photoId);
  const rateTarget = byId(rateId);

  const withPhoto = applicants.filter((a) => a.hasPhoto).length;

  return (
    <div className="page wide">
      <h1>Mugshots</h1>
      <p className="sub">
        Put a face to an application, and say whether you want to interview
        them. {withPhoto} of {applicants.length} have a photo.
      </p>

      <div className="mug-grid">
        <section className="card">
          <h3>Add a photo</h3>
          <Picker
            id="photo-search"
            label="1. Find the applicant"
            applicants={applicants}
            selectedId={photoId}
            onSelect={setPhotoId}
            query={photoQuery}
            onQuery={setPhotoQuery}
          />
          <PhotoDrop applicant={photoTarget} onDone={() => router.refresh()} />
        </section>

        <section className="card">
          <h3>Rate an applicant</h3>
          <Picker
            id="rate-search"
            label="1. Find the applicant"
            applicants={applicants}
            selectedId={rateId}
            onSelect={setRateId}
            query={rateQuery}
            onQuery={setRateQuery}
          />
          <RatePanel
            key={rateId || "none"}
            grader={grader}
            applicant={rateTarget}
            onDone={() => router.refresh()}
          />
        </section>
      </div>
    </div>
  );
}

/** Drag-and-drop (or click-to-browse) upload for the selected applicant. */
function PhotoDrop({ applicant, onDone }) {
  const inputRef = useRef(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function upload(file) {
    if (!applicant) return setMsg("Pick an applicant first.");
    if (!file) return;
    if (!file.type.startsWith("image/")) return setMsg("That is not an image.");

    setBusy(true);
    setMsg("Preparing…");
    const prepared = await shrink(file);

    // Checked here as well as on the server: an oversized body never reaches
    // the route in production, so this is the only place the person sees why.
    if (prepared.size > MAX_UPLOAD_BYTES) {
      setBusy(false);
      const mb = (prepared.size / 1024 / 1024).toFixed(1);
      return setMsg(
        /heic|heif/i.test(prepared.type)
          ? `This iPhone photo is ${mb}MB and the browser cannot shrink HEIC. Save it as JPEG and try again (limit ${MAX_UPLOAD_LABEL}).`
          : `Image is ${mb}MB; the limit is ${MAX_UPLOAD_LABEL}.`
      );
    }

    setMsg("Uploading…");
    const body = new FormData();
    body.append("applicantId", applicant.id);
    body.append("file", prepared);

    const res = await fetch("/api/photo", { method: "POST", body });
    const data = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok) return setMsg(data.error || "Upload failed.");
    setMsg(`Saved — ${(data.byteSize / 1024).toFixed(0)}KB`);
    onDone();
  }

  async function remove() {
    if (!applicant) return;
    setBusy(true);
    await fetch("/api/photo", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicantId: applicant.id }),
    });
    setBusy(false);
    setMsg("Photo removed.");
    onDone();
  }

  return (
    <div className="mug-step">
      <div className="mug-label">2. Drop the photo</div>

      {!applicant && <div className="empty">No applicant selected yet.</div>}

      {applicant && (
        <>
          <div className="mug-target">
            <Mugshot applicant={applicant} size={110} />
            <div>
              <strong>{applicant.fullName}</strong>
              <div className="mug-sub">
                {applicant.hasPhoto ? "Has a photo — uploading replaces it" : "No photo yet"}
              </div>
            </div>
          </div>

          <div
            className={`dropzone${over ? " over" : ""}${busy ? " busy" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setOver(false);
              upload(e.dataTransfer.files?.[0]);
            }}
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => upload(e.target.files?.[0])}
            />
            <span className="drop-big">Drag a photo here</span>
            <span className="drop-small">or click to choose a file · max {MAX_UPLOAD_LABEL}</span>
          </div>

          <div className="btn-row">
            {applicant.hasPhoto && (
              <button className="btn" disabled={busy} onClick={remove}>
                Remove photo
              </button>
            )}
          </div>
          <div className="save-note">{msg}</div>
        </>
      )}
    </div>
  );
}

/** The thumbs, plus the note that explains them. */
function RatePanel({ grader, applicant, onDone }) {
  const [value, setValue] = useState(applicant?.myRating?.value || null);
  const [note, setNote] = useState(applicant?.myRating?.note || "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  if (!applicant) {
    return (
      <div className="mug-step">
        <div className="mug-label">2. Give a verdict</div>
        <div className="empty">No applicant selected yet.</div>
      </div>
    );
  }

  async function save(nextValue = value) {
    setBusy(true);
    const res = await fetch("/api/ratings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicantId: applicant.id, value: nextValue, note }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setMsg(data.error || "Could not save.");
    setMsg(nextValue === null ? "Rating cleared." : "Saved.");
    onDone();
  }

  const others = applicant.ratings.filter((r) => r.graderName !== grader.name);

  return (
    <div className="mug-step">
      <div className="mug-label">2. Give a verdict</div>

      <div className="mug-target">
        <Mugshot applicant={applicant} size={110} />
        <div>
          <strong>{applicant.fullName}</strong>
          <div className="mug-sub">
            {[applicant.gradYear, applicant.majors].filter(Boolean).join(" · ")}
          </div>
        </div>
      </div>

      <div className="rate-row">
        {RATINGS.map((r) => (
          <button
            key={r.value}
            type="button"
            className={`rate-btn${value === r.value ? " on" : ""}`}
            aria-pressed={value === r.value}
            title={r.label}
            disabled={busy}
            onClick={() => {
              const next = value === r.value ? null : r.value;
              setValue(next);
              save(next);
            }}
          >
            <span className="rate-icon">{r.icon}</span>
            <span className="rate-text">{r.label}</span>
          </button>
        ))}
      </div>

      <textarea
        className="inp"
        placeholder="Why? (optional, but the rest of the team will thank you)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="btn-row">
        <button className="btn primary" disabled={busy || !value} onClick={() => save()}>
          Save note
        </button>
      </div>
      <div className="save-note">{msg}</div>

      {others.length > 0 && (
        <div className="graded-by">
          <h4>Also rated by ({others.length})</h4>
          {others.map((r, i) => (
            <div className="grader-row" key={i}>
              <span>
                {ratingMeta(r.value)?.icon} {r.graderName}
              </span>
              <span className="mug-sub">{r.note || "no note"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
