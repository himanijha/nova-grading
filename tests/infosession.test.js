import { test } from "node:test";
import assert from "node:assert/strict";
import { matchAttendees } from "../lib/infosession-match.js";

const applicants = [
  { id: "a1", fullName: "Ian Ngo", uclaEmail: "ian@g.ucla.edu", contactEmail: "ian@gmail.com" },
  { id: "a2", fullName: "Alice Wang", uclaEmail: "alice@g.ucla.edu", contactEmail: null },
  { id: "a3", fullName: "Sam Lee", uclaEmail: "sam1@g.ucla.edu", contactEmail: null },
  { id: "a4", fullName: "Sam Lee", uclaEmail: "sam2@g.ucla.edu", contactEmail: null },
];
const who = (attendees) =>
  Object.fromEntries([...matchAttendees(attendees, applicants)].map(([k, v]) => [k, v.id]));

test("matches either email, ignoring case", () => {
  assert.deepEqual(
    who([
      { id: "p1", name: "Whoever", email: "IAN@gmail.com " },
      { id: "p2", name: "A W", email: "alice@g.ucla.edu" },
    ]),
    { p1: "a1", p2: "a2" }
  );
});

test("falls back to a name only one applicant has", () => {
  assert.deepEqual(who([{ id: "p1", name: "alice  wang", email: "aw@yahoo.com" }]), { p1: "a2" });
});

test("a shared name is not guessed", () => {
  assert.deepEqual(who([{ id: "p1", name: "Sam Lee", email: "sam@yahoo.com" }]), {});
});

test("two attendees with one name are not guessed either", () => {
  assert.deepEqual(
    who([
      { id: "p1", name: "Alice Wang", email: "x@yahoo.com" },
      { id: "p2", name: "Alice Wang", email: "y@yahoo.com" },
    ]),
    {}
  );
});

test("someone who applied later is unmatched until they do", () => {
  assert.deepEqual(who([{ id: "p1", name: "New Person", email: "new@g.ucla.edu" }]), {});
});
