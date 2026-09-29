import { norm } from "./resumes.js";

const email = (s) => String(s || "").trim().toLowerCase();

/**
 * Pairs info session attendees with applicants. Returns Map(attendeeId →
 * applicant). An email match on either of the applicant's addresses wins;
 * failing that, the same full name, but only when exactly one applicant and
 * one unmatched attendee have it — people often sign in with a personal
 * address and apply with their UCLA one, and a guessed pairing is worse than
 * none.
 */
export function matchAttendees(attendees, applicants) {
  const byEmail = new Map();
  for (const a of applicants) {
    for (const e of [a.uclaEmail, a.contactEmail].map(email).filter(Boolean)) {
      if (!byEmail.has(e)) byEmail.set(e, a);
    }
  }

  const out = new Map();
  const taken = new Set();
  for (const p of attendees) {
    const hit = byEmail.get(email(p.email));
    if (hit && !taken.has(hit.id)) {
      out.set(p.id, hit);
      taken.add(hit.id);
    }
  }

  const count = (list, key) => {
    const m = new Map();
    for (const x of list) {
      const k = norm(key(x));
      if (k) m.set(k, (m.get(k) || 0) + 1);
    }
    return m;
  };
  const left = attendees.filter((p) => !out.has(p.id));
  const free = applicants.filter((a) => !taken.has(a.id));
  const attendeeNames = count(left, (p) => p.name);
  // Counted over every applicant, not just the free ones: two applicants with
  // one name is ambiguous even if one of them was already matched by email.
  const applicantNames = count(applicants, (a) => a.fullName);
  for (const p of left) {
    const k = norm(p.name);
    if (!k || attendeeNames.get(k) !== 1 || applicantNames.get(k) !== 1) continue;
    const hit = free.find((a) => norm(a.fullName) === k);
    if (hit) out.set(p.id, hit);
  }
  return out;
}
