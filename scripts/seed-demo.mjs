// Loads fake applicants, graders, and random grades so you can try the app out.
// Usage:  npm run seed:demo            (24 applicants)
//         npm run seed:demo -- 60      (60 applicants)
//         npm run seed:demo -- 24 wipe  (delete existing demo data first)
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { PROFILES } from "./demo-content.mjs";

const prisma = new PrismaClient();

const count = Number(process.argv[2]) || 24;
const wipe = process.argv.includes("wipe");

const DEMO_DOMAIN = "@demo.ucla.edu";
const DEMO_GRADERS = [
  ["Rae Ortiz", "rae@nova.demo"],
  ["Sam Patel", "sam@nova.demo"],
  ["Tia Wu", "tia@nova.demo"],
];

if (wipe) {
  const { count: a } = await prisma.applicant.deleteMany({
    where: { uclaEmail: { endsWith: DEMO_DOMAIN } },
  });
  const { count: g } = await prisma.grader.deleteMany({
    where: { email: { endsWith: "@nova.demo" } },
  });
  console.log(`Wiped ${a} demo applicants and ${g} demo graders.`);
}

// Deterministic pseudo-random, so repeated runs produce the same data.
let seed = 7;
const rnd = () => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
};
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

const FIRST = "Avery Jordan Maya Alex Rin Noor Sam Kai Iris Theo Luca Nia Ezra Priya Owen Zoe Malik Hana Diego Sena Rowan Amara Felix June".split(" ");
const LAST = "Chen Doe Kim Patel Okafor Rivera Nakamura Ahmed Silva Novak Haddad Torres Lin Byrne Adeyemi Castro Ivanov Mensah Park Reyes".split(" ");
const YEARS = ["2027", "2028", "2028 (junior transfer)", "2029", "2030"];
const MAJORS = ["Computer Science", "Design | Media Arts", "Cognitive Science", "Electrical Engineering", "Statistics", "Sociology"];
const ROLE_RAW = {
  DEVELOPER: "Developer",
  DESIGNER: "Designer",
  BOTH: "Both — I'd like to split between development and design",
};

for (const [name, email] of DEMO_GRADERS) {
  await prisma.grader.upsert({
    where: { email },
    create: { email, name, passwordHash: await bcrypt.hash("password123", 10) },
    update: {},
  });
}

// Each applicant draws a written profile; `strength` is remembered so the
// grades below line up with how the responses actually read.
const strengthByEmail = new Map();

for (let i = 0; i < count; i++) {
  const name = `${pick(FIRST)} ${pick(LAST)}`;
  const email = `demo${i}${DEMO_DOMAIN}`;
  const profile = PROFILES[i % PROFILES.length];
  const dedupeKey = crypto.createHash("sha256").update(email).digest("hex");

  strengthByEmail.set(email, profile.strength);

  await prisma.applicant.upsert({
    where: { dedupeKey },
    create: {
      dedupeKey,
      uclaEmail: email,
      fullName: name,
      pronouns: pick(["she/her", "he/him", "they/them"]),
      submittedAt: new Date(2025, 8, 20 + Math.floor(rnd() * 13), Math.floor(rnd() * 24)),
      gradYear: pick(YEARS),
      majors: pick(MAJORS),
      minors: rnd() < 0.4 ? pick(MAJORS) : null,
      resumeUrl: `https://drive.google.com/file/d/demo${i}FakeDriveFileId000000000/view`,
      roleRaw: ROLE_RAW[profile.role],
      roleCategory: profile.role,
      qLookingForward: profile.lookingForward,
      qInitiative: profile.initiative,
      qCommunity: profile.community,
      links: profile.links || null,
      anythingElse: profile.anythingElse || null,
    },
    update: {},
  });
}

// Give each applicant 0-3 reviews from the demo graders.
const graders = await prisma.grader.findMany({ where: { email: { endsWith: "@nova.demo" } } });
const applicants = await prisma.applicant.findMany({ where: { uclaEmail: { endsWith: DEMO_DOMAIN } } });

for (const a of applicants) {
  // Mostly 1-3 reviewers; a few are left ungraded on purpose so the
  // "no reviews yet" states are visible.
  const n = rnd() < 0.15 ? 0 : 1 + Math.floor(rnd() * 3);
  const shuffled = [...graders].sort(() => rnd() - 0.5).slice(0, n);
  const base = strengthByEmail.get(a.uclaEmail) ?? 3;
  for (const g of shuffled) {
    // Scores hover around the profile's strength, +/- a point of grader disagreement.
    const s = () =>
      Math.max(1, Math.min(5, base + (rnd() < 0.25 ? 1 : 0) - (rnd() < 0.25 ? 1 : 0)));
    await prisma.grade.upsert({
      where: { applicantId_graderId: { applicantId: a.id, graderId: g.id } },
      create: {
        applicantId: a.id,
        graderId: g.id,
        technical: s(),
        thoughtfulness: s(),
        initiative: s(),
        communityFit: s(),
      },
      update: {},
    });
  }
}

console.log(
  `Demo data ready: ${await prisma.applicant.count()} applicants, ` +
    `${await prisma.grader.count()} graders, ${await prisma.grade.count()} grades.`
);
await prisma.$disconnect();
