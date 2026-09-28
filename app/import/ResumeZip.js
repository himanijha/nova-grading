"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { unzip } from "fflate";
import { RESUME_TYPES, matchResume } from "@/lib/resumes";
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_LABEL } from "@/lib/upload";

const unzipAsync = (bytes) =>
  new Promise((resolve, reject) => unzip(bytes, (e, out) => (e ? reject(e) : resolve(out))));

/**
 * Drop the zip Google Drive gives you for the form's file-upload folder. It is
 * unpacked here in the browser, each file is matched to an applicant by name,
 * and after a look over the matches every resume is uploaded on its own.
 */
export default function ResumeZip({ applicants }) {
  const router = useRouter();
  const inputRef = useRef(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [files, setFiles] = useState(null);

  async function onZip(file) {
    if (!file) return;
    setMsg("");
    setFiles(null);
    if (!/\.zip$/i.test(file.name)) return setMsg("That is not a .zip file.");

    setBusy(true);
    setMsg("Unzipping…");
    let entries;
    try {
      entries = await unzipAsync(new Uint8Array(await file.arrayBuffer()));
    } catch {
      setBusy(false);
      return setMsg("Could not read that zip.");
    }
    setBusy(false);

    const list = Object.entries(entries)
      .filter(([path, bytes]) => {
        const name = path.split("/").pop();
        // Folders, Mac resource forks and hidden files are not resumes.
        return bytes.length > 0 && name && !name.startsWith(".") && !path.startsWith("__MACOSX/");
      })
      .map(([path, bytes]) => {
        const name = path.split("/").pop();
        const type = RESUME_TYPES[name.split(".").pop().toLowerCase()];
        let problem = null;
        if (!type) problem = "not a PDF, Word doc or image";
        else if (bytes.length > MAX_UPLOAD_BYTES)
          problem = `${(bytes.length / 1024 / 1024).toFixed(1)}MB, over the ${MAX_UPLOAD_LABEL} limit`;
        return {
          name,
          bytes,
          type,
          problem,
          applicantId: problem ? "" : matchResume(name, applicants)?.id || "",
          status: "",
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    if (list.length === 0) return setMsg("No files found in that zip.");
    setFiles(list);
    const matched = list.filter((f) => f.applicantId).length;
    setMsg(`${list.length} files found, ${matched} matched automatically. Check the matches below.`);
  }

  const setRow = (i, patch) =>
    setFiles((fs) => fs.map((f, j) => (j === i ? { ...f, ...patch } : f)));

  async function uploadAll() {
    setBusy(true);
    let ok = 0;
    let failed = 0;
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (!f.applicantId || f.problem || f.status === "Saved") continue;
      setRow(i, { status: "Uploading…" });
      const body = new FormData();
      body.append("applicantId", f.applicantId);
      body.append("file", new File([f.bytes], f.name, { type: f.type }));
      const res = await fetch("/api/resume", { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        ok++;
        setRow(i, { status: "Saved" });
      } else {
        failed++;
        setRow(i, { status: data.error || "Upload failed." });
      }
    }
    setBusy(false);
    setMsg(`${ok} resumes saved${failed ? `, ${failed} failed` : ""}.`);
    router.refresh();
  }

  // Two files pointed at the same person would silently overwrite each other.
  const counts = {};
  for (const f of files || []) if (f.applicantId) counts[f.applicantId] = (counts[f.applicantId] || 0) + 1;
  const clashes = Object.values(counts).some((c) => c > 1);
  const ready = (files || []).filter((f) => f.applicantId && !f.problem && f.status !== "Saved").length;
  const withResume = applicants.filter((a) => a.hasResume).length;
  const sorted = [...applicants].sort((a, b) => a.fullName.localeCompare(b.fullName));

  return (
    <div className="card" style={{ marginTop: 32 }}>
      <h3>Resumes</h3>
      <p className="sub" style={{ margin: "0 0 12px" }}>
        In Google Drive, download the form&rsquo;s resume upload folder as a zip and
        drop it here. Each file is matched to an applicant by name; fix any that
        are wrong before uploading. {withResume} of {applicants.length} applicants
        have a resume so far. Re-uploading replaces a resume.
      </p>

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
          onZip(e.dataTransfer.files?.[0]);
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
          accept=".zip,application/zip"
          hidden
          onChange={(e) => {
            onZip(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <span className="drop-big">Drag the resumes zip here</span>
        <span className="drop-small">or click to choose it · each resume max {MAX_UPLOAD_LABEL}</span>
      </div>

      {msg && <div className="save-note">{msg}</div>}

      {files && (
        <>
          <table className="tbl" style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>File</th>
                <th>Applicant</th>
                <th style={{ width: 160 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {files.map((f, i) => (
                <tr key={f.name + i}>
                  <td style={{ wordBreak: "break-all" }}>{f.name}</td>
                  <td>
                    {f.problem ? (
                      <span className="err" style={{ margin: 0 }}>Skipped: {f.problem}</span>
                    ) : (
                      <select
                        className="inp"
                        value={f.applicantId}
                        disabled={busy}
                        onChange={(e) => setRow(i, { applicantId: e.target.value, status: "" })}
                        style={counts[f.applicantId] > 1 ? { borderColor: "var(--danger)" } : undefined}
                      >
                        <option value="">— don&rsquo;t upload —</option>
                        {sorted.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.fullName} ({a.uclaEmail})
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td>{f.status}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {clashes && (
            <div className="err">
              Some applicants have more than one file matched (outlined in red). Pick
              one per person.
            </div>
          )}

          <button
            className="btn primary"
            style={{ marginTop: 12 }}
            disabled={busy || clashes || ready === 0}
            onClick={uploadAll}
          >
            {busy ? "Uploading…" : `Upload ${ready} resumes`}
          </button>
        </>
      )}
    </div>
  );
}
