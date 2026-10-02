// Browser side of saving a resume, shared by the zip import and the by-hand drop.
import { MAX_UPLOAD_BYTES, MAX_RESUME_BYTES, MAX_RESUME_LABEL } from "./upload";
import { RESUME_TYPES } from "./resumes";

/** The MIME type we store a file as, from its type or else its extension. */
export const resumeType = (file) =>
  Object.values(RESUME_TYPES).includes(file.type)
    ? file.type
    : RESUME_TYPES[file.name.split(".").pop().toLowerCase()] || "";

/** Why a file cannot be a resume, or null when it can. */
export function resumeProblem(name, size) {
  if (!RESUME_TYPES[name.split(".").pop().toLowerCase()]) return "not a PDF, Word doc or image";
  if (size > MAX_RESUME_BYTES)
    return `${(size / 1024 / 1024).toFixed(1)}MB, over the ${MAX_RESUME_LABEL} limit`;
  return null;
}

/**
 * Uploads one resume, in pieces when it is over the per-request limit.
 * Resolves to { ok: true } or { ok: false, error }. `onStage` hears progress.
 */
export async function uploadResume(applicantId, file, onStage = () => {}) {
  const type = resumeType(file);
  const problem = resumeProblem(file.name, file.size);
  if (problem) return { ok: false, error: `${file.name} is ${problem}.` };

  const parts = Math.max(1, Math.ceil(file.size / MAX_UPLOAD_BYTES));
  const uploadId = parts > 1 ? crypto.randomUUID() : "";
  for (let i = 0; i < parts; i++) {
    onStage(parts > 1 ? `Uploading ${i + 1} of ${parts}…` : "Uploading…");
    const body = new FormData();
    body.append("applicantId", applicantId);
    const piece = file.slice(i * MAX_UPLOAD_BYTES, (i + 1) * MAX_UPLOAD_BYTES);
    body.append("file", new File([piece], file.name, { type }));
    if (parts > 1) {
      body.append("uploadId", uploadId);
      body.append("part", String(i));
      body.append("parts", String(parts));
    }
    const res = await fetch("/api/resume", { method: "POST", body }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (!res?.ok) return { ok: false, error: data?.error || "Upload failed." };
  }
  return { ok: true };
}
