import { test } from "node:test";
import assert from "node:assert/strict";
import { roleCategory, normalizeGradYear, gradYearParts, linkParts } from "../lib/mapping.js";

// Answers as they actually came in from the live form.
test("short-form role answers are categorized", () => {
  assert.equal(roleCategory("Dev"), "DEVELOPER");
  assert.equal(roleCategory("Design"), "DESIGNER");
  assert.equal(roleCategory("Dev / Marketing"), "DEVELOPER");
  assert.equal(
    roleCategory("I would prefer Dev but would also want to explore the Design roll at some point as well"),
    "BOTH"
  );
});

test("long-form role answers still work", () => {
  assert.equal(roleCategory("Developer"), "DEVELOPER");
  assert.equal(roleCategory("Designer"), "DESIGNER");
  assert.equal(roleCategory("Both — I'd like to split between development and design"), "BOTH");
  assert.equal(roleCategory("UI/UX"), "DESIGNER");
});

test("ui/ux inside other words does not count as design", () => {
  assert.equal(roleCategory("I want to build things"), "OTHER");
  assert.equal(roleCategory("https://drive.google.com/open?id=18-UXzY44nIa2t33ndZV5sB2sIFTViRCV"), "OTHER");
  assert.equal(roleCategory(""), "UNKNOWN");
});

test("transfer answers keep which year they transfer in as", () => {
  assert.equal(normalizeGradYear("1st Year Transfer"), "1st Year Transfer");
  assert.equal(normalizeGradYear("2nd year transfer"), "2nd Year Transfer");
  assert.equal(normalizeGradYear("Transfer"), "Transfer");
  assert.equal(normalizeGradYear("2029"), "2029");
  assert.equal(normalizeGradYear("2028 (Junior Transfer)"), "2028 (junior transfer)");
  assert.deepEqual(gradYearParts("2nd Year Transfer"), { year: "2nd year", transfer: true, label: "2nd Year Transfer" });
});

test("links without a scheme get https so they leave this site", () => {
  assert.deepEqual(linkParts("erinteng.com"), [{ text: "erinteng.com", href: "https://erinteng.com" }]);
  assert.deepEqual(linkParts("https://erinteng.com/"), [
    { text: "https://erinteng.com/", href: "https://erinteng.com/" },
  ]);
  assert.deepEqual(linkParts("www.github.com/erin"), [
    { text: "www.github.com/erin", href: "https://www.github.com/erin" },
  ]);
});

test("several links in one answer each become a link", () => {
  const links = linkParts("github.com/erin, linkedin.com/in/erin\nhttp://old.site").filter((p) => p.href);
  assert.deepEqual(
    links.map((p) => p.href),
    ["https://github.com/erin", "https://linkedin.com/in/erin", "http://old.site"]
  );
});

test("words, emails and trailing punctuation are not linked", () => {
  const parts = linkParts("Portfolio: erinteng.com. Email erin@ucla.edu");
  assert.deepEqual(parts.filter((p) => p.href), [{ text: "erinteng.com", href: "https://erinteng.com" }]);
  assert.equal(parts.map((p) => p.text).join(""), "Portfolio: erinteng.com. Email erin@ucla.edu");
});
