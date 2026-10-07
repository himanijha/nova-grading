// Fills in fake coffee chat ratings and round 3 group work notes on the demo
// event, so Deliberations has something to show.
//
// Usage:  npm run seed:deliberation -- wipe   (remove what this script added)
//         npm run seed:deliberation           (add ratings and notes)
//
// Refuses to run unless DATABASE_URL points at this machine, and only touches
// demo applicants (@demo.ucla.edu) and demo graders (@nova.demo).
import { PrismaClient } from "@prisma/client";
import { seededRandom } from "../lib/grouping.js";

const url = process.env.DATABASE_URL || "";
if (!/@(localhost|127\.0\.0\.1)[:/]/.test(url)) {
  console.error(`Refusing to run: DATABASE_URL is not a local database (${url.replace(/\/\/[^@]*@/, "//***@") || "unset"}).`);
  process.exit(1);
}

const prisma = new PrismaClient();
const DEMO_DOMAIN = "@demo.ucla.edu";
const wipeOnly = process.argv.includes("wipe");

const demoApplicants = { uclaEmail: { endsWith: DEMO_DOMAIN } };
const demoGraders = { email: { endsWith: "@nova.demo" } };

// Remove what this script adds: ratings from demo graders, and round 3 notes.
await prisma.rating.deleteMany({ where: { applicant: demoApplicants, grader: demoGraders } });
await prisma.note.deleteMany({ where: { applicant: demoApplicants, round: { number: 3 } } });

if (wipeOnly) {
  console.log("Removed the fake deliberation data.");
  await prisma.$disconnect();
  process.exit(0);
}

const RATING_VALUES = ["DOUBLE_UP", "UP", "MAYBE", "DOWN"];
const RATING_NOTES = [
  "Gave a clear answer about why they applied, and asked good questions back.",
  "Quiet at first, warmed up once we got to projects. Would like to hear more.",
  "Has real experience with the stack we use. Happy to see them in the next round.",
  "Seemed a bit unsure about the time commitment.",
  "Great energy, talked about running a workshop on their own.",
  null,
];
const WORK_NOTES = [
  "Stepped in to help a teammate who was stuck on the task.",
  "Kept the group on track and summarised what we'd agreed.",
  "Shared a clear idea early and listened to the others.",
  "Hung back in the first round, much more involved in the second.",
  "Asked for everyone's view before deciding. Good at bringing people in.",
  "Built on other people's ideas instead of pushing their own.",
];

const rng = seededRandom(23);
const pick = (list) => list[Math.floor(rng() * list.length)];

const graders = await prisma.grader.findMany({ where: demoGraders, orderBy: { email: "asc" } });
const applicants = await prisma.applicant.findMany({
  where: { ...demoApplicants, cohort: { isNot: null } },
  orderBy: { uclaEmail: "asc" },
  select: {
    id: true,
    placements: { where: { round: { number: 3 } }, select: { roundId: true, groupId: true } },
  },
});

if (graders.length === 0 || applicants.length === 0) {
  console.error("No demo graders or cohort members. Run seed:demo and seed:event first.");
  process.exit(1);
}

let ratings = 0;
let notes = 0;
for (const a of applicants) {
  // Most people were seen by one or two of the graders in the coffee chats.
  const raters = graders.filter(() => rng() < 0.6);
  for (const g of raters) {
    const value = pick(RATING_VALUES);
    const note = pick(RATING_NOTES);
    await prisma.rating.upsert({
      where: { applicantId_graderId: { applicantId: a.id, graderId: g.id } },
      create: { applicantId: a.id, graderId: g.id, value, note },
      update: { value, note },
    });
    ratings++;
  }

  // Round 3 notes: the grader at that person's symbol group wrote it.
  const placement = a.placements[0];
  if (placement && rng() < 0.5) {
    const group = await prisma.group.findUnique({
      where: { id: placement.groupId },
      select: { graders: { select: { graderId: true } } },
    });
    const writer = group?.graders[0]?.graderId;
    if (writer) {
      await prisma.note.create({
        data: {
          applicantId: a.id,
          graderId: writer,
          roundId: placement.roundId,
          groupId: placement.groupId,
          body: pick(WORK_NOTES),
        },
      });
      notes++;
    }
  }
}

console.log(`Added ${ratings} coffee chat ratings and ${notes} round 3 notes.`);
await prisma.$disconnect();
