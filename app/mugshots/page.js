import { redirect } from "next/navigation";
import { getCurrentGrader } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Nav from "../Nav";
import MugshotsClient from "./MugshotsClient";

export const dynamic = "force-dynamic";

export default async function MugshotsPage() {
  const grader = await getCurrentGrader();
  if (!grader) redirect("/login");

  const rows = await prisma.applicant.findMany({
    select: {
      id: true,
      fullName: true,
      uclaEmail: true,
      majors: true,
      gradYear: true,
      roleCategory: true,
      // Never select `data` here: it would pull every photo's bytes into the
      // page payload. The <img> fetches them one at a time instead.
      photo: { select: { updatedAt: true, byteSize: true } },
      ratings: {
        select: {
          value: true,
          note: true,
          graderId: true,
          grader: { select: { name: true } },
        },
      },
    },
    orderBy: { fullName: "asc" },
  });

  const applicants = rows.map((a) => ({
    id: a.id,
    fullName: a.fullName,
    uclaEmail: a.uclaEmail,
    majors: a.majors,
    gradYear: a.gradYear,
    roleCategory: a.roleCategory,
    hasPhoto: !!a.photo,
    // Cache-buster so a replaced photo shows immediately.
    photoVersion: a.photo ? a.photo.updatedAt.getTime() : null,
    myRating: a.ratings.find((r) => r.graderId === grader.id) || null,
    ratings: a.ratings.map((r) => ({
      value: r.value,
      note: r.note,
      graderName: r.grader.name,
    })),
  }));

  return (
    <>
      <Nav grader={grader} />
      <MugshotsClient grader={grader} applicants={applicants} />
    </>
  );
}
