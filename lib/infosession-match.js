import { norm } from "./resumes.js";

const email = (s) => String(s || "").trim().toLowerCase();

export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

/**
 * What importing the sheet does to each row: `rows` are { email, name } with
 * one row per email, `existing` is the list as it stands. Returns
 * [{ kind, id?, email, name }], kind being
 *   update    — the same email is on the list and the name changed (or they
 *               were added by hand under that email)
 *   unchanged — the same email is on the list and nothing changed
 *   merge     — someone added by hand with the same name, and they are the
 *               only one on both sides with it; the sheet's email replaces
 *               theirs so importing the sheet again finds them by email
 *   create    — anyone else
 */
export function planImport(rows, existing) {
  const byEmail = new Map(existing.filter((p) => p.email).map((p) => [email(p.email), p]));
  const sheetEmails = new Set(rows.map((r) => email(r.email)));
  const sheetNames = new Map();
  for (const r of rows) sheetNames.set(norm(r.name), (sheetNames.get(norm(r.name)) || 0) + 1);

  // Candidates for a merge: added by hand, and not already claimed by a row's
  // email — that row will update them directly.
  const byHand = new Map();
  for (const p of existing) {
    if (p.onSheet || (p.email && sheetEmails.has(email(p.email)))) continue;
    const k = norm(p.name);
    byHand.set(k, byHand.has(k) ? null : p);
  }
  const allNames = new Map();
  for (const p of existing) allNames.set(norm(p.name), (allNames.get(norm(p.name)) || 0) + 1);

  return rows.map((r) => {
    const e = email(r.email);
    const hit = byEmail.get(e);
    if (hit) {
      const same = hit.name === r.name && hit.onSheet;
      return { kind: same ? "unchanged" : "update", id: hit.id, email: e, name: r.name };
    }
    const k = norm(r.name);
    const hand = byHand.get(k);
    if (hand && sheetNames.get(k) === 1 && allNames.get(k) === 1) {
      return { kind: "merge", id: hand.id, email: e, name: r.name };
    }
    return { kind: "create", email: e, name: r.name };
  });
}

/**
 * Who on the list a hand-added person would duplicate, or null. The same
 * email is always the same person; the same name is too, unless both have an
 * email and they differ — two people can share a name.
 */
export function findDuplicate({ name, email: e }, existing) {
  const mine = email(e);
  if (mine) {
    const hit = existing.find((p) => email(p.email) === mine);
    if (hit) return hit;
  }
  const k = norm(name);
  return (
    existing.find(
      (p) => norm(p.name) === k && !(mine && p.email && email(p.email) !== mine)
    ) || null
  );
}
