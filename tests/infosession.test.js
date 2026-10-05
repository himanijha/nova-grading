import { test } from "node:test";
import assert from "node:assert/strict";
import { findDuplicate, matchAttendees, planImport } from "../lib/infosession-match.js";

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

const list = [
  { id: "s1", name: "Ian Ngo", email: "ian@g.ucla.edu", onSheet: true },
  { id: "h1", name: "Alice Wang", email: null, onSheet: false },
  { id: "h2", name: "Bo Chen", email: "bo@gmail.com", onSheet: false },
  { id: "h3", name: "Sam Lee", email: null, onSheet: false },
  { id: "h4", name: "Sam Lee", email: null, onSheet: false },
];
const plan = (rows) => planImport(rows, list).map((p) => [p.kind, p.id || null]);

test("the import merges into someone added by hand by name", () => {
  assert.deepEqual(plan([{ name: "alice wang", email: "alice@g.ucla.edu" }]), [["merge", "h1"]]);
});

test("the import merges into someone added by hand by email, even with a new name", () => {
  assert.deepEqual(plan([{ name: "Bo C", email: "bo@gmail.com" }]), [["update", "h2"]]);
});

test("a name two hand-added people share is not merged", () => {
  assert.deepEqual(plan([{ name: "Sam Lee", email: "sam@g.ucla.edu" }]), [["create", null]]);
});

test("someone already imported is unchanged, and a new name is created", () => {
  assert.deepEqual(
    plan([
      { name: "Ian Ngo", email: "ian@g.ucla.edu" },
      { name: "New Person", email: "new@g.ucla.edu" },
    ]),
    [
      ["unchanged", "s1"],
      ["create", null],
    ]
  );
});

test("importing the merged sheet again changes nothing", () => {
  const row = { name: "Alice Wang", email: "alice@g.ucla.edu" };
  const after = list.map((p) => (p.id === "h1" ? { ...p, ...row, onSheet: true } : p));
  assert.deepEqual(planImport([row], after).map((p) => p.kind), ["unchanged"]);
});

test("adding someone already on the list is caught by email or name", () => {
  assert.equal(findDuplicate({ name: "Someone", email: "IAN@g.ucla.edu" }, list)?.id, "s1");
  assert.equal(findDuplicate({ name: "ian ngo", email: "" }, list)?.id, "s1");
  assert.equal(findDuplicate({ name: "Ian Ngo", email: "other@gmail.com" }, list), null);
  assert.equal(findDuplicate({ name: "Alice Wang", email: "a@gmail.com" }, list)?.id, "h1");
});
