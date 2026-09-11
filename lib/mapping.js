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

// ---------------------------------------------------------------------------
// Graduation year
//
// The form offers a fixed list of years plus a junior-transfer option, which
// comes through as its own choice: "2028 (junior transfer)". Transfers are a
// separate section of the application, so they stay a distinct cohort
// everywhere — their own filter entry and their own ranking cutoff — instead of
// being folded into the plain 2028 class.

export const GRAD_YEAR_OPTIONS = [
  "2030",
  "2029",
  "2028",
  "2028 (junior transfer)",
  "2027",
  "Other",
];

const TRANSFER_RE = /transfer/i;

/** True if this answer describes a transfer applicant. */
export function isTransferYear(value) {
  return TRANSFER_RE.test(String(value ?? ""));
}

/**
 * Canonicalise a graduation-year answer so the same cohort always groups
 * together: "2028 (Junior Transfer)", "2028 - junior transfer" and
 * "2028 (junior transfer)" all collapse to the last form.
 */
export function normalizeGradYear(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return null;

  const year = s.match(/\b(20\d{2})\b/)?.[1] || null;
  const transfer = isTransferYear(s);

  if (year) return transfer ? `${year} (junior transfer)` : year;
  if (transfer) return "Transfer";          // said transfer but gave no year
  if (/^other\b/i.test(s)) return "Other";
  return s;                                  // anything unexpected is kept as typed
}

/** Split a canonical value for display: { year, transfer }. */
export function gradYearParts(value) {
  const s = String(value ?? "").trim();
  const year = s.match(/\b(20\d{2})\b/)?.[1] || null;
  const transfer = isTransferYear(s);
  return { year: year || s, transfer, label: s };
}

// Sorts by year, with a year's transfers immediately after that class.
// Anything without a year (Other, Unknown) goes last.
function gradYearSortKey(value) {
  const s = String(value ?? "").trim();
  const year = s.match(/\b(20\d{2})\b/)?.[1];
  if (year) return [Number(year), isTransferYear(s) ? 1 : 0];
  return [Infinity, isTransferYear(s) ? 1 : 2];
}

/** Comparator for graduation years: 2027, 2028, 2028 (junior transfer), 2029, … */
export function compareGradYears(a, b) {
  const ka = gradYearSortKey(a);
  const kb = gradYearSortKey(b);
  return ka[0] - kb[0] || ka[1] - kb[1] || String(a).localeCompare(String(b));
}
