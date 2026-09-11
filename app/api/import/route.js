import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { getCurrentGrader } from "@/lib/auth";
import { roleCategory, parseTimestamp } from "@/lib/mapping";

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

export async function POST(req) {
  const grader = await getCurrentGrader();
  if (!grader) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

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
  const skipped = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const uclaEmail = get(row, "uclaEmail");
    const fullName = get(row, "fullName");

    if (!uclaEmail || !fullName) {
      skipped.push({ line: i + 2, reason: "missing email or name" });
      continue;
    }

    const submittedAt = parseTimestamp(get(row, "submittedAt"));

    // One row per person per submission time, so re-importing an updated
    // export refreshes existing applicants instead of duplicating them.
    const dedupeKey = crypto
      .createHash("sha256")
      .update(`${uclaEmail.toLowerCase()}|${submittedAt ? submittedAt.toISOString() : ""}`)
      .digest("hex");

    const data = {
      dedupeKey,
      uclaEmail: uclaEmail.toLowerCase(),
      fullName,
      submittedAt,
      raw: JSON.stringify(row),
    };
    for (const f of TEXT_FIELDS) data[f] = get(row, f);
    data.roleCategory = roleCategory(data.roleRaw);

    const existing = await prisma.applicant.findUnique({ where: { dedupeKey } });
    if (existing) {
      await prisma.applicant.update({ where: { dedupeKey }, data });
      updated++;
    } else {
      await prisma.applicant.create({ data });
      created++;
    }
  }

  return NextResponse.json({ ok: true, created, updated, skipped });
}
