import { test } from "node:test";
import assert from "node:assert/strict";
import { matchResume } from "../lib/resumes.js";

const people = [
  "Allen Yitian Shan",
  "Yunseo Kwon",
  "Ye Rongyang",
  "Aiman Pashtun",
  "Ashley Ngo Tran",
  "Ian Ngo",
  "Ian Dang",
  "Alice Wang",
  "Tiffany Wang",
].map((fullName, i) => ({ id: `a${i}`, fullName, uclaEmail: `x${i}@g.ucla.edu` }));

const who = (file) => matchResume(file, people)?.fullName || null;

test("a middle name left off still matches", () => {
  assert.equal(who("Allen_Shan - Allen Shan.pdf"), "Allen Yitian Shan");
  assert.equal(who("Ashley_Tran - Ashley Tran.pdf"), "Ashley Ngo Tran");
});

test("family name first still matches", () => {
  assert.equal(who("Kwon_Yunseo_Resume2026.pdf - ??.pdf"), "Yunseo Kwon");
  assert.equal(who("Rongyang_Ye - GOGGLES AND GOOGLE.pdf"), "Ye Rongyang");
});

test("a name word only one applicant has is enough", () => {
  assert.equal(who("Aiman_s Resume - Aiman.pdf"), "Aiman Pashtun");
});

test("shared name words are not enough on their own", () => {
  assert.equal(who("Ian resume.pdf"), null);
  assert.equal(who("Wang_Resume.pdf"), null);
  assert.equal(who("Resume.pdf"), null);
});
