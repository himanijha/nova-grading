// Server-side reads for the info session list.
import { prisma } from "./db";
import { matchAttendees } from "./infosession-match";

export const ATTENDEE_SELECT = {
  id: true,
  name: true,
  email: true,
  note: true,
  autoAccept: true,
  onSheet: true,
  updatedAt: true,
  updatedBy: { select: { name: true } },
  addedBy: { select: { name: true } },
};

export function attendeeView(p) {
  return {
    id: p.id,
    name: p.name,
    email: p.email,
    note: p.note,
    autoAccept: p.autoAccept,
    onSheet: p.onSheet,
    updatedByName: p.updatedBy?.name || null,
    addedByName: p.addedBy?.name || null,
  };
}

/**
 * Every attendee with the applicant they match, if any. Matched against every
 * applicant, never a filtered list, so a name only counts as unique when it
 * is unique across the whole pile.
 */
export async function loadAttendees() {
  const [attendees, applicants] = await Promise.all([
    prisma.infoSessionAttendee.findMany({ select: ATTENDEE_SELECT }),
    prisma.applicant.findMany({
      select: { id: true, fullName: true, uclaEmail: true, contactEmail: true },
    }),
  ]);
  const match = matchAttendees(attendees, applicants);
  return attendees.map((p) => ({ ...attendeeView(p), applicant: match.get(p.id) || null }));
}

/** Map(applicantId → attendee view) for pages that mark applicants who came. */
export async function infoSessionByApplicant() {
  const attendees = await loadAttendees();
  return new Map(attendees.filter((p) => p.applicant).map((p) => [p.applicant.id, p]));
}
