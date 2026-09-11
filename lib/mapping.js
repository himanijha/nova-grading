// Field definitions for the Nova application CSV import.
// `match` entries are lowercase substrings tested against the normalized header.

export const FIELDS = [
  { key: "submittedAt",     label: "Timestamp",              required: false, match: ["timestamp", "submitted"] },
  { key: "uclaEmail",       label: "UCLA email",             required: true,  match: ["ucla email", "email address", "username"] },
  { key: "contactEmail",    label: "Alternate contact email",required: false, match: ["prefer to be contacted", "different email"] },
  { key: "fullName",        label: "Full name",              required: true,  match: ["full name", "name"] },
  { key: "pronouns",        label: "Pronouns",               required: false, match: ["pronoun"] },
  { key: "gradYear",        label: "Graduation year",        required: false, match: ["graduation year", "grad year"] },
  { key: "majors",          label: "Major(s)",               required: false, match: ["major"] },
  { key: "minors",          label: "Minor(s)",               required: false, match: ["minor"] },
  { key: "resumeUrl",       label: "Resume",                 required: false, match: ["resume"] },
  { key: "roleRaw",         label: "Role interest",          required: false, match: ["primarily doing", "developer", "designer"] },
  { key: "qLookingForward", label: "Looking forward to",     required: false, match: ["looking forward"] },
  { key: "qInitiative",     label: "Took initiative",        required: false, match: ["initiative"] },
  { key: "qCommunity",      label: "Meaningful community",   required: false, match: ["community"] },
  { key: "links",           label: "Links / portfolio",      required: false, match: ["website", "github", "portfolio", "link"] },
  { key: "anythingElse",    label: "Anything else",          required: false, match: ["anything else"] },
];

const norm = (s) => String(s || "").toLowerCase().replace(/\s+/g, " ").trim();

/** Best-effort auto-map of CSV headers -> field keys. Returns { fieldKey: header }. */
export function autoMap(headers) {
  const out = {};
  const taken = new Set();

  for (const field of FIELDS) {
    let best = null;
    let bestScore = -1;

    for (const h of headers) {
      if (taken.has(h)) continue;
      const nh = norm(h);
      for (let i = 0; i < field.match.length; i++) {
        if (!nh.includes(field.match[i])) continue;
        // earlier patterns in `match` are stronger; longer patterns are stronger
        const score = (field.match.length - i) * 100 + field.match[i].length;
        if (score > bestScore) {
          bestScore = score;
          best = h;
        }
      }
    }

    if (best) {
      out[field.key] = best;
      taken.add(best);
    }
  }
  return out;
}

/** Collapse the free-text role answer into a sortable category. */
export function roleCategory(raw) {
  const s = norm(raw);
  if (!s) return "UNKNOWN";
  const dev = /develop|engineer|technical|coding|back ?end|front ?end|software/.test(s);
  const des = /design|ux|ui|product design/.test(s);
  if (dev && des) return "BOTH";
  if (dev) return "DEVELOPER";
  if (des) return "DESIGNER";
  return "OTHER";
}

/** Turn a Google Drive share/upload URL into an embeddable preview URL. */
export function drivePreviewUrl(url) {
  if (!url) return null;
  const u = String(url).trim();
  const id =
    u.match(/\/file\/d\/([A-Za-z0-9_-]{10,})/)?.[1] ||
    u.match(/[?&]id=([A-Za-z0-9_-]{10,})/)?.[1] ||
    u.match(/\/open\?id=([A-Za-z0-9_-]{10,})/)?.[1];
  if (id) return `https://drive.google.com/file/d/${id}/preview`;
  if (/^https?:\/\//.test(u)) return u;
  return null;
}

export function parseTimestamp(v) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}
