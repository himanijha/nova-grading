import { test } from "node:test";
import assert from "node:assert/strict";
import { placeAt } from "../lib/rank-order.js";

const row = (id, value) => ({ id, value });
const CUT = { id: "cut", value: 14, fixed: true };

test("dropped between two scores lands halfway", () => {
  assert.deepEqual(placeAt([row("a", 16), row("b", 15)], "x", 1), [{ id: "x", rankScore: 15.5 }]);
});

test("dropped at either end goes past the end row", () => {
  assert.deepEqual(placeAt([row("a", 16), row("b", 15)], "x", 0), [{ id: "x", rankScore: 16.5 }]);
  assert.deepEqual(placeAt([row("a", 16), row("b", 15)], "x", 2), [{ id: "x", rankScore: 14.5 }]);
  assert.deepEqual(placeAt([], "x", 0), []);
});

test("dropped just above the cut line passes, just below fails", () => {
  const items = [row("a", 15), CUT, row("b", 12)];
  assert.ok(placeAt(items, "x", 1)[0].rankScore >= 14);
  assert.ok(placeAt(items, "x", 2)[0].rankScore < 14);
});

test("dropped just above the cut line next to someone sitting on it", () => {
  const out = placeAt([row("a", 14), CUT, row("b", 12)], "x", 1);
  const x = out.find((u) => u.id === "x").rankScore;
  const a = out.find((u) => u.id === "a").rankScore;
  assert.ok(x >= 14 && a > x);
});

test("a tie lifts the rows above rather than pushing anyone below", () => {
  const out = placeAt([row("a", 13), row("b", 13), row("c", 13), row("d", 12)], "x", 2);
  const by = Object.fromEntries(out.map((u) => [u.id, u.rankScore]));
  assert.deepEqual(Object.keys(by).sort(), ["a", "b", "x"]);
  assert.ok(by.a > by.b && by.b > by.x && by.x > 13 && by.a < 13.01);
});
