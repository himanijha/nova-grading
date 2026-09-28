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
  const byHandle = one(
    applicants.filter((a) => {
      const handle = norm(a.uclaEmail.split("@")[0]).replace(/ /g, "");
      return handle.length >= 4 && compact.includes(handle);
    })
  );
  if (byHandle) return byHandle;

  // Word-level matching, for names that are not spelled out exactly: a middle
  // name left off ("Allen Shan" for "Allen Yitian Shan"), or family name first
  // ("Kwon_Yunseo" for "Yunseo Kwon"). The uploader part is tried before the
  // whole file name, since the original file name can mention anything.
  const words = (s) => new Set(norm(s).split(" ").filter(Boolean));
  const parts = applicants.map((a) => ({ a, name: norm(a.fullName).split(" ").filter(Boolean) }));
  const scopes = dash !== -1 ? [words(base.slice(dash + 3)), words(base)] : [words(base)];

  // First and last name both present, in either order.
  for (const w of scopes) {
    const hits = parts.filter(({ name }) => name.length >= 2 && w.has(name[0]) && w.has(name.at(-1)));
    const hit = best(hits, w);
    if (hit) return hit;
  }

  // Failing that, a name word that belongs to exactly one applicant ("Aiman").
  // Short words are skipped: "ho", "ly" and "ma" turn up inside too much else.
  const owners = new Map();
  for (const { a, name } of parts) {
    for (const t of new Set(name)) {
      if (t.length < 3) continue;
      owners.set(t, owners.has(t) ? null : a);
    }
  }
  for (const w of scopes) {
    const hits = new Set([...w].map((t) => owners.get(t)).filter(Boolean));
    if (hits.size === 1) return [...hits][0];
  }
  return null;
}

// The candidate with the most name words in the file, or null on a tie.
function best(hits, w) {
  if (hits.length <= 1) return hits[0]?.a || null;
  const score = ({ name }) => name.filter((t) => w.has(t)).length;
  const sorted = [...hits].sort((x, y) => score(y) - score(x));
  return score(sorted[0]) > score(sorted[1]) ? sorted[0].a : null;
}
