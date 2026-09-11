// Loads a JSON file produced by export-data.mjs into the current database
// (whatever DATABASE_URL points at). Safe to re-run: everything is upserted.
//
// Grades are matched by grader email + applicant dedupeKey, so they reattach
// correctly even if the applicants were recreated by re-importing the Form CSV.
//
// Usage:  node scripts/import-data.mjs backups/export-....json
//         node scripts/import-data.mjs backups/export-....json --grades-only
import { PrismaClient } from "@prisma/client";
import fs from "fs";

const prisma = new PrismaClient();

const file = process.argv[2];
const gradesOnly = process.argv.includes("--grades-only");

if (!file || !fs.existsSync(file)) {
  console.error("Usage: node scripts/import-data.mjs <export.json> [--grades-only]");
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(file, "utf8"));
const date = (v) => (v === null || v === undefined ? null : new Date(v));

if (!gradesOnly) {
  for (const g of data.graders) {
    await prisma.grader.upsert({
      where: { email: g.email },
      create: {
        email: g.email,
        name: g.name,
        passwordHash: g.passwordHash,
        isAdmin: !!g.isAdmin,
        mustReset: !!g.mustReset,
        createdAt: date(g.createdAt) ?? new Date(),
      },
      update: { name: g.name, isAdmin: !!g.isAdmin },
    });
  }
  console.log(`Graders: ${data.graders.length} upserted.`);

  for (const a of data.applicants) {
    const { id, createdAt, ...rest } = a;
    const fields = {
      ...rest,
      submittedAt: date(a.submittedAt),
      createdAt: date(createdAt) ?? new Date(),
    };
    await prisma.applicant.upsert({
      where: { dedupeKey: a.dedupeKey },
      create: fields,
      update: fields,
    });
  }
  console.log(`Applicants: ${data.applicants.length} upserted.`);
}

// Resolve natural keys to ids in this database.
const graders = await prisma.grader.findMany({ select: { id: true, email: true } });
const applicants = await prisma.applicant.findMany({ select: { id: true, dedupeKey: true } });
const graderIdByEmail = new Map(graders.map((g) => [g.email, g.id]));
const applicantIdByKey = new Map(applicants.map((a) => [a.dedupeKey, a.id]));

let restored = 0;
const unmatched = [];

for (const g of data.grades) {
  const graderId = graderIdByEmail.get(g.graderEmail);
  const applicantId = applicantIdByKey.get(g.applicantDedupeKey);

  if (!graderId || !applicantId) {
    unmatched.push({
      applicant: g.applicantName || g.applicantEmail,
      grader: g.graderEmail,
      reason: !graderId ? "no matching grader" : "no matching applicant",
    });
    continue;
  }

  const scores = {
    technical: g.technical,
    thoughtfulness: g.thoughtfulness,
    initiative: g.initiative,
    communityFit: g.communityFit,
    technicalNote: g.technicalNote,
    thoughtfulnessNote: g.thoughtfulnessNote,
    initiativeNote: g.initiativeNote,
    communityFitNote: g.communityFitNote,
    overallNote: g.overallNote,
  };

  await prisma.grade.upsert({
    where: { applicantId_graderId: { applicantId, graderId } },
    create: { applicantId, graderId, ...scores, createdAt: date(g.createdAt) ?? new Date() },
    update: scores,
  });
  restored++;
}

console.log(`Grades: ${restored} restored.`);
if (unmatched.length) {
  console.warn(`\n${unmatched.length} grades could NOT be restored:`);
  for (const u of unmatched.slice(0, 20)) {
    console.warn(`  ${u.applicant} / ${u.grader} — ${u.reason}`);
  }
  console.warn("\nRe-import the Form CSV first so the applicants exist, then re-run this.");
  process.exitCode = 1;
}

await prisma.$disconnect();
