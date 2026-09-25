// Browser side of attaching a mugshot, shared by Mugshots and Check-in.
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_LABEL } from "./upload";

/**
 * Shrink big camera images in the browser. A 4MB phone photo becomes a few
 * hundred KB, which keeps the database (and its backups) reasonable. Anything
 * the browser cannot decode — HEIC, most likely — is sent through untouched.
 */
export async function shrink(file, max = 900) {
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

/**
 * Shrink and upload. Resolves to { ok: true, byteSize } or { ok: false, error }.
 * `onStage` hears "Preparing…" / "Uploading…" for a status line.
 */
export async function uploadPhoto(applicantId, file, onStage = () => {}) {
  if (!file) return { ok: false, error: "No photo taken." };
  if (!file.type.startsWith("image/")) return { ok: false, error: "That is not an image." };

  onStage("Preparing…");
  const prepared = await shrink(file);

  // Checked here as well as on the server: an oversized body never reaches
  // the route in production, so this is the only place the person sees why.
  if (prepared.size > MAX_UPLOAD_BYTES) {
    const mb = (prepared.size / 1024 / 1024).toFixed(1);
    return {
      ok: false,
      error: /heic|heif/i.test(prepared.type)
        ? `This iPhone photo is ${mb}MB and the browser cannot shrink HEIC. Save it as JPEG and try again (limit ${MAX_UPLOAD_LABEL}).`
        : `Image is ${mb}MB; the limit is ${MAX_UPLOAD_LABEL}.`,
    };
  }

  onStage("Uploading…");
  const body = new FormData();
  body.append("applicantId", applicantId);
  body.append("file", prepared);

  const res = await fetch("/api/photo", { method: "POST", body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: data.error || "Upload failed." };
  return { ok: true, byteSize: data.byteSize };
}
