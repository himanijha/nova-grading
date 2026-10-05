import { test } from "node:test";
import assert from "node:assert/strict";
import {
  matchName,
  nameIndex,
  normalizeName,
  parseSignupSheet,
  sessionName,
  sheetCsvUrl,
  zonedTime,
} from "../lib/signups.js";

// --- reading the sheet -------------------------------------------------------

// The shape of the real sheet: a day merged across two columns, a row of
// times, a notes column off to the right, and an instruction in the last row.
const SHEET = [
  [" Tuesday October 7th (Boelter Hall - Room 5440)", "", "Wednesday October 8th (Engineering VI)", "", "Instructions : Enter your name in a slot that works for you."],
  ["8:00-9:00pm", "9:00-10:00pm", "7:00-8:00pm (tentative)", "", "Note on Wednesday's slot: the time may shift by an hour."],
  ["Ada Lovelace", "Alan Turing", "Grace Hopper", "", ""],
  ["", "Edsger Dijkstra", "Barbara Liskov", "  ", ""],
  ["Ken Thompson", "", "", "", ""],
  ["", "", "", "", ""],
  ["please do not add new rows if a given timeslot is full. also do not remove anyone's name!", "", "", "", ""],
];

test("each timed column is a slot, and a merged day covers both its columns", () => {
  const { slots } = parseSignupSheet(SHEET);
  assert.deepEqual(
    slots.map((s) => [s.col, s.name]),
    [
      [0, "Tuesday October 7th, 8:00-9:00pm"],
      [1, "Tuesday October 7th, 9:00-10:00pm"],
      [2, "Wednesday October 8th, 7:00-8:00pm"],
    ]
  );
});

test("names come from under each slot, skipping gaps", () => {
  const { slots } = parseSignupSheet(SHEET);
  assert.deepEqual(slots[0].names, ["Ada Lovelace", "Ken Thompson"]);
  assert.deepEqual(slots[1].names, ["Alan Turing", "Edsger Dijkstra"]);
  assert.deepEqual(slots[2].names, ["Grace Hopper", "Barbara Liskov"]);
});

test("an instruction typed under a slot is set aside, not treated as a person", () => {
  const { skipped } = parseSignupSheet(SHEET);
  assert.equal(skipped.length, 1);
  assert.match(skipped[0], /^please do not add/);
});

test("start times are read from the day and the time range", () => {
  const { slots } = parseSignupSheet(SHEET);
  assert.deepEqual(slots[0].start, { month: 9, day: 7, hour: 20, minute: 0 });
  assert.deepEqual(slots[1].start, { month: 9, day: 7, hour: 21, minute: 0 });
  assert.deepEqual(slots[2].start, { month: 9, day: 8, hour: 19, minute: 0 });
});

test("the room comes from the brackets after the day", () => {
  const { slots } = parseSignupSheet(SHEET);
  assert.deepEqual(slots.map((s) => s.location), ["Boelter Hall - Room 5440", "Boelter Hall - Room 5440", "Engineering VI"]);
});

test("sheet times are campus times, whatever zone the server runs in", () => {
  const at = zonedTime({ year: 2026, month: 9, day: 6, hour: 20, minute: 0 });
  assert.equal(at.toISOString(), "2026-10-07T03:00:00.000Z"); // PDT, UTC-7
  assert.equal(zonedTime({ year: 2026, month: 11, day: 1, hour: 9, minute: 30 }).toISOString(), "2026-12-01T17:30:00.000Z"); // PST
  assert.equal(sessionName(at), "Tue 8pm");
  assert.equal(sessionName(zonedTime({ year: 2026, month: 9, day: 7, hour: 19, minute: 30 })), "Wed 7:30pm");
});

test("a bare start time takes the end's am/pm unless that puts it after the end", () => {
  const start = (time) => parseSignupSheet([["Oct 4"], [time]]).slots[0].start;
  assert.equal(start("11:00-12:00pm").hour, 11);
  assert.equal(start("12:30-1:30pm").hour, 12);
  assert.equal(start("10am-11am").hour, 10);
  assert.equal(start("11:30-12:30am").hour, 23);
});

test("the same name twice in one slot counts once", () => {
  const { slots } = parseSignupSheet([["Oct 4"], ["1-2pm"], ["Ada Lovelace"], ["ada  lovelace"]]);
  assert.deepEqual(slots[0].names, ["Ada Lovelace"]);
});

test("without a row of times, the first row's headers are the slots", () => {
  const { slots } = parseSignupSheet([["Sat 10am", "Sun 2pm"], ["Ada Lovelace", "Alan Turing"]]);
  assert.deepEqual(slots.map((s) => s.name), ["Sat 10am", "Sun 2pm"]);
  assert.equal(slots[0].start, null);
  assert.deepEqual(slots[1].names, ["Alan Turing"]);
});

// --- matching names ----------------------------------------------------------

const PEOPLE = nameIndex([
  { id: "ada", fullName: "Ada Lovelace" },
  { id: "jr", fullName: "J.R. Johnson" },
  { id: "eric", fullName: "Junxuan (Eric) Fang" },
  { id: "mary", fullName: "Mary Yeruva" },
  { id: "jose", fullName: "José Núñez" },
  { id: "ethan1", fullName: "Ethan Nguyen" },
  { id: "ethan2", fullName: "Ethan Nguyen" },
  { id: "sophia", fullName: "Sophia Wu" },
  { id: "sophie", fullName: "Sophie Cui" },
]);

test("capitalisation, spacing, dots and accents don't matter", () => {
  assert.equal(normalizeName("  J.R.  Johnson "), "jr johnson");
  assert.deepEqual(matchName("ada lovelace", PEOPLE), { status: "exact", applicantId: "ada", candidates: ["ada"] });
  assert.equal(matchName("JR Johnson", PEOPLE).applicantId, "jr");
  assert.equal(matchName("Jose Nunez", PEOPLE).status, "exact");
});

test("extra, missing or reordered names are a close match to check", () => {
  for (const [typed, id] of [
    ["Junxuan Fang Eric", "eric"],
    ["Eric Fang", "eric"],
    ["Mary Sakshita Reddy Yeruva", "mary"],
    ["Lovelace Ada", "ada"],
  ]) {
    assert.deepEqual(matchName(typed, PEOPLE), { status: "close", applicantId: id, candidates: [id] }, typed);
  }
});

test("a small typo is a close match", () => {
  assert.equal(matchName("Ada Lovelase", PEOPLE).applicantId, "ada");
  assert.equal(matchName("Ada Lovelase", PEOPLE).status, "close");
});

test("two applicants with the same name are never guessed between", () => {
  const m = matchName("Ethan Nguyen", PEOPLE);
  assert.equal(m.status, "ambiguous");
  assert.equal(m.applicantId, null);
  assert.deepEqual(m.candidates, ["ethan1", "ethan2"]);
});

test("a shared first name alone is not a match", () => {
  assert.equal(matchName("Sophie Yang", PEOPLE).status, "none");
  assert.equal(matchName("Ada", PEOPLE).status, "none");
  assert.equal(matchName("", PEOPLE).status, "none");
});

// --- the sheet link ----------------------------------------------------------

test("a Google Sheets link becomes its CSV download, keeping the tab", () => {
  assert.equal(
    sheetCsvUrl("https://docs.google.com/spreadsheets/d/1AbC-d_9/edit?gid=42#gid=42"),
    "https://docs.google.com/spreadsheets/d/1AbC-d_9/export?format=csv&gid=42"
  );
  assert.equal(
    sheetCsvUrl("https://docs.google.com/spreadsheets/d/1AbC/edit?usp=sharing"),
    "https://docs.google.com/spreadsheets/d/1AbC/export?format=csv"
  );
  assert.equal(
    sheetCsvUrl("https://docs.google.com/spreadsheets/d/e/2PACX-xyz/pubhtml?gid=7"),
    "https://docs.google.com/spreadsheets/d/e/2PACX-xyz/pub?output=csv&gid=7"
  );
});

test("anything that isn't a Google Sheets link is refused", () => {
  for (const link of ["", "not a link", "http://docs.google.com/spreadsheets/d/1AbC/edit", "https://evil.example/spreadsheets/d/1AbC", "https://docs.google.com/document/d/1AbC/edit"]) {
    assert.equal(sheetCsvUrl(link), null, link);
  }
});
