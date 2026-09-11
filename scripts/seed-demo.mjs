// Loads fake applicants, graders, and random grades so you can try the app out.
// Usage:  npm run seed:demo            (24 applicants)
//         npm run seed:demo -- 60      (60 applicants)
//         npm run seed:demo -- 24 wipe  (delete existing demo data first)
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

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
const YEARS = ["2026", "2027", "2028", "2029"];
const MAJORS = ["Computer Science", "Design | Media Arts", "Cognitive Science", "Electrical Engineering", "Statistics", "Sociology"];
const ROLES = [
  ["Developer", "DEVELOPER"],
  ["Designer", "DESIGNER"],
  ["Both — I'd like to split between development and design", "BOTH"],
];

for (const [name, email] of DEMO_GRADERS) {
  await prisma.grader.upsert({
    where: { email },
    create: { email, name, passwordHash: await bcrypt.hash("password123", 10) },
    update: {},
  });
}

for (let i = 0; i < count; i++) {
  const name = `${pick(FIRST)} ${pick(LAST)}`;
  const email = `demo${i}${DEMO_DOMAIN}`;
  const [roleRaw, roleCategory] = pick(ROLES);
  const dedupeKey = crypto.createHash("sha256").update(email).digest("hex");

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
      roleRaw,
      roleCategory,
      qLookingForward: "Sample response — this is demo data, not a real application.",
      qInitiative: "Sample response — this is demo data, not a real application.",
      qCommunity: "Sample response — this is demo data, not a real application.",
    },
    update: {},
  });
}

// Give each applicant 0-3 reviews from the demo graders.
const graders = await prisma.grader.findMany({ where: { email: { endsWith: "@nova.demo" } } });
const applicants = await prisma.applicant.findMany({ where: { uclaEmail: { endsWith: DEMO_DOMAIN } } });

for (const a of applicants) {
  const n = Math.floor(rnd() * 4); // 0-3 reviewers, so some stay ungraded
  const shuffled = [...graders].sort(() => rnd() - 0.5).slice(0, n);
  for (const g of shuffled) {
    const base = 2 + Math.floor(rnd() * 3);
    const s = () => Math.max(1, Math.min(5, base + (rnd() < 0.4 ? 1 : 0) - (rnd() < 0.2 ? 1 : 0)));
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
