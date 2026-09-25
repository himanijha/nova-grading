import { test } from "node:test";
import assert from "node:assert/strict";
import {
  seededRandom,
  assignCohorts,
  generateRound,
  matchAvailability,
} from "../lib/grouping.js";
import { groupSymbol } from "../lib/symbols.js";

const ids = (n, p = "a") => Array.from({ length: n }, (_, i) => `${p}${i}`);

// --- cohort matching ---------------------------------------------------------

test("people with one option get that option even when it is the busiest", () => {
  const people = [
    ...ids(5, "flex").map((id) => ({ id, available: ["sat", "sun"] })),
    { id: "only-sat", available: ["sat"] },
  ];
  const { placed } = assignCohorts(people, [{ id: "sat" }, { id: "sun" }], {
    rng: seededRandom(1),
  });
  assert.equal(placed.get("only-sat"), "sat");
});

test("cohorts stay balanced when everyone is flexible", () => {
  const people = ids(90).map((id) => ({ id, available: ["a", "b", "c"] }));
  const { placed } = assignCohorts(people, [{ id: "a" }, { id: "b" }, { id: "c" }], {
    rng: seededRandom(2),
  });
  const counts = { a: 0, b: 0, c: 0 };
  for (const c of placed.values()) counts[c]++;
  assert.deepEqual(counts, { a: 30, b: 30, c: 30 });
});

test("capacity is a hard limit and overflow is reported", () => {
  const people = ids(5).map((id) => ({ id, available: ["small"] }));
  const { placed, unplaced } = assignCohorts(people, [{ id: "small", capacity: 3 }], {
    rng: seededRandom(3),
  });
  assert.equal(placed.size, 3);
  assert.equal(unplaced.length, 2);
});

test("existing members count toward a cohort's load", () => {
  const people = ids(4).map((id) => ({ id, available: ["a", "b"] }));
  const { placed } = assignCohorts(people, [{ id: "a" }, { id: "b" }], {
    rng: seededRandom(4),
    existing: { a: 4, b: 0 },
  });
  assert.deepEqual([...placed.values()], ["b", "b", "b", "b"]);
});

test("people with no available slot are unplaced", () => {
  const { placed, unplaced } = assignCohorts(
    [{ id: "x", available: [] }],
    [{ id: "a" }],
    { rng: seededRandom(5) }
  );
  assert.equal(placed.size, 0);
  assert.deepEqual(unplaced, ["x"]);
});

// --- availability text matching ----------------------------------------------

test("availability matches cohort text case-insensitively, commas and all", () => {
  const cohorts = [
    { id: "a", match: "Sat, Oct 4, 10am" },
    { id: "b", match: "sun, oct 5, 2pm" },
  ];
  assert.deepEqual(matchAvailability("Sat, Oct 4, 10am, Sun, Oct 5, 2pm", cohorts), ["a", "b"]);
  assert.deepEqual(matchAvailability("SUN, OCT 5, 2PM", cohorts), ["b"]);
  assert.deepEqual(matchAvailability("", cohorts), []);
});

test("an empty match text never matches", () => {
  assert.deepEqual(matchAvailability("anything", [{ id: "a", match: "  " }]), []);
});

// --- round generation --------------------------------------------------------

test("a round places everyone, with group sizes within one of each other", () => {
  const members = ids(23);
  const round = generateRound(members, ["g0", "g1", "g2", "g3"], [], seededRandom(6));
  assert.equal(round.size, 23);
  const sizes = {};
  for (const g of round.values()) sizes[g] = (sizes[g] || 0) + 1;
  const vals = Object.values(sizes);
  assert.ok(Math.max(...vals) - Math.min(...vals) <= 1, `sizes ${vals}`);
});

test("later rounds avoid putting the same people together again", () => {
  const members = ids(40);
  const groups = ["g0", "g1", "g2", "g3", "g4", "g5", "g6", "g7"];
  const rng = seededRandom(7);
  const history = [];
  for (let r = 0; r < 3; r++) history.push(generateRound(members, groups, history, rng));

  // Count pairs who share a group in more than one round.
  const seen = new Map();
  let repeats = 0;
  for (const round of history) {
    const byGroup = {};
    for (const [m, g] of round) (byGroup[g] ||= []).push(m);
    for (const list of Object.values(byGroup)) {
      for (let i = 0; i < list.length; i++)
        for (let j = i + 1; j < list.length; j++) {
          const k = [list[i], list[j]].sort().join("|");
          if (seen.has(k)) repeats++;
          seen.set(k, true);
        }
    }
  }
  // 40 people in groups of 5: pure chance gives ~ dozens of repeats; the
  // greedy mixer should keep it to a handful.
  assert.ok(repeats <= 6, `too many repeat pairs: ${repeats}`);
});

// 30 people in 6 groups of 5: a perfect second round exists (each new group
// takes one person from five different old groups, none from its own), so
// nobody should need to stay at their symbol.
test("people are steered away from a symbol they already sat at", () => {
  const members = ids(30);
  const groups = ["g0", "g1", "g2", "g3", "g4", "g5"];
  const rng = seededRandom(8);
  const r1 = generateRound(members, groups, [], rng);
  const r2 = generateRound(members, groups, [r1], rng);
  const same = members.filter((m) => r1.get(m) === r2.get(m)).length;
  assert.ok(same <= 1, `${same} people stayed at the same symbol`);
});

test("no groups means nobody is placed", () => {
  assert.equal(generateRound(ids(3), [], [], seededRandom(9)).size, 0);
});

// --- symbols -----------------------------------------------------------------

test("group symbols are unique for a realistic number of groups", () => {
  const names = new Set(Array.from({ length: 40 }, (_, i) => groupSymbol(i).name));
  assert.equal(names.size, 40);
});

test("neighbouring groups differ in both colour and shape", () => {
  for (let i = 0; i < 20; i++) {
    const a = groupSymbol(i);
    const b = groupSymbol(i + 1);
    assert.notEqual(a.color, b.color);
    assert.notEqual(a.shape, b.shape);
  }
});
