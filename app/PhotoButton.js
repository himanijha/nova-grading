"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadPhoto } from "@/lib/photo-client";

/**
 * Take someone's photo from wherever you are looking at them. The back
 * camera, because you are photographing the person in front of you.
 */
export default function PhotoButton({ applicant, label, className = "btn sm", onSaved }) {
  const router = useRouter();
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function take(file) {
    if (!file) return;
    setBusy(true);
    const r = await uploadPhoto(applicant.id, file, setMsg);
    setBusy(false);
    setMsg(r.ok ? "" : r.error);
    if (r.ok) {
      onSaved?.();
      router.refresh();
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          take(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        className={className}
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? msg || "Saving…" : label || (applicant.hasPhoto ? "Retake photo" : "📷 Take photo")}
      </button>
      {!busy && msg && <span className="err small">{msg}</span>}
    </>
  );
}
