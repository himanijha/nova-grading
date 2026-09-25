import Papa from "papaparse";
import { prisma } from "@/lib/db";
import { gate } from "@/lib/event";
import { symbolMeta } from "@/lib/symbols";

/**
 * Everyone in a cohort with their group for each round, as a CSV — for the
 * "you passed, here is where to go" email, or a mail merge.
 */
export async function GET(_req, { params }) {
  const { error } = await gate({ admin: true });
  if (error) return error;

  const { cohortId } = await params;
  const cohort = await prisma.cohort.findUnique({
    where: { id: cohortId },
    select: {
      name: true,
      startsAt: true,
      rounds: {
        orderBy: { number: "asc" },
        select: {
          number: true,
          placements: { select: { applicantId: true, group: { select: { color: true, shape: true } } } },
        },
      },
      members: {
        select: {
          applicant: { select: { id: true, fullName: true, uclaEmail: true, contactEmail: true } },
        },
      },
    },
  });
  if (!cohort) return new Response("Cohort not found.", { status: 404 });

  const where = cohort.rounds.map(
    (r) =>
      new Map(r.placements.map((p) => [p.applicantId, symbolMeta(p.group.color, p.group.shape).name]))
  );

  const rows = cohort.members
    .map((m) => m.applicant)
    .sort((a, b) => a.fullName.localeCompare(b.fullName))
    .map((a) => {
      const row = {
        Name: a.fullName,
        "UCLA email": a.uclaEmail,
        "Contact email": a.contactEmail || "",
        Cohort: cohort.name,
        Starts: cohort.startsAt ? cohort.startsAt.toISOString() : "",
      };
      cohort.rounds.forEach((r, i) => {
        row[`Round ${r.number}`] = where[i].get(a.id) || "";
      });
      return row;
    });

  // escapeFormulae: names come from a public form, and this file gets opened
  // in a spreadsheet.
  const csv = Papa.unparse(rows, { escapeFormulae: true });
  const file = `schedule-${cohort.name.replace(/[^\w-]+/g, "-").toLowerCase()}.csv`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${file}"`,
    },
  });
}
