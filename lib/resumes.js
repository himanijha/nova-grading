// Formats a Google Form file-upload question can collect as a resume. Zip
// entries carry no MIME type, so it comes from the extension.
export const RESUME_TYPES = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};

// Only these render in an iframe; Word files are offered as a download.
export const EMBEDDABLE = ["application/pdf", "image/png", "image/jpeg"];

const norm = (s) =>
  String(s || "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * Picks the applicant a file from the Drive export belongs to, or null when it
 * cannot tell. Google Forms names uploads "<original name> - <uploader name>",
 * so the part after the last " - " is tried first; failing that, any single
 * applicant whose full name or email handle appears in the file name.
 */
export function matchResume(fileName, applicants) {
  const base = fileName.split("/").pop().replace(/\.[^.]+$/, "");
  const one = (hits) => (hits.length === 1 ? hits[0] : null);

  const dash = base.lastIndexOf(" - ");
  if (dash !== -1) {
    const who = norm(base.slice(dash + 3));
    const hit = one(applicants.filter((a) => norm(a.fullName) === who));
    if (hit) return hit;
  }

  const n = ` ${norm(base)} `;
  const byName = one(applicants.filter((a) => norm(a.fullName) && n.includes(` ${norm(a.fullName)} `)));
  if (byName) return byName;

  const compact = n.replace(/ /g, "");
  return one(
    applicants.filter((a) => {
      const handle = norm(a.uclaEmail.split("@")[0]).replace(/ /g, "");
      return handle.length >= 4 && compact.includes(handle);
    })
  );
}
