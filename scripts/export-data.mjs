// Exports everything from the SQLite database to a JSON file.
//
// Reads the SQLite file directly (via node:sqlite) rather than through Prisma,
// so it keeps working after the Prisma schema has been switched to Postgres.
//
// Usage:  node scripts/export-data.mjs [path/to/dev.db] [out.json]
import { DatabaseSync } from "node:sqlite";
import fs from "fs";
import path from "path";

const dbPath = process.argv[2] || "prisma/dev.db";
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const outPath = process.argv[3] || `backups/export-${stamp}.json`;

if (!fs.existsSync(dbPath)) {
  console.error(`No database at ${dbPath}`);
  process.exit(1);
}

const db = new DatabaseSync(dbPath, { readOnly: true });
const all = (sql) => db.prepare(sql).all();

const graders = all(
  `SELECT id, email, name, passwordHash, isAdmin, mustReset, createdAt FROM Grader`
);
const applicants = all(`SELECT * FROM Applicant`);
const grades = all(`SELECT * FROM Grade`);

// Resolve the foreign keys to natural keys (emails, dedupeKey) so the data can
// be reloaded even if row ids change — e.g. after re-importing the Form CSV.
const graderById = new Map(graders.map((g) => [g.id, g]));
const applicantById = new Map(applicants.map((a) => [a.id, a]));

const portableGrades = grades.map((g) => {
  const grader = graderById.get(g.graderId);
  const applicant = applicantById.get(g.applicantId);
  return {
    graderEmail: grader?.email ?? null,
    applicantDedupeKey: applicant?.dedupeKey ?? null,
    applicantEmail: applicant?.uclaEmail ?? null,
    applicantName: applicant?.fullName ?? null,
    technical: g.technical,
    thoughtfulness: g.thoughtfulness,
    initiative: g.initiative,
    communityFit: g.communityFit,
    technicalNote: g.technicalNote,
    thoughtfulnessNote: g.thoughtfulnessNote,
    initiativeNote: g.initiativeNote,
    communityFitNote: g.communityFitNote,
    overallNote: g.overallNote,
    createdAt: g.createdAt,
    updatedAt: g.updatedAt,
  };
});

const orphaned = portableGrades.filter(
  (g) => !g.graderEmail || !g.applicantDedupeKey
);

const payload = {
  exportedAt: new Date().toISOString(),
  source: path.resolve(dbPath),
  counts: {
    graders: graders.length,
    applicants: applicants.length,
    grades: portableGrades.length,
  },
  graders,
  applicants,
  grades: portableGrades,
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
db.close();

console.log(
  `Exported ${graders.length} graders, ${applicants.length} applicants, ` +
    `${portableGrades.length} grades -> ${outPath}`
);
if (orphaned.length) {
  console.warn(`WARNING: ${orphaned.length} grades could not be linked to a grader/applicant.`);
}
