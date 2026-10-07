import { test } from "node:test";
import assert from "node:assert/strict";
import { seededRandom, generateRound, seatNewcomer } from "../lib/grouping.js";
import { groupSymbol } from "../lib/symbols.js";

const ids = (n, p = "a") => Array.from({ length: n }, (_, i) => `${p}${i}`);

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

// --- seating a late addition -------------------------------------------------

test("a late addition takes the smallest group each round and moves nobody", () => {
  const groups = ["g0", "g1", "g2"];
  const rounds = [
    new Map([["a", "g0"], ["b", "g0"], ["c", "g1"], ["d", "g1"], ["e", "g2"]]),
    new Map([["a", "g1"], ["b", "g2"], ["c", "g0"], ["d", "g2"], ["e", "g1"]]),
  ];
  const before = rounds.map((r) => [...r]);
  assert.deepEqual(seatNewcomer(groups, rounds), ["g2", "g0"]);
  assert.deepEqual(rounds.map((r) => [...r]), before);
});

test("a late addition avoids a symbol they have sat at when sizes allow", () => {
  const groups = ["g0", "g1", "g2"];
  const even = () => new Map([["a", "g0"], ["b", "g1"], ["c", "g2"]]);
  const seats = seatNewcomer(groups, [even(), even(), even()]);
  assert.equal(new Set(seats).size, 3, `seats ${seats}`);
});

test("a late addition has nowhere to sit without groups or rounds", () => {
  assert.deepEqual(seatNewcomer([], [new Map()]), []);
  assert.deepEqual(seatNewcomer(["g0"], []), []);
});
