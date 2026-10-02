"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MAX_RESUME_LABEL } from "@/lib/upload";
import { uploadResume } from "@/lib/resume-client";

/**
 * Everyone still without a resume, so the ones the zip could not match (or
 * that were too big to go through with it) can be added by hand: drop the
 * file on their row, or click it to choose one.
 */
export default function MissingResumes({ applicants, pending }) {
  const missing = applicants
    .filter((a) => !a.hasResume)
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
  const inZip = new Map(pending.map((f) => [f.applicantId, f.name]));

  if (applicants.length === 0) return null;
  if (missing.length === 0) {
    return <div className="save-note" style={{ marginBottom: 12 }}>Every applicant has a resume.</div>;
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <h4 style={{ margin: "0 0 4px" }}>Without a resume ({missing.length})</h4>
      <p className="sub" style={{ margin: "0 0 8px" }}>
        Drag a file onto someone&rsquo;s row to attach it, or click the row to choose
        one. PDF, Word or image, up to {MAX_RESUME_LABEL}.
      </p>
      <div className="missing-resumes">
        {missing.map((a) => (
          <MissingRow key={a.id} applicant={a} inZip={inZip.get(a.id)} />
        ))}
      </div>
    </div>
  );
}

function MissingRow({ applicant, inZip }) {
  const router = useRouter();
  const inputRef = useRef(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function attach(file) {
    if (!file) return;
    setErr("");
    setBusy(true);
    const r = await uploadResume(applicant.id, file, setMsg);
    setBusy(false);
    setMsg("");
    if (r.ok) router.refresh();
    else setErr(r.error);
  }

  return (
    <div
      className={`dropzone missing-row${over ? " over" : ""}${busy ? " busy" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        attach(e.dataTransfer.files?.[0]);
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
        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
        hidden
        onChange={(e) => {
          attach(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <span className="drop-big">{applicant.fullName}</span>
      <span className="drop-small">
        {busy
          ? msg || "Uploading…"
          : inZip
            ? `Matched in the zip: ${inZip}`
            : `${applicant.uclaEmail} · drop resume here`}
      </span>
      {err && <span className="err small" style={{ margin: 0 }}>{err}</span>}
    </div>
  );
}
