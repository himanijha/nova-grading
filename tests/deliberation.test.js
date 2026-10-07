const test = require("node:test");
const assert = require("node:assert/strict");
const { placeVerdict, isVerdict } = require("../lib/deliberation.js");

test("a new verdict lands below everyone rated at least as high", () => {
  const verdicts = { a: "STRONG_ACCEPT", b: "YES", c: "MAYBE" };
  const ranking = ["a", "b", "c"];
  assert.deepEqual(placeVerdict(ranking, verdicts, "d", "YES"), ["a", "b", "d", "c"]);
  assert.deepEqual(placeVerdict(ranking, verdicts, "d", "STRONG_NO"), ["a", "b", "c", "d"]);
  assert.deepEqual(placeVerdict(ranking, verdicts, "d", "STRONG_ACCEPT"), ["a", "d", "b", "c"]);
});

test("come back goes to the top", () => {
  const verdicts = { a: "STRONG_ACCEPT", b: "YES" };
  assert.deepEqual(placeVerdict(["a", "b"], verdicts, "c", "COME_BACK"), ["c", "a", "b"]);
  const withBack = { ...verdicts, c: "COME_BACK" };
  assert.deepEqual(placeVerdict(["c", "a", "b"], withBack, "d", "COME_BACK"), ["c", "d", "a", "b"]);
});

test("changing a verdict moves the person to its new place", () => {
  const verdicts = { a: "STRONG_ACCEPT", b: "YES", c: "MAYBE" };
  assert.deepEqual(placeVerdict(["a", "b", "c"], verdicts, "a", "MAYBE"), ["b", "c", "a"]);
});

test("isVerdict only accepts the five calls", () => {
  assert.equal(isVerdict("YES"), true);
  assert.equal(isVerdict("DOUBLE_UP"), false);
  assert.equal(isVerdict("constructor"), false);
});
