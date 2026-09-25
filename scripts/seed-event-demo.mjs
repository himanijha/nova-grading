// Sets up a fake group work event on top of the demo applicants, so the
// Cohorts, Groups, Check-in, My group and Rate pages have something to show.
//
// Usage:  npm run seed:demo -- 60 wipe   (demo applicants first — 60 is a good size)
//         npm run seed:event             (pass them, two cohorts, groups, 3 rounds)
//         npm run seed:event -- wipe     (remove the demo event again)
//
// Only touches demo data: applicants on @demo.ucla.edu and cohorts whose name
// starts with "Demo ·".
import { PrismaClient } from "@prisma/client";
import { generateRound, seededRandom } from "../lib/grouping.js";
import { groupSymbol } from "../lib/symbols.js";

const prisma = new PrismaClient();
const DEMO_DOMAIN = "@demo.ucla.edu";
const PREFIX = "Demo · ";
const wipeOnly = process.argv.includes("wipe");

await prisma.cohort.deleteMany({ where: { name: { startsWith: PREFIX } } });
// Only the drawn placeholders — a real photo uploaded while trying things out stays.
await prisma.applicantPhoto.deleteMany({
  where: { mimeType: "image/svg+xml", applicant: { uclaEmail: { endsWith: DEMO_DOMAIN } } },
});
await prisma.note.deleteMany({ where: { applicant: { uclaEmail: { endsWith: DEMO_DOMAIN } } } });
await prisma.applicant.updateMany({
  where: { uclaEmail: { endsWith: DEMO_DOMAIN } },
  data: { screeningStatus: "PENDING" },
});

if (wipeOnly) {
  console.log("Removed the demo event.");
  await prisma.$disconnect();
  process.exit(0);
}

const applicants = await prisma.applicant.findMany({
  where: { uclaEmail: { endsWith: DEMO_DOMAIN } },
  orderBy: { uclaEmail: "asc" },
  select: { id: true, fullName: true },
});
const graders = await prisma.grader.findMany({
  where: { email: { endsWith: "@nova.demo" } },
  orderBy: { email: "asc" },
});
if (applicants.length === 0 || graders.length === 0) {
  console.error("No demo applicants or graders. Run `npm run seed:demo -- 60 wipe` first.");
  process.exit(1);
}

const rng = seededRandom(11);

// Pass about 85%, so Rankings shows both outcomes.
const passed = applicants.filter(() => rng() < 0.85);
const failed = applicants.filter((a) => !passed.includes(a));
await prisma.applicant.updateMany({ where: { id: { in: passed.map((a) => a.id) } }, data: { screeningStatus: "PASSED" } });
await prisma.applicant.updateMany({ where: { id: { in: failed.map((a) => a.id) } }, data: { screeningStatus: "REJECTED" } });

// Two slots tomorrow, 10am and 11:30am.
const day = new Date();
day.setDate(day.getDate() + 1);
const at = (h, m) => new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m);
const cohorts = [
  await prisma.cohort.create({ data: { name: `${PREFIX}Sat 10am`, startsAt: at(10, 0) } }),
  await prisma.cohort.create({ data: { name: `${PREFIX}Sat 11:30am`, startsAt: at(11, 30) } }),
];

// Leave a few people out of any cohort, as if they never answered the form.
const inCohort = passed.slice(0, Math.max(1, passed.length - 3));
const halves = [inCohort.filter((_, i) => i % 2 === 0), inCohort.filter((_, i) => i % 2 === 1)];

// A drawn stand-in for a check-in photo: a head-and-shoulders silhouette on a
// colour, with initials. Obviously not a person, but it fills the same space.
const TONES = ["#f4c7a1", "#d9a07a", "#b87b57", "#8d5a3b", "#f1d3b8", "#c68d68"];
const BACKS = ["#c7d2fe", "#bbf7d0", "#fde68a", "#fecaca", "#e9d5ff", "#a5f3fc"];
function demoPhoto(name, i) {
  const initials = name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
<rect width="400" height="400" fill="${BACKS[i % BACKS.length]}"/>
<circle cx="200" cy="165" r="78" fill="${TONES[i % TONES.length]}"/>
<path d="M60 400c0-80 62-135 140-135s140 55 140 135z" fill="#475569"/>
<text x="200" y="380" font-family="Helvetica, Arial, sans-serif" font-size="38" font-weight="700" fill="#fff" text-anchor="middle">${initials}</text>
</svg>`;
  return Buffer.from(svg);
}

const SAMPLE_NOTES = [
  "Pulled the quieter people into the discussion.",
  "Jumped straight to sketching screens — strong visual instinct.",
  "Asked good clarifying questions before building anything.",
  "Took over the laptop; didn't leave much room for others.",
  "Explained the technical trade-off clearly to non-devs.",
  "Pretty quiet this round, but what they said landed.",
];

for (const [ci, cohort] of cohorts.entries()) {
  const members = halves[ci].map((a) => a.id);
  await prisma.cohortMember.createMany({
    data: members.map((applicantId, i) => ({
      applicantId,
      cohortId: cohort.id,
      // The first cohort is "in progress": two thirds have arrived.
      checkedInAt: ci === 0 && i % 3 !== 0 ? new Date() : null,
    })),
  });
  // Everyone who has "arrived" has had their photo taken at the door.
  if (ci === 0) {
    for (const [i, applicantId] of members.entries()) {
      if (i % 3 === 0) continue;
      const data = demoPhoto(applicants.find((a) => a.id === applicantId).fullName, i);
      await prisma.applicantPhoto.upsert({
        where: { applicantId },
        create: { applicantId, data, mimeType: "image/svg+xml", byteSize: data.length },
        update: { data, mimeType: "image/svg+xml", byteSize: data.length },
      });
    }
  }

  const groupCount = Math.max(2, Math.round(members.length / 5));
  const groups = [];
  for (let i = 0; i < groupCount; i++) {
    const s = groupSymbol(i);
    groups.push(await prisma.group.create({ data: { cohortId: cohort.id, index: i, color: s.color, shape: s.shape } }));
  }
  // One demo grader per group, cycling if there are more groups than graders.
  await prisma.groupGrader.createMany({
    data: groups.map((g, i) => ({ groupId: g.id, graderId: graders[i % graders.length].id })),
    skipDuplicates: true,
  });

  const history = [];
  for (let n = 1; n <= 3; n++) {
    const round = await prisma.round.create({ data: { cohortId: cohort.id, number: n } });
    const split = generateRound(members, groups.map((g) => g.id), history, rng);
    history.push(split);
    await prisma.placement.createMany({
      data: [...split].map(([applicantId, groupId]) => ({ roundId: round.id, applicantId, groupId })),
    });

    // Some notes from the first two rounds of the first cohort.
    if (ci === 0 && n <= 2) {
      for (const [applicantId, groupId] of split) {
        if (rng() > 0.45) continue;
        const gi = groups.findIndex((g) => g.id === groupId);
        await prisma.note.create({
          data: {
            applicantId,
            graderId: graders[gi % graders.length].id,
            roundId: round.id,
            groupId,
            body: SAMPLE_NOTES[Math.floor(rng() * SAMPLE_NOTES.length)],
          },
        });
      }
    }
  }
  console.log(`${cohort.name}: ${members.length} people, ${groupCount} groups, 3 rounds.`);
}

console.log(
  `Demo event ready: ${passed.length} passed, ${failed.length} not passed, ` +
    `${passed.length - inCohort.length} passed but not in a cohort.`
);
await prisma.$disconnect();
