import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { getCurrentGrader } from "@/lib/auth";
import { roleCategory, parseTimestamp, normalizeGradYear } from "@/lib/mapping";

const TEXT_FIELDS = [
  "contactEmail",
  "pronouns",
  "gradYear",
  "majors",
  "minors",
  "resumeUrl",
  "roleRaw",
  "qLookingForward",
  "qInitiative",
  "qCommunity",
  "links",
  "anythingElse",
];

const clean = (v) => {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
};

// True when a is known to be earlier than b. Missing timestamps never count as
// older, so a row without one still refreshes the applicant.
const isOlder = (a, b) => Boolean(a && b && a.getTime() < b.getTime());

const sameResponses = (existing, data) =>
  ["fullName", ...TEXT_FIELDS].every((f) => (existing[f] ?? null) === data[f]) &&
  (existing.submittedAt?.getTime() ?? null) === (data.submittedAt?.getTime() ?? null);

export async function POST(req) {
  const grader = await getCurrentGrader();
  if (!grader) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!grader.isAdmin)
    return NextResponse.json({ error: "Only admins can import applications." }, { status: 403 });

  const { rows, mapping } = await req.json();
  if (!Array.isArray(rows) || !mapping) {
    return NextResponse.json({ error: "Missing rows or mapping." }, { status: 400 });
  }
  if (!mapping.uclaEmail || !mapping.fullName) {
    return NextResponse.json(
      { error: "Email and full name columns must both be mapped." },
      { status: 400 }
    );
  }

  const get = (row, key) => (mapping[key] ? clean(row[mapping[key]]) : null);

  let created = 0;
  let updated = 0;
  let unchanged = 0;
  const skipped = [];

  // Collapse the CSV to one row per email, keeping the latest submission, so
  // someone who resubmitted is imported with their most recent answers.
  const latest = new Map();
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const uclaEmail = get(row, "uclaEmail");
    const fullName = get(row, "fullName");

    if (!uclaEmail || !fullName) {
      skipped.push({ line: i + 2, reason: "missing email or name" });
      continue;
    }

    const submittedAt = parseTimestamp(get(row, "submittedAt"));
    const data = {
      uclaEmail: uclaEmail.toLowerCase(),
      fullName,
      submittedAt,
      raw: JSON.stringify(row),
    };
    for (const f of TEXT_FIELDS) data[f] = get(row, f);
    data.roleCategory = roleCategory(data.roleRaw);
    // "2028 (Junior Transfer)" and friends collapse to one canonical cohort.
    data.gradYear = normalizeGradYear(data.gradYear);

    const prev = latest.get(data.uclaEmail);
    if (!prev || !isOlder(submittedAt, prev.submittedAt)) latest.set(data.uclaEmail, data);
  }

  for (const data of latest.values()) {
    const existing = await prisma.applicant.findFirst({
      where: { uclaEmail: data.uclaEmail },
      orderBy: { submittedAt: "desc" },
    });

    if (!existing) {
      const dedupeKey = crypto
        .createHash("sha256")
        .update(`${data.uclaEmail}|${data.submittedAt ? data.submittedAt.toISOString() : ""}`)
        .digest("hex");
      await prisma.applicant.create({ data: { ...data, dedupeKey } });
      created++;
      continue;
    }

    // Same person already in the database: refresh their answers if this
    // submission is at least as new and something changed. Grades, ratings and
    // the mugshot live in their own tables and are never touched here.
    if (isOlder(data.submittedAt, existing.submittedAt) || sameResponses(existing, data)) {
      unchanged++;
      continue;
    }
    await prisma.applicant.update({ where: { id: existing.id }, data });
    updated++;
  }

  return NextResponse.json({ ok: true, created, updated, unchanged, skipped });
}

