"use client";

import { useEffect, useState } from "react";

/**
 * An applicant's mugshot. The thumbnail is a cropped circle, so it can hide
 * half a face — clicking one opens the photo as it was uploaded, uncropped.
 *
 * `zoom={false}` for the thumbnails that already sit inside a <button>: a
 * button inside a button is invalid HTML and the click never reaches the row.
 */
export function Mugshot({ applicant, size = 38, zoom = true }) {
  const [open, setOpen] = useState(false);

  const initials = applicant.fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  if (!applicant.hasPhoto) {
    return (
      <span className="mug-avatar blank" style={{ width: size, height: size }}>
        {initials}
      </span>
    );
  }

  const src = `/api/photo/${applicant.id}?v=${applicant.photoVersion}`;
  const img = (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      className="mug-avatar"
      style={{ width: size, height: size }}
      src={src}
      alt={applicant.fullName}
    />
  );

  if (!zoom) return img;

  return (
    <>
      <button
        type="button"
        className="mug-zoom"
        style={{ width: size, height: size }}
        title="See the full photo"
        aria-label={`See the full photo of ${applicant.fullName}`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        {img}
      </button>
      {open && (
        <Lightbox src={src} name={applicant.fullName} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

function Lightbox({ src, name, onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={`Photo of ${name}`}
      onClick={onClose}
    >
      <div className="lightbox-inner" onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={name} />
        <div className="lightbox-bar">
          <strong>{name}</strong>
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default Mugshot;
